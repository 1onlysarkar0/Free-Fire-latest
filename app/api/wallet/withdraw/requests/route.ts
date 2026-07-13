import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { withdrawRequest } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
    const offset = (page - 1) * limit;

    const where = eq(withdrawRequest.userId, userId);

    const [requests, [{ total }]] = await Promise.all([
      db
        .select()
        .from(withdrawRequest)
        .where(where)
        .orderBy(desc(withdrawRequest.createdAt))
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
    console.error("[API/wallet/withdraw/requests] error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch withdrawal requests" }, { status: 500 });
  }
}
