import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { user, siteConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getSiteUrl } from "@/lib/site-url";
 
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, gameName, uid, avatarId } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check if this is the FIRST time completing profile (gameName was null)
    const existingUsers = await db
      .select({ gameName: user.gameName, uid: user.uid, email: user.email })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    const existingUser = existingUsers[0];
    // Only treat as first completion if BOTH gameName and uid are unset (reduces duplicate welcome emails)
    const isFirstProfileCompletion = !existingUser?.gameName && !existingUser?.uid;

    const imageValue =
      avatarId && [1, 2, 3, 4].includes(Number(avatarId))
        ? `avatar:${avatarId}`
        : undefined;

    await db
      .update(user)
      .set({
        name: name.trim(),
        gameName: gameName?.trim() || null,
        uid: uid?.trim() || null,
        ...(imageValue ? { image: imageValue } : {}),
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id));


    // Send welcome email only on first profile completion
    if (isFirstProfileCompletion && existingUser?.email) {
      try {
        const { sendEmail } = await import("@/lib/mailer");
        const appUrl = await getSiteUrl() || process.env.NEXT_PUBLIC_APP_URL || "";
        const dashboardUrl = appUrl ? `${appUrl}/dashboard` : "/dashboard";

        // Fetch siteName from DB
        const siteRows = await db
          .select({ logoTitle: siteConfig.logoTitle })
          .from(siteConfig)
          .where(eq(siteConfig.id, "default"))
          .limit(1);
        const siteName = siteRows[0]?.logoTitle ?? "";

        await sendEmail({
          to: existingUser.email,
          templateName: "welcome",
          variables: {
            userName: name.trim(),
            gameName: gameName?.trim() || "",
            dashboardUrl,
            siteName,
          },
        });
      } catch (emailErr) {
        // Don't fail profile completion if email fails
        console.error("Welcome email failed (non-fatal):", emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("complete-profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
