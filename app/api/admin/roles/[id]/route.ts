import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { adminRole } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOrRole(request, "roles:view");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  const [row] = await db.select().from(adminRole).where(eq(adminRole.id, id)).limit(1);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(row);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOrRole(request, "roles:edit");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  const [existingRole] = await db.select().from(adminRole).where(eq(adminRole.id, id)).limit(1);
  if (!existingRole) return Response.json({ error: "Role not found" }, { status: 404 });

  const { name, description, permissions } = await request.json();
  if (!name) return Response.json({ error: "name is required" }, { status: 400 });

  const newName = String(name).trim();

  // Protect the "Super Manager" role
  if (existingRole.name === "Super Manager" && !admin.isAdmin) {
    return Response.json({ error: "Only a superadmin can modify the Super Manager role." }, { status: 403 });
  }

  if (newName.toLowerCase() === "super manager" && !admin.isAdmin) {
    return Response.json({ error: "Only a superadmin can rename a role to 'Super Manager'." }, { status: 403 });
  }

  const permissionArray = Array.isArray(permissions) ? permissions : [];

  if (!admin.isAdmin) {
    const invalidPerms = permissionArray.filter((p) => !admin.permissions.includes(p));
    if (invalidPerms.length > 0) {
      return Response.json({
        error: `You cannot assign permissions you do not possess: ${invalidPerms.join(", ")}`
      }, { status: 403 });
    }
  }

  await db.update(adminRole).set({
    name: newName, 
    description: description ?? null,
    permissions: JSON.stringify(permissionArray),
    updatedAt: new Date(),
  }).where(eq(adminRole.id, id));

  return Response.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOrRole(request, "roles:delete");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  const [existingRole] = await db.select().from(adminRole).where(eq(adminRole.id, id)).limit(1);
  if (!existingRole) return Response.json({ error: "Role not found" }, { status: 404 });

  // Protect the "Super Manager" role from deletion by non-superadmins
  if (existingRole.name === "Super Manager" && !admin.isAdmin) {
    return Response.json({ error: "Only a superadmin can delete the Super Manager role." }, { status: 403 });
  }

  await db.delete(adminRole).where(eq(adminRole.id, id));

  return Response.json({ ok: true });
}
