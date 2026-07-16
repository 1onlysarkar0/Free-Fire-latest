import "server-only";
import { db } from "@/db/drizzle";
import { adminRole } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export interface PanelAuthResult {
  isPanel: boolean;
  hasAccess: boolean;
  isAdmin: boolean;
  permissions: string[];
  roleName?: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    isAdmin: boolean;
  } | null;
}

import { getUserProfileCached, getUserPermissionsCached } from "./user-data";
import { getAdminSiteConfigCached } from "./admin-data";
import { slugify } from "./utils";

async function getAdminRoleByNameOrSlug(nameOrSlug: string) {
  // First attempt: exact match by name
  const rows = await db
    .select()
    .from(adminRole)
    .where(eq(adminRole.name, nameOrSlug))
    .limit(1);
  if (rows[0]) return rows[0];

  // Second attempt: match by slugified name (fetch all roles, since table size is small)
  const allRoles = await db.select().from(adminRole);
  const matched = allRoles.find((r) => slugify(r.name) === nameOrSlug);
  return matched || null;
}

export async function verifyPanelAccess(dynamicSlug: string): Promise<PanelAuthResult> {
  const result: PanelAuthResult = {
    isPanel: false,
    hasAccess: false,
    isAdmin: false,
    permissions: [],
    user: null,
  };

  // 1. Fetch siteConfig slug and matching role in parallel using cached queries
  const [config, role] = await Promise.all([
    getAdminSiteConfigCached(),
    getAdminRoleByNameOrSlug(dynamicSlug),
  ]);

  const isAdminSlug = config?.adminSlug === dynamicSlug;
  const isRoleSlug = !!role;

  if (!isAdminSlug && !isRoleSlug) {
    return result; // Not a panel
  }

  result.isPanel = true;

  // 2. Verify Authentication
  await connection();
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  if (!session?.user?.id) {
    redirect(`/sign-in?returnTo=/${dynamicSlug}`);
  }

  // 3. Fetch user record using cached helper
  const dbUser = await getUserProfileCached(session.user.id);
  if (!dbUser) return result;
  if (dbUser.isBanned) return result;

  result.user = {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    image: dbUser.image,
    isAdmin: dbUser.isAdmin,
  };
  result.isAdmin = dbUser.isAdmin;

  if (isAdminSlug && dbUser.isAdmin) {
    result.hasAccess = true;
    result.roleName = "Admin";
  } else if (isRoleSlug) {
    // Check if user has this specific role using cached permissions helper
    const userPerms = await getUserPermissionsCached(dbUser.id);
    const hasRole = userPerms.roles.some((r) => r.name === dynamicSlug || slugify(r.name) === dynamicSlug);
      
    if (hasRole || dbUser.isAdmin) {
       result.hasAccess = true;
       result.roleName = role.name;
       try { result.permissions = JSON.parse(role.permissions || "[]"); } catch { result.permissions = []; }
    }
  }

  return result;
}

export async function requirePagePermission(
  dynamicSlug: string,
  permission: string
): Promise<PanelAuthResult> {
  const authState = await verifyPanelAccess(dynamicSlug);
  if (!authState.isPanel || !authState.hasAccess || !authState.user) {
    redirect("/dashboard");
  }
  const hasAccess = authState.isAdmin || authState.permissions.includes(permission);
  if (!hasAccess) {
    redirect(`/${dynamicSlug}`);
  }
  return authState;
}
