import "server-only";
import { db } from "@/db/drizzle";
import {
  user,
  adminRole,
  adminUserRole,
  siteConfig,
  smtpConfig,
  emailTemplate,
  authPageContent,
  navigationItem,
  seoConfig,
  customPage,
  contentTemplate,
  tournament,
} from "@/db/schema";
import { count, eq, desc, sql, asc } from "drizzle-orm";
import { cache } from "react";


// ─────────────────────────────────────────────────────────────────────────────
// 1. Admin Stats
// ─────────────────────────────────────────────────────────────────────────────
async function _fetchAdminStats() {
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

  return {
    totalUsers: usersRow.count,
    topPlayers: topPlayersRow.count,
    adminUsers: adminUsersRow.count,
    navItems: navRow.count,
    emailTemplates: emailRow.count,
    seoConfigs: seoRow.count,
    roles: rolesRow.count,
    usersWithRoles: Number(withRolesRow.count),
  };
}

export const getAdminStatsCached = cache(_fetchAdminStats);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Users & Roles
// ─────────────────────────────────────────────────────────────────────────────
async function _fetchAdminUsers() {
  const usersData = await db.select().from(user).orderBy(desc(user.createdAt));
  const userRolesData = await db
    .select({
      userId: adminUserRole.userId,
      roleId: adminRole.id,
      roleName: adminRole.name,
      assignedAt: adminUserRole.assignedAt,
    })
    .from(adminUserRole)
    .innerJoin(adminRole, eq(adminUserRole.roleId, adminRole.id));

  const rolesByUser = new Map<string, { id: string; name: string }[]>();
  for (const ur of userRolesData) {
    if (!rolesByUser.has(ur.userId)) rolesByUser.set(ur.userId, []);
    rolesByUser.get(ur.userId)!.push({ id: ur.roleId, name: ur.roleName });
  }

  return usersData.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    topPlayer: !!u.topPlayer,
    roles: rolesByUser.get(u.id) ?? [],
  }));
}

export const getAdminUsersCached = cache(_fetchAdminUsers);

async function _fetchAdminRoles() {
  const rolesData = await db.select().from(adminRole).orderBy(desc(adminRole.createdAt));
  const userCounts = await db
    .select({
      roleId: adminUserRole.roleId,
      count: sql`count(*)`.mapWith(Number),
    })
    .from(adminUserRole)
    .groupBy(adminUserRole.roleId);

  const countMap = new Map(userCounts.map((r) => [r.roleId, r.count]));
  return rolesData.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    userCount: countMap.get(r.id) ?? 0,
  }));
}

export const getAdminRolesCached = cache(_fetchAdminRoles);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Tournaments
// ─────────────────────────────────────────────────────────────────────────────
async function _fetchAdminTournaments() {
  return await db.select().from(tournament).orderBy(desc(tournament.createdAt)).catch(() => []);
}

export const getAdminTournamentsCached = cache(_fetchAdminTournaments);

// ─────────────────────────────────────────────────────────────────────────────
// 4. SMTP Config
// ─────────────────────────────────────────────────────────────────────────────
async function _fetchAdminSmtp() {
  const rows = await db.select().from(smtpConfig).limit(1);
  return rows[0] || null;
}

export const getAdminSmtpCached = cache(_fetchAdminSmtp);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Site Config
// ─────────────────────────────────────────────────────────────────────────────
async function _fetchAdminSiteConfig() {
  const rows = await db.select().from(siteConfig).where(eq(siteConfig.id, "default")).limit(1);
  return rows[0] || null;
}

export const getAdminSiteConfigCached = cache(_fetchAdminSiteConfig);

// ─────────────────────────────────────────────────────────────────────────────
// 6. SEO Config
// ─────────────────────────────────────────────────────────────────────────────
async function _fetchAdminSeo() {
  return await db.select().from(seoConfig).orderBy(desc(seoConfig.createdAt));
}

export const getAdminSeoCached = cache(_fetchAdminSeo);

// ─────────────────────────────────────────────────────────────────────────────
// 7. Navigation
// ─────────────────────────────────────────────────────────────────────────────
async function _fetchAdminNavigation() {
  return await db.select().from(navigationItem).orderBy(asc(navigationItem.order));
}

export const getAdminNavigationCached = cache(_fetchAdminNavigation);

// ─────────────────────────────────────────────────────────────────────────────
// 8. Email Templates
// ─────────────────────────────────────────────────────────────────────────────
async function _fetchAdminEmailTemplates() {
  return await db.select().from(emailTemplate).orderBy(desc(emailTemplate.createdAt));
}

export const getAdminEmailTemplatesCached = cache(_fetchAdminEmailTemplates);

// ─────────────────────────────────────────────────────────────────────────────
// 10. Auth Page Content
// ─────────────────────────────────────────────────────────────────────────────
async function _fetchAdminAuthContent() {
  return await db.select().from(authPageContent).orderBy(desc(authPageContent.createdAt));
}

export const getAdminAuthContentCached = cache(_fetchAdminAuthContent);

// ─────────────────────────────────────────────────────────────────────────────
// 11. Custom Pages
// ─────────────────────────────────────────────────────────────────────────────
async function _fetchAdminCustomPages() {
  return await db.select().from(customPage).orderBy(desc(customPage.createdAt));
}

export const getAdminCustomPagesCached = cache(_fetchAdminCustomPages);

// ─────────────────────────────────────────────────────────────────────────────
// 12. Content Templates
// ─────────────────────────────────────────────────────────────────────────────
async function _fetchAdminContentTemplates() {
  return await db.select().from(contentTemplate).orderBy(desc(contentTemplate.createdAt)).catch(() => []);
}

export const getAdminContentTemplatesCached = cache(_fetchAdminContentTemplates);
