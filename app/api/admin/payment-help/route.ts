import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { paymentHelpRequest, user } from "@/db/schema";
import { desc, eq, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const adminUser = await requireAdminOrRole(req, "payment_help:view");
  if (adminUser instanceof Response) return adminUser;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
    const offset = (page - 1) * limit;
    const statusFilter = searchParams.get("status");

    let where = undefined;
    if (statusFilter && ["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"].includes(statusFilter.toUpperCase())) {
      where = eq(paymentHelpRequest.status, statusFilter.toUpperCase());
    }

    const [requests, [{ total }]] = await Promise.all([
      db
        .select({
          id: paymentHelpRequest.id,
          userId: paymentHelpRequest.userId,
          amount: paymentHelpRequest.amount,
          utrNumber: paymentHelpRequest.utrNumber,
          description: paymentHelpRequest.description,
          status: paymentHelpRequest.status,
          adminNote: paymentHelpRequest.adminNote,
          reviewedByAdminId: paymentHelpRequest.reviewedByAdminId,
          createdAt: paymentHelpRequest.createdAt,
          updatedAt: paymentHelpRequest.updatedAt,
          userName: user.name,
          userEmail: user.email,
          userGameName: user.gameName,
        })
        .from(paymentHelpRequest)
        .leftJoin(user, eq(paymentHelpRequest.userId, user.id))
        .where(where)
        .orderBy(desc(paymentHelpRequest.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(paymentHelpRequest).where(where),
    ]);

    return NextResponse.json({
      success: true,
      data: requests.map((r) => ({
        ...r,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[API/admin/payment-help] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch payment help requests" }, { status: 500 });
  }
}
