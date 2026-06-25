import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { user, adminUserRole, adminRole } from "@/db/schema";
import { eq, ne } from "drizzle-orm";

export async function GET(request: Request) {
  const admin = await requireAdminOrRole(request, "users:view");
  if (admin instanceof Response) return admin;

  // Exclude the currently logged-in superadmin from the list
  const users = await db.select().from(user)
    .where(ne(user.id, admin.user.id))
    .orderBy(user.createdAt);

  const userRolesMap: Record<string, { id: string; name: string }[]> = {};
  const allUserRoles = await db
    .select({ userId: adminUserRole.userId, roleId: adminRole.id, roleName: adminRole.name })
    .from(adminUserRole)
    .innerJoin(adminRole, eq(adminUserRole.roleId, adminRole.id));

  for (const ur of allUserRoles) {
    if (!userRolesMap[ur.userId]) userRolesMap[ur.userId] = [];
    userRolesMap[ur.userId].push({ id: ur.roleId, name: ur.roleName });
  }

  const result = users.map(u => ({
    ...u,
    roles: userRolesMap[u.id] || [],
  }));

  return Response.json(result);
}
