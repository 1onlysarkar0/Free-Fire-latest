import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { user, account } from "@/db/schema";
import { eq } from "drizzle-orm";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;
const ipRequestCounts = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipRequestCounts.get(ip) || [];
  const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  validTimestamps.push(now);
  ipRequestCounts.set(ip, validTimestamps);
  return false;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { 
        status: 429,
        headers: { "Retry-After": "60" }
      }
    );
  }

  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const users = await db
      .select({
        id: user.id,
        email: user.email,
        twoFactorEnabled: user.twoFactorEnabled,
      })
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .limit(1);

    const foundUser = users[0];

    if (!foundUser) {
      return NextResponse.json({ exists: false, hasTwoFactor: false, hasPassword: false });
    }

    // Check if this user has a password-based account
    const accounts = await db
      .select({ providerId: account.providerId })
      .from(account)
      .where(eq(account.userId, foundUser.id));

    const hasPassword = accounts.some((a) => a.providerId === "credential");

    return NextResponse.json({
      exists: true,
      hasTwoFactor: foundUser.twoFactorEnabled ?? false,
      hasPassword,
    });
  } catch (error) {
    console.error("check-email error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
