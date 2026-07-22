import { NextRequest, NextResponse } from "next/server";
import { syncPaymentEmails } from "@/lib/payment";

export const maxDuration = 60;
// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const syncedCount = await syncPaymentEmails();

    return NextResponse.json({
      success: true,
      syncedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Cron/SyncEmails] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
