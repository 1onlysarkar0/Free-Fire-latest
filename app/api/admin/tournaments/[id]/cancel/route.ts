import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { tournament, tournamentParticipant, tournamentCancellation, cancellationRefund } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { invalidateTournamentCache } from "@/lib/cache";
import { creditWallet } from "@/lib/wallet";
import { sendTournamentCancelledNotifications } from "@/lib/tournament-emails";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await requireAdminOrRole(req, "tournaments:cancel");
  if (adminUser instanceof Response) return adminUser;

  try {
    const { id: tournamentId } = await params;

    const [t] = await db.select().from(tournament).where(eq(tournament.id, tournamentId)).limit(1);
    if (!t) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

    if (t.status === "CANCELLED") {
      return NextResponse.json({ error: "Tournament is already cancelled" }, { status: 400 });
    }
    if (t.status === "COMPLETED") {
      return NextResponse.json({ error: "Cannot cancel a completed tournament" }, { status: 400 });
    }

    const body = await req.json();
    const reason: string = (body.reason ?? "").trim();

    if (!reason) return NextResponse.json({ error: "Cancellation reason is required" }, { status: 400 });

    // Get all paid participants
    const participants = await db
      .select({
        userId: tournamentParticipant.userId,
        entryFeePaid: tournamentParticipant.entryFeePaid,
      })
      .from(tournamentParticipant)
      .where(eq(tournamentParticipant.tournamentId, tournamentId));

    // Process in ATOMIC transaction
    const refundSummary: { userId: string; refundAmount: number }[] = [];
    const cancellationId = nanoid();

    await db.transaction(async (tx) => {
      // 1. Create cancellation record
      await tx.insert(tournamentCancellation).values({
        id: cancellationId,
        tournamentId,
        reason,
        cancelledByAdminId: adminUser.user.id,
        cancelledAt: new Date(),
      });

      // 2. Update tournament status
      await tx
        .update(tournament)
        .set({ status: "CANCELLED", updatedAt: new Date() })
        .where(eq(tournament.id, tournamentId));

      // 3. Process refunds
      for (const p of participants) {
        if (p.entryFeePaid <= 0) {
          refundSummary.push({ userId: p.userId, refundAmount: 0 });
          continue;
        }

        const idempotencyKey = `refund-cancel-${cancellationId}-${p.userId}`;
        const refundResult = await creditWallet({
          userId: p.userId,
          amount: p.entryFeePaid,
          type: "REFUND",
          referenceId: tournamentId,
          description: `Refund for cancelled tournament "${t.name}"`,
          idempotencyKey,
          tx,
        });

        if (!refundResult.success) {
          throw new Error(`Refund failed for user ${p.userId}: ${refundResult.error}`);
        }

        const refundRecordId = nanoid();
        await tx.insert(cancellationRefund).values({
          id: refundRecordId,
          cancellationId,
          userId: p.userId,
          refundAmount: p.entryFeePaid,
          refundTransactionId: refundResult.transactionId ?? null,
          status: "COMPLETED",
        });

        refundSummary.push({ userId: p.userId, refundAmount: p.entryFeePaid });
      }
    });

    // Fire-and-forget notifications (AFTER transaction success)
    sendTournamentCancelledNotifications({
      tournamentId,
      tournamentName: t.name,
      cancellationReason: reason,
      participants: refundSummary,
    }).catch((err) => console.error("[cancel] Notification error:", err));


    invalidateTournamentCache(tournamentId);
    return NextResponse.json({
      success: true,
      cancellationId,
      refundsProcessed: refundSummary.filter((r) => r.refundAmount > 0).length,
    });
  } catch (err) {
    console.error("[API/admin/tournaments/cancel] POST:", err);
    return NextResponse.json({ error: "Failed to cancel tournament" }, { status: 500 });
  }
}
