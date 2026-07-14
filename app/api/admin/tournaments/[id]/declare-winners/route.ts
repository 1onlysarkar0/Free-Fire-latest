import { NextRequest, NextResponse, after } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { tournament, tournamentWinner } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { invalidateTournamentCache } from "@/lib/cache";
import { creditWallet } from "@/lib/wallet";
import { sendPrizeCreditedNotification } from "@/lib/tournament-emails";
import { getSiteUrl } from "@/lib/site-url";

// Give Vercel serverless functions 30 seconds — prize distribution + wallet credits take time
export const maxDuration = 30;

interface WinnerInput {
  userId: string;
  slotId?: string;
  placement: string;
  prizeAmount: number;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await requireAdminOrRole(req, "tournaments:declare_winners");
  if (adminUser instanceof Response) return adminUser;

  try {
    const { id: tournamentId } = await params;

    const [t] = await db.select().from(tournament).where(eq(tournament.id, tournamentId)).limit(1);
    if (!t) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

    if (t.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot declare winners for a cancelled tournament" }, { status: 400 });
    }
    if (t.status === "COMPLETED") {
      return NextResponse.json({ error: "Winners have already been declared" }, { status: 400 });
    }

    const body = await req.json();
    const { winners }: { winners: WinnerInput[] } = body;

    if (!Array.isArray(winners) || winners.length === 0) {
      return NextResponse.json({ error: "At least one winner is required" }, { status: 400 });
    }

    // Validate winners
    for (const w of winners) {
      if (!w.userId) return NextResponse.json({ error: "Each winner must have a userId" }, { status: 400 });
      if (!w.placement) return NextResponse.json({ error: "Each winner must have a placement" }, { status: 400 });
      if (typeof w.prizeAmount !== "number" || w.prizeAmount < 0) {
        return NextResponse.json({ error: "Prize amount must be a non-negative number" }, { status: 400 });
      }
    }

    const results: { winnerId: string; userId: string; placement: string; prizeAmount: number }[] = [];

    await db.transaction(async (tx) => {
      for (const w of winners) {
        const winnerId = nanoid();
        let creditTransactionId: string | null = null;

        // Credit wallet for prize amount
        if (w.prizeAmount > 0) {
          const idempotencyKey = `prize-${tournamentId}-${w.userId}-${w.placement}`;
          const creditResult = await creditWallet({
            userId: w.userId,
            amount: w.prizeAmount,
            type: "PRIZE_CREDIT",
            referenceId: tournamentId,
            description: `Prize for "${t.name}" — ${w.placement} place`,
            idempotencyKey,
            tx,
          });

          if (!creditResult.success) {
            throw new Error(`Failed to credit wallet for user ${w.userId}: ${creditResult.error}`);
          }
          creditTransactionId = creditResult.transactionId ?? null;
        }

        await tx.insert(tournamentWinner).values({
          id: winnerId,
          tournamentId,
          userId: w.userId,
          slotId: w.slotId ?? null,
          placement: w.placement,
          prizeAmount: w.prizeAmount,
          creditTransactionId,
          declaredAt: new Date(),
        });

        results.push({ winnerId, userId: w.userId, placement: w.placement, prizeAmount: w.prizeAmount });
      }

      // Mark tournament as COMPLETED
      await tx
        .update(tournament)
        .set({ status: "COMPLETED", updatedAt: new Date() })
        .where(eq(tournament.id, tournamentId));
    });

    // Defer notifications and cache invalidation to after() so the response returns immediately
    after(async () => {
      try {
        const siteUrl = await getSiteUrl();
        for (const res of results) {
          if (res.prizeAmount > 0) {
            await sendPrizeCreditedNotification({
              userId: res.userId,
              tournamentId,
              tournamentName: t.name,
              prizeAmount: res.prizeAmount,
              placement: res.placement,
              siteUrl: siteUrl || undefined,
            }).catch((err) => console.error("[declare-winners] Prize notification error:", err));
          }
        }
      } catch (err) {
        console.error("[declare-winners] Notification error:", err);
      }
      try {
        await invalidateTournamentCache(tournamentId);
      } catch (e) {
        console.error("[after] invalidateTournamentCache failed:", e);
      }
    });

    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    console.error("[API/admin/tournaments/declare-winners] POST:", err);
    return NextResponse.json({ error: "Failed to declare winners" }, { status: 500 });
  }
}
