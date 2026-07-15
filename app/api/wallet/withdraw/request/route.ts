import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { withdrawRequest, withdrawConfig } from "@/db/schema";
import { debitWallet, getOrCreateWallet } from "@/lib/wallet";
import { eq, and, gte, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { rateLimitRoute } from "@/lib/security/rate-limiter";

// Stricter UPI Regex to prevent NoSQL/SQL injection payloads
const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

const schema = z.object({
  amount: z
    .number()
    .int("Amount must be a whole number")
    .positive("Amount must be positive")
    .max(100000, "Maximum withdrawal amount is ₹100,000"),
  upiId: z
    .string()
    .trim()
    .min(6, "UPI ID must be at least 6 characters")
    .max(50, "UPI ID is too long")
    .regex(UPI_REGEX, "UPI ID must be a valid format (e.g. name@paytm)"),
});

export async function POST(request: NextRequest) {
  try {
    // AUDIT FIX [7.2]: Rate limit — 3 withdraw requests per 10 minutes per IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitResponse = rateLimitRoute(ip, {
      keyPrefix: "withdraw-request",
      limit: 3,
      windowMs: 10 * 60 * 1000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { amount, upiId } = parsed.data;

    const [config] = await db
      .select()
      .from(withdrawConfig)
      .where(eq(withdrawConfig.id, "default"))
      .limit(1);

    if (!config || !config.enabled) {
      return NextResponse.json({ error: "Withdrawals are currently disabled." }, { status: 400 });
    }

    if (amount < config.minWithdrawAmount) {
      return NextResponse.json({ error: `Minimum withdrawal amount is ₹${config.minWithdrawAmount}.` }, { status: 400 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [{ total: todayCount }] = await db
      .select({ total: count() })
      .from(withdrawRequest)
      .where(
        and(
          eq(withdrawRequest.userId, userId),
          eq(withdrawRequest.status, "PENDING"),
          gte(withdrawRequest.createdAt, todayStart)
        )
      );

    if (todayCount >= config.dailyWithdrawLimit) {
      return NextResponse.json({ error: `Daily withdrawal limit reached (max ${config.dailyWithdrawLimit} pending requests).` }, { status: 400 });
    }

    await getOrCreateWallet(userId);

    const requestId = nanoid();
    const idempotencyKey = `withdraw-request-${userId}-${requestId}`;

    const debitResult = await debitWallet({
      userId,
      amount,
      type: "WITHDRAWAL_REQUEST",
      referenceId: requestId,
      description: `Withdrawal request of ₹${amount} to UPI: ${upiId}`,
      idempotencyKey,
    });

    if (!debitResult.success) {
      return NextResponse.json({ error: debitResult.error || "Insufficient balance." }, { status: 400 });
    }

    await db.insert(withdrawRequest).values({
      id: requestId,
      userId,
      amount,
      upiId,
      status: "PENDING",
      transactionId: debitResult.transactionId,
      createdAt: new Date(),
    });



    return NextResponse.json({ success: true, message: "Withdrawal request submitted. Amount deducted from your wallet.", requestId });
  } catch (err) {
    console.error("[API/wallet/withdraw/request] error:", err);
    return NextResponse.json({ error: "Failed to submit withdrawal request." }, { status: 500 });
  }
}
