import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { paymentVerification, user } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const adminUser = await requireAdminOrRole(request, "payment:view_verifications");
  if (adminUser instanceof Response) return adminUser;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      id: paymentVerification.id,
      userId: paymentVerification.userId,
      userName: user.name,
      userEmail: user.email,
      claimedAmount: paymentVerification.claimedAmount,
      verifiedAmount: paymentVerification.verifiedAmount,
      utrNumber: paymentVerification.utrNumber,
      status: paymentVerification.status,
      emailSender: paymentVerification.emailSender,
      ipAddress: paymentVerification.ipAddress,
      failReason: paymentVerification.failReason,
      createdAt: paymentVerification.createdAt,
      verifiedAt: paymentVerification.verifiedAt,
    })
    .from(paymentVerification)
    .leftJoin(user, eq(paymentVerification.userId, user.id))
    .orderBy(desc(paymentVerification.createdAt))
    .limit(limit)
    .offset(offset);

  const serialized = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
  }));

  const [{ total }] = await db
    .select({ total: count() })
    .from(paymentVerification);

  const totalPages = Math.ceil(Number(total) / limit);

  return NextResponse.json({
    success: true,
    data: serialized,
    page,
    limit,
    total: Number(total),
    totalPages,
  });
}
