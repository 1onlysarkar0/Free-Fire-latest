import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { adminRole, adminUserRole } from "@/db/schema";
import { count } from "drizzle-orm";
import { invalidateAdminCache } from "@/lib/cache";

export async function GET(request: Request) {
  const admin = await requireAdminOrRole(request, "roles:view");
  if (admin instanceof Response) return admin;

  const roles = await db.select().from(adminRole).orderBy(adminRole.createdAt);

  // Get user count per role
  const counts = await db
    .select({ roleId: adminUserRole.roleId, count: count() })
    .from(adminUserRole)
    .groupBy(adminUserRole.roleId);

  const countMap: Record<string, number> = {};
  for (const c of counts) countMap[c.roleId] = c.count;

  return Response.json(roles.map(r => ({ ...r, userCount: countMap[r.id] || 0 })));
}

export async function POST(request: Request) {
  const admin = await requireAdminOrRole(request, "roles:create");
  if (admin instanceof Response) return admin;

  const { name, description, permissions } = await request.json();
  if (!name) return Response.json({ error: "name is required" }, { status: 400 });

  const roleName = String(name).trim();
  if (roleName.toLowerCase() === "super manager" && !admin.isAdmin) {
    return Response.json({ error: "Only a superadmin can create a role named 'Super Manager'." }, { status: 403 });
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

  const id = `role-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await db.insert(adminRole).values({
    id, 
    name: roleName, 
    description: description ?? null,
    permissions: JSON.stringify(permissionArray),
  });

  await invalidateAdminCache();
  return Response.json({ ok: true, id });
}
