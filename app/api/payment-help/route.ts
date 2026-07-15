import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { paymentHelpRequest } from "@/db/schema";
import { createNotification } from "@/lib/notifications";
import { nanoid } from "nanoid";
import { z } from "zod";
import { rateLimitRoute } from "@/lib/security/rate-limiter";

const submitSchema = z.object({
  amount: z
    .number()
    .int("Amount must be a whole number")
    .positive("Amount must be greater than 0")
    .max(100000, "Amount seems too large"),
  utrNumber: z
    .string()
    .min(6, "UTR/Transaction ID must be at least 6 characters")
    .max(50, "UTR/Transaction ID is too long")
    .regex(/^[A-Za-z0-9_\-]+$/, "UTR/Transaction ID can only contain letters, numbers, hyphens, and underscores"),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description must be at most 2000 characters"),
});

export async function POST(req: NextRequest) {
  // Rate limit — 3 requests per 15 minutes per IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rateLimitResponse = rateLimitRoute(ip, {
    keyPrefix: "payment-help",
    limit: 3,
    windowMs: 15 * 60 * 1000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  // Require authenticated session
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in to submit a payment help request." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { amount, utrNumber, description } = parsed.data;

  try {
    const id = nanoid();
    await db.insert(paymentHelpRequest).values({
      id,
      userId: session.user.id,
      amount,
      utrNumber,
      description,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Notify the user their request was received
    await createNotification({
      userId: session.user.id,
      title: "Payment Help Request Submitted",
      message: `Your payment help request for ₹${amount} (UTR: ${utrNumber}) has been received. We will review it shortly. Request ID: ${id}`,
      type: "GENERAL",
      referenceId: id,
    });

    return NextResponse.json({ success: true, requestId: id });
  } catch (err) {
    console.error("[API/payment-help] POST error:", err);
    return NextResponse.json({ error: "Failed to submit request. Please try again." }, { status: 500 });
  }
}
