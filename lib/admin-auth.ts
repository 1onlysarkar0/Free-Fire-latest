import "server-only";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { user as userTable, adminUserRole, adminRole } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export type AdminUser = {
  user: typeof userTable.$inferSelect;
  isAdmin: boolean;
  permissions: string[];
};

async function buildAdminUser(
  userId: string
): Promise<AdminUser | null> {
  const [u] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!u) return null;

  if (u.isBanned === true) return null;

  const isAdmin = u.isAdmin === true;
  let permissions: string[] = [];

  if (!isAdmin) {
    const roles = await db
      .select({ permissions: adminRole.permissions })
      .from(adminUserRole)
      .innerJoin(adminRole, eq(adminUserRole.roleId, adminRole.id))
      .where(eq(adminUserRole.userId, u.id));

    const permSet = new Set<string>();
    for (const r of roles) {
      let perms: string[] = [];
      try { perms = JSON.parse(r.permissions || "[]") as string[]; } catch { perms = []; }
      for (const p of perms) permSet.add(p);
    }
    permissions = Array.from(permSet);
  }

  return { user: u, isAdmin, permissions };
}

// For Server Components / layouts (uses next/headers)
export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    return buildAdminUser(session.user.id);
  } catch {
    return null;
  }
}

// For API Route Handlers (uses request headers)
export async function validateAdminRequest(
  request: Request
): Promise<AdminUser | null> {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(request.headers),
    });
    if (!session?.user) return null;
    return buildAdminUser(session.user.id);
  } catch {
    return null;
  }
}

import { verifyCsrf } from "@/lib/security/csrf";

// Require admin or role in API routes; returns 401/403 response or the user
export async function requireAdminOrRole(
  request: Request,
  permission?: string
): Promise<AdminUser | Response> {
  // Validate CSRF before performing authentication/authorization checks
  const isCsrfValid = await verifyCsrf(request);
  if (!isCsrfValid) {
    return Response.json({ error: "CSRF verification failed" }, { status: 403 });
  }

  const adminUser = await validateAdminRequest(request);

  if (!adminUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!adminUser.isAdmin && adminUser.permissions.length === 0) {
    return Response.json({ error: "Forbidden: no admin access" }, { status: 403 });
  }

  if (
    permission &&
    !adminUser.isAdmin &&
    !adminUser.permissions.includes(permission)
  ) {
    return Response.json(
      { error: `Forbidden: missing permission "${permission}"` },
      { status: 403 }
    );
  }

  return adminUser;
}
