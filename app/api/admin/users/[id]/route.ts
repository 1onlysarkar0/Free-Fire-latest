import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { user, adminUserRole, account, adminRole } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { userUpdateSchema } from "@/lib/schemas/admin";
import { invalidateAdminCache } from "@/lib/cache";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOrRole(request);
  if (admin instanceof Response) return admin;

  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = userUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const data = parsed.data;
    const {
      topPlayer, roleId,
      name, email, gameName, uid, image,
      emailVerified, newPassword,
      isBanned, banReason,
    } = data;

    const hasBanFields = isBanned !== undefined || banReason !== undefined;
    const hasRoleField = roleId !== undefined;
    const hasTopPlayerField = topPlayer !== undefined;
    const hasBasicFields = name !== undefined || email !== undefined || gameName !== undefined ||
      uid !== undefined || image !== undefined ||
      emailVerified !== undefined || newPassword !== undefined;

    if (hasBanFields && !admin.isAdmin && !admin.permissions.includes("users:ban")) {
      return Response.json({ error: "Forbidden: missing permission users:ban" }, { status: 403 });
    }

    if (hasRoleField && !admin.isAdmin && !admin.permissions.includes("users:assign_role")) {
      return Response.json({ error: "Forbidden: missing permission users:assign_role" }, { status: 403 });
    }

    if (hasTopPlayerField && !admin.isAdmin && !admin.permissions.includes("users:toggle_top_player")) {
      return Response.json({ error: "Forbidden: missing permission users:toggle_top_player" }, { status: 403 });
    }

    if (hasBasicFields && !admin.isAdmin && !admin.permissions.includes("users:edit")) {
      return Response.json({ error: "Forbidden: missing permission users:edit" }, { status: 403 });
    }

    const [targetUser] = await db.select().from(user).where(eq(user.id, id)).limit(1);
    if (!targetUser) return Response.json({ error: "User not found" }, { status: 404 });

    if (targetUser.isAdmin && !admin.isAdmin) {
      return Response.json({ error: "Only a super-admin can modify another super-admin account." }, { status: 403 });
    }

    if (roleId !== undefined) {
      if (id === admin.user.id) {
        return Response.json({ error: "You cannot change your own role." }, { status: 403 });
      }

      const [targetRole] = roleId
        ? await db.select({ name: adminRole.name, permissions: adminRole.permissions }).from(adminRole).where(eq(adminRole.id, roleId)).limit(1)
        : [null];

      const [currentRole] = await db
        .select({ name: adminRole.name })
        .from(adminUserRole)
        .innerJoin(adminRole, eq(adminUserRole.roleId, adminRole.id))
        .where(eq(adminUserRole.userId, id))
        .limit(1);

      const isTargetAdminRole = targetRole?.name === "Super Manager";
      const isCurrentAdminRole = currentRole?.name === "Super Manager";

      if ((isTargetAdminRole || isCurrentAdminRole) && !admin.isAdmin) {
        return Response.json({ error: "Only a superadmin can assign or remove the Super Manager role." }, { status: 403 });
      }

      if (!admin.isAdmin && targetRole) {
        let targetPerms: string[] = [];
        try {
          targetPerms = JSON.parse(targetRole.permissions || "[]");
        } catch {
          targetPerms = [];
        }
        const hasAll = targetPerms.every((p) => admin.permissions.includes(p));
        if (!hasAll) {
          return Response.json({ error: "You cannot assign a role with permissions you do not have." }, { status: 403 });
        }
      }
    }

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (topPlayer !== undefined) update.topPlayer = Boolean(topPlayer);
    if (name !== undefined && name !== null) update.name = String(name).trim();
    if (email !== undefined && email !== null) update.email = String(email).trim().toLowerCase();
    if (gameName !== undefined) update.gameName = gameName || null;
    if (uid !== undefined) update.uid = uid || null;
    if (image !== undefined) update.image = image || null;
    if (emailVerified !== undefined) update.emailVerified = Boolean(emailVerified);
    if (isBanned !== undefined) update.isBanned = Boolean(isBanned);
    if (banReason !== undefined) update.banReason = isBanned ? (banReason || null) : null;

    await db.update(user).set(update).where(eq(user.id, id));

    if (newPassword && typeof newPassword === "string" && newPassword.length >= 8) {
      const bcrypt = await import("bcryptjs");
      const hashed = await bcrypt.hash(newPassword, 10);
      await db.update(account).set({
        password: hashed,
        updatedAt: new Date(),
      }).where(and(eq(account.userId, id), eq(account.providerId, "credential")));
    }

    if (roleId !== undefined) {
      await db.delete(adminUserRole).where(eq(adminUserRole.userId, id));
      if (roleId) {
        const assignId = `aur-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        await db.insert(adminUserRole).values({
          id: assignId,
          userId: id,
          roleId,
        });
      }
    }

    await invalidateAdminCache();
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[API/admin/users/[id]] PUT error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await requireAdminOrRole(request, "users:delete");
  if (adminUser instanceof Response) return adminUser;

  const { id } = await params;
  if (adminUser.user.id === id) {
    return Response.json({ error: "Cannot delete your own account." }, { status: 400 });
  }

  // Privilege Protection: Only super-admins can delete other super-admins
  const [targetUser] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  if (targetUser?.isAdmin && !adminUser.user.isAdmin) {
    return Response.json({ error: "Only a super-admin can delete another super-admin account." }, { status: 403 });
  }

  await db.transaction(async (tx) => {
    // 1. Fix Zombie Slots: Free up any slots this user booked
    const { tournamentSlot: ts } = await import("@/db/schema");
    await tx
      .update(ts)
      .set({ status: "AVAILABLE", userId: null, teamName: null, ignList: "[]", bookedAt: null })
      .where(eq(ts.userId, id));

    // 2. Delete the user
    await tx.delete(user).where(eq(user.id, id));
  });


  await invalidateAdminCache();
  return Response.json({ ok: true });
}
