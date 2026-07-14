import { NextRequest, NextResponse, after } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { tournament, tournamentParticipant, tournamentSlot } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { invalidateTournamentCache } from "@/lib/cache";
import { creditWallet } from "@/lib/wallet";

export const maxDuration = 30;


export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const adminUser = await requireAdminOrRole(req, "tournaments:manage_participants");
  if (adminUser instanceof Response) return adminUser;

  try {
    const { id: tournamentId, userId } = await params;

    const [t] = await db
      .select({ status: tournament.status, name: tournament.name })
      .from(tournament)
      .where(eq(tournament.id, tournamentId))
      .limit(1);

    if (!t) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

    if (["COMPLETED", "CANCELLED"].includes(t.status)) {
      return NextResponse.json({ error: "Cannot remove participants from a completed/cancelled tournament" }, { status: 400 });
    }

    const [participant] = await db
      .select()
      .from(tournamentParticipant)
      .where(and(eq(tournamentParticipant.tournamentId, tournamentId), eq(tournamentParticipant.userId, userId)))
      .limit(1);

    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const refund = body.refund === true;

    // Release the slot
    await db
      .update(tournamentSlot)
      .set({ status: "AVAILABLE", userId: null, teamName: null, ignList: "[]", bookedAt: null })
      .where(eq(tournamentSlot.id, participant.slotId));

    // Delete participant
    await db
      .delete(tournamentParticipant)
      .where(and(eq(tournamentParticipant.tournamentId, tournamentId), eq(tournamentParticipant.userId, userId)));



    // Refund entry fee if requested
    if (refund && participant.entryFeePaid > 0) {
      const idempotencyKey = `admin-refund-${tournamentId}-${userId}-${Date.now()}`;
      const refundResult = await creditWallet({
        userId,
        amount: participant.entryFeePaid,
        type: "REFUND",
        referenceId: tournamentId,
        description: `Admin refund — removed from "${t.name}"`,
        performedByAdminId: adminUser.user.id,
        idempotencyKey,
      });

      if (!refundResult.success) {
        console.error(`[remove-participant] Refund failed for user ${userId}:`, refundResult.error);
      } else {
      }

      after(async () => {
        try {
          await invalidateTournamentCache(tournamentId);
        } catch (e) {
          console.error("[after] participants cache invalidation (refund path) failed:", e);
        }
      });
      return NextResponse.json({
        success: true,
        refunded: refundResult.success,
        refundAmount: participant.entryFeePaid,
      });
    }

    after(async () => {
      try {
        await invalidateTournamentCache(tournamentId);
      } catch (e) {
        console.error("[after] participants cache invalidation failed:", e);
      }
    });
    return NextResponse.json({ success: true, refunded: false });
  } catch (err) {
    console.error("[API/admin/tournaments/participants/[userId]] DELETE:", err);
    return NextResponse.json({ error: "Failed to remove participant" }, { status: 500 });
  }
}
