import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { user, navigationItem, emailTemplate, seoConfig, adminRole, adminUserRole } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const admin = await requireAdminOrRole(request);
  if (admin instanceof Response) return admin;

  const [
    [usersRow],
    [topPlayersRow],
    [adminUsersRow],
    [navRow],
    [emailRow],
    [seoRow],
    [rolesRow],
    [withRolesRow],
  ] = await Promise.all([
    db.select({ count: count() }).from(user),
    db.select({ count: count() }).from(user).where(eq(user.topPlayer, true)),
    db.select({ count: count() }).from(user).where(eq(user.isAdmin, true)),
    db.select({ count: count() }).from(navigationItem),
    db.select({ count: count() }).from(emailTemplate),
    db.select({ count: count() }).from(seoConfig),
    db.select({ count: count() }).from(adminRole),
    db.select({ count: sql<number>`COUNT(DISTINCT ${adminUserRole.userId})` }).from(adminUserRole),
  ]);

  return Response.json({
    totalUsers: usersRow.count,
    topPlayers: topPlayersRow.count,
    adminUsers: adminUsersRow.count,
    navItems: navRow.count,
    emailTemplates: emailRow.count,
    seoConfigs: seoRow.count,
    roles: rolesRow.count,
    usersWithRoles: Number(withRolesRow.count),
  });
}
