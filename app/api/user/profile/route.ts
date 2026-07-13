import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { user, account } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";

export const instant = false;

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        gameName: user.gameName,
        uid: user.uid,
        twoFactorEnabled: user.twoFactorEnabled,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    const foundUser = users[0];

    if (!foundUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if the user has a credentials account (password)
    const credentialAccounts = await db
      .select({ id: account.id })
      .from(account)
      .where(
        and(
          eq(account.userId, session.user.id),
          eq(account.providerId, "credential")
        )
      )
      .limit(1);

    const hasPassword = credentialAccounts.length > 0;

    return NextResponse.json({
      ...foundUser,
      hasPassword,
    });
  } catch (error) {
    console.error("profile GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
