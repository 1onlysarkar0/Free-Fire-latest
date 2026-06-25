import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import {
  tournament,
  tournamentSlot,
  tournamentParticipant,
  user as userTable,
} from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { debitWallet, getOrCreateWallet } from "@/lib/wallet";
import { apiSuccess, apiError } from "@/lib/api-response";
import { invalidateTournamentCache } from "@/lib/cache";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return apiError("Authentication required", 401);
    }
    const userId = session.user.id;
    const { id: tournamentId } = await params;

    // Check if user is banned
    const [dbUser] = await db
      .select({ isBanned: userTable.isBanned, banReason: userTable.banReason })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);
    if (dbUser?.isBanned) {
      return apiError("Your account has been suspended and cannot join tournaments.", 403);
    }

    const body = await req.json().catch(() => ({}));
    const teamName: string = (body.teamName ?? "").trim();
    const ignList: string[] = Array.isArray(body.ignList) ? body.ignList : [];
    const requestedSlotId: string | null = body.slotId ?? null;

    // Load tournament
    const [t] = await db.select().from(tournament).where(eq(tournament.id, tournamentId)).limit(1);
    if (!t) return apiError("Tournament not found", 404);

    // Validate status — only UPCOMING allows new registrations
    if (t.status !== "UPCOMING") {
      return apiError("Registration is closed for this tournament", 400);
    }

    // Check registration deadline
    if (new Date() > new Date(t.registrationDeadline)) {
      return apiError("Registration deadline has passed", 400);
    }

    // Check if user already joined
    const [existing] = await db
      .select({ id: tournamentParticipant.id })
      .from(tournamentParticipant)
      .where(
        and(
          eq(tournamentParticipant.tournamentId, tournamentId),
          eq(tournamentParticipant.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      return apiError("You have already joined this tournament", 409);
    }

    // Resolve which slot to use
    let chosenSlot: { id: string; slotNumber: number } | null = null;

    if (requestedSlotId) {
      // User explicitly selected a slot — verify it's available
      const [s] = await db
        .select({ id: tournamentSlot.id, slotNumber: tournamentSlot.slotNumber, status: tournamentSlot.status })
        .from(tournamentSlot)
        .where(
          and(
            eq(tournamentSlot.id, requestedSlotId),
            eq(tournamentSlot.tournamentId, tournamentId)
          )
        )
        .limit(1);

      if (!s) return apiError("Slot not found", 404);
      if (s.status !== "AVAILABLE") return apiError("That slot is already taken. Please pick another.", 409);
      chosenSlot = { id: s.id, slotNumber: s.slotNumber };
    } else {
      // Auto-assign first available slot
      const [s] = await db
        .select({ id: tournamentSlot.id, slotNumber: tournamentSlot.slotNumber })
        .from(tournamentSlot)
        .where(
          and(
            eq(tournamentSlot.tournamentId, tournamentId),
            eq(tournamentSlot.status, "AVAILABLE")
          )
        )
        .orderBy(asc(tournamentSlot.slotNumber))
        .limit(1);

      if (!s) return apiError("No slots available. Tournament is full.", 400);
      chosenSlot = s;
    }

    const participantId = nanoid();
    let finalEntryFeePaid = 0;

    // Start ATOMIC transaction
    await db.transaction(async (tx) => {
      // 1. Re-check slot is still available inside transaction with lock
      const [slot] = await tx
        .select({ id: tournamentSlot.id, status: tournamentSlot.status })
        .from(tournamentSlot)
        .where(eq(tournamentSlot.id, chosenSlot!.id))
        .for("update")
        .limit(1);

      if (!slot || slot.status !== "AVAILABLE") {
        throw new Error("SLOT_TAKEN");
      }

      // Check if user already joined (inside transaction to prevent race conditions)
      const [existingInside] = await tx
        .select({ id: tournamentParticipant.id })
        .from(tournamentParticipant)
        .where(
          and(
            eq(tournamentParticipant.tournamentId, tournamentId),
            eq(tournamentParticipant.userId, userId)
          )
        )
        .limit(1);

      if (existingInside) {
        throw new Error("ALREADY_JOINED");
      }

      // 2. Handle payment if PAID
      let joinTransactionId: string | null = null;
      if (t.type === "PAID" && t.joiningFee > 0) {
        await getOrCreateWallet(userId, tx);

        const idempotencyKey = `join-${tournamentId}-${userId}`;
        const debitResult = await debitWallet({
          userId,
          amount: t.joiningFee,
          type: "JOIN_FEE",
          referenceId: tournamentId,
          description: `Entry fee for "${t.name}"`,
          idempotencyKey,
          tx,
        });

        if (!debitResult.success) {
          throw new Error(debitResult.error ?? "Insufficient wallet balance");
        }
        joinTransactionId = debitResult.transactionId ?? null;
        finalEntryFeePaid = t.joiningFee;
      }

      // 3. Update slot
      await tx
        .update(tournamentSlot)
        .set({
          status: "BOOKED",
          userId,
          teamName: teamName || null,
          ignList: JSON.stringify(ignList),
          bookedAt: new Date(),
        })
        .where(eq(tournamentSlot.id, chosenSlot!.id));

      // 4. Create participant record
      await tx.insert(tournamentParticipant).values({
        id: participantId,
        tournamentId,
        userId,
        slotId: chosenSlot!.id,
        entryFeePaid: finalEntryFeePaid,
        joinTransactionId,
        createdAt: new Date(),
      });
    });

    invalidateTournamentCache(tournamentId);
    return apiSuccess({
      participantId,
      slotNumber: chosenSlot.slotNumber,
      slotId: chosenSlot.id,
      entryFeePaid: finalEntryFeePaid,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to join tournament";
    console.error("[API/tournaments/join] error:", err);
    if (message === "ALREADY_JOINED") {
      return apiError("You have already joined this tournament", 409);
    }
    if (message === "SLOT_TAKEN") {
      return apiError("Slot was just taken. Please pick another.", 409);
    }
    if (message.includes("Insufficient balance") || message === "Insufficient wallet balance") {
      return apiError(message, 400);
    }
    return apiError(message, 500);
  }
}
