import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getUserPermissionsCached } from "@/lib/user-data";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ isAdmin: false, permissions: [], roles: [], adminSlug: null });
    }

    const perms = await getUserPermissionsCached(session.user.id);
    return NextResponse.json(perms);
  } catch {
    return NextResponse.json({ isAdmin: false, permissions: [], roles: [], adminSlug: null });
  }
}
