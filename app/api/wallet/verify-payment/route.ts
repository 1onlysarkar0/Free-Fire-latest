import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { verifyAndCreditPayment } from "@/lib/payment";
import { z } from "zod";

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

const schema = z.object({
  utrNumber: z
    .string()
    .min(10, "UTR must be at least 10 characters")
    .max(22, "UTR must be at most 22 characters")
    .regex(/^[A-Za-z0-9]+$/, "UTR must be alphanumeric only"),
  amount: z
    .number()
    .int("Amount must be a whole number")
    .min(1, "Minimum amount is ₹1")
    .max(50000, "Maximum amount is ₹50,000"),
});

export async function POST(request: NextRequest) {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const result = await verifyAndCreditPayment({
    userId: session.user.id,
    utrNumber: parsed.data.utrNumber,
    amount: parsed.data.amount,
    ipAddress,
  });

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: `₹${result.creditedAmount} has been added to your wallet!`,
      creditedAmount: result.creditedAmount,
    });
  }

  return NextResponse.json(
    { success: false, error: result.error },
    { status: 400 }
  );
}
