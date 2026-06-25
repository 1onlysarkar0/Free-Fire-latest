import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password } = await request.json();

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Invoke server-side Better Auth setPassword endpoint
    await auth.api.setPassword({
      headers: await headers(),
      body: {
        newPassword: password,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[set-password] Error setting user password:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set password." },
      { status: 500 }
    );
  }
}
