import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { withdrawRequest, user, walletTransaction } from "@/db/schema";
import { eq, desc, asc, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const adminUser = await requireAdminOrRole(req, "withdraw:view");
  if (adminUser instanceof Response) return adminUser;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
    const offset = (page - 1) * limit;
    const statusFilter = searchParams.get("status");

    let where = undefined;
    if (statusFilter && ["PENDING", "COMPLETED", "CANCELLED"].includes(statusFilter.toUpperCase())) {
      where = eq(withdrawRequest.status, statusFilter.toUpperCase());
    }

    const [requests, [{ total }]] = await Promise.all([
      db
        .select({
          id: withdrawRequest.id,
          userId: withdrawRequest.userId,
          amount: withdrawRequest.amount,
          upiId: withdrawRequest.upiId,
          status: withdrawRequest.status,
          adminNote: withdrawRequest.adminNote,
          refundedOnCancel: withdrawRequest.refundedOnCancel,
          transactionId: withdrawRequest.transactionId,
          createdAt: withdrawRequest.createdAt,
          processedAt: withdrawRequest.processedAt,
          processedByAdminId: withdrawRequest.processedByAdminId,
          userName: user.name,
          userEmail: user.email,
          userGameName: user.gameName,
          walletBalanceBefore: walletTransaction.balanceBefore,
          walletBalanceAfter: walletTransaction.balanceAfter,
        })
        .from(withdrawRequest)
        .leftJoin(user, eq(withdrawRequest.userId, user.id))
        .leftJoin(walletTransaction, eq(withdrawRequest.transactionId, walletTransaction.id))
        .where(where)
        .orderBy(asc(withdrawRequest.status), desc(withdrawRequest.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(withdrawRequest).where(where),
    ]);

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[API/admin/withdraw/requests] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}
