import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { withdrawRequest } from "@/db/schema";
import { eq } from "drizzle-orm";
import { creditWallet } from "@/lib/wallet";
import { z } from "zod";
import { invalidateAdminCache } from "@/lib/cache";

const schema = z.object({
  action: z.enum(["complete", "cancel"]),
  adminNote: z.string().trim().optional(),
  refundOnCancel: z.boolean().default(false),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { action, adminNote, refundOnCancel } = parsed.data;

    const requiredPermission = action === "cancel" ? "withdraw:cancel" : "withdraw:approve";
    const adminUser = await requireAdminOrRole(req, requiredPermission);
    if (adminUser instanceof Response) return adminUser;

    const { id } = await params;

    const [existing] = await db
      .select()
      .from(withdrawRequest)
      .where(eq(withdrawRequest.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Withdrawal request not found." }, { status: 404 });
    }

    if (existing.status !== "PENDING") {
      return NextResponse.json({ error: `Request is already ${existing.status.toLowerCase()}.` }, { status: 400 });
    }

    if (action === "complete") {
      await db
        .update(withdrawRequest)
        .set({
          status: "COMPLETED",
          adminNote: adminNote ?? null,
          processedAt: new Date(),
          processedByAdminId: adminUser.user.id,
        })
        .where(eq(withdrawRequest.id, id));

      await invalidateAdminCache();
      return NextResponse.json({ success: true, message: "Withdrawal request completed." });
    } else {
      // Cancel
      const cancelResult = await db.transaction(async (tx) => {
        if (refundOnCancel && existing.transactionId) {
          const refundResult = await creditWallet({
            userId: existing.userId,
            amount: existing.amount,
            type: "REFUND",
            referenceId: existing.id,
            description: `Refund for cancelled withdrawal request (${existing.upiId})`,
            performedByAdminId: adminUser.user.id,
            idempotencyKey: `withdraw-cancel-refund-${existing.id}`,
            tx,
          });

          if (!refundResult.success) {
            throw new Error(refundResult.error || "Failed to process refund.");
          }
        }

        await tx
          .update(withdrawRequest)
          .set({
            status: "CANCELLED",
            adminNote: adminNote ?? null,
            refundedOnCancel: refundOnCancel,
            processedAt: new Date(),
            processedByAdminId: adminUser.user.id,
          })
          .where(eq(withdrawRequest.id, id));
          
        return { success: true };
      }).catch(err => {
        return { success: false, error: err instanceof Error ? err.message : "Failed to cancel withdrawal." };
      });

      if (!cancelResult.success) {
        return NextResponse.json({ error: cancelResult.error }, { status: 400 });
      }

      await invalidateAdminCache();
      return NextResponse.json({
        success: true,
        message: refundOnCancel
          ? "Withdrawal cancelled and amount refunded."
          : "Withdrawal cancelled without refund.",
      });
    }
  } catch (err) {
    console.error("[API/admin/withdraw/requests/[id]] POST error:", err);
    return NextResponse.json({ error: "Failed to process request." }, { status: 500 });
  }
}
