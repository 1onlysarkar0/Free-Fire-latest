import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { syncPaymentEmails } from "@/lib/payment";
import { requireAdminOrRole } from "@/lib/admin-auth";

export const instant = false;
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    const isCronJob = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCronJob) {
      const admin = await requireAdminOrRole(request);
      if (admin instanceof Response) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    console.log("[Cron/SyncEmails] Starting sync...");
    const result = await syncPaymentEmails();

    return NextResponse.json({
      success: true,
      syncedCount: result.syncedCount,
      logs: result.logs,
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
