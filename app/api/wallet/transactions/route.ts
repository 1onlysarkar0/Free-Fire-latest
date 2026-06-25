import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { walletTransaction } from "@/db/schema";
import { count, desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
    const offset = (page - 1) * limit;

    const where = eq(walletTransaction.userId, userId);

    const [transactions, [{ total }]] = await Promise.all([
      db
        .select()
        .from(walletTransaction)
        .where(where)
        .orderBy(desc(walletTransaction.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(walletTransaction).where(where),
    ]);

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[API/wallet/transactions] error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch transactions" }, { status: 500 });
  }
}
