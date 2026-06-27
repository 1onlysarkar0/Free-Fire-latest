import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { tournament, tournamentParticipant, tournamentSlot } from "@/db/schema";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;

    const participations = await db
      .select({
        tournamentId: tournamentParticipant.tournamentId,
        entryFeePaid: tournamentParticipant.entryFeePaid,
        joinedAt: tournamentParticipant.createdAt,
      })
      .from(tournamentParticipant)
      .where(eq(tournamentParticipant.userId, userId))
      .orderBy(desc(tournamentParticipant.createdAt))
      .limit(50);

    if (participations.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const tournamentIds = participations.map((p) => p.tournamentId);
    const metaMap = new Map(
      participations.map((p) => [p.tournamentId, { entryFeePaid: p.entryFeePaid, joinedAt: p.joinedAt }])
    );

    const rows = await db
      .select({
        id: tournament.id,
        name: tournament.name,
        type: tournament.type,
        joiningFee: tournament.joiningFee,
        prizePool: tournament.prizePool,
        gameMode: tournament.gameMode,
        teamFormat: tournament.teamFormat,
        maps: tournament.maps,
        totalSlots: tournament.totalSlots,
        startTime: tournament.startTime,
        registrationDeadline: tournament.registrationDeadline,
        status: tournament.status,
        bookedSlots: sql<number>`(SELECT count(*) FROM ${tournamentSlot} WHERE ${tournamentSlot.tournamentId} = ${tournament.id} AND ${tournamentSlot.status} = 'BOOKED')::int`,
      })
      .from(tournament)
      .where(inArray(tournament.id, tournamentIds))
      .orderBy(desc(tournament.startTime));

    const data = rows.map((t) => {
      const meta = metaMap.get(t.id);
      let maps: string[] = [];
      try { maps = JSON.parse(t.maps || "[]"); } catch { maps = []; }
      return {
        ...t,
        maps,
        bookedSlots: t.bookedSlots ?? 0,
        availableSlots: t.totalSlots - (t.bookedSlots ?? 0),
        startTime: t.startTime.toISOString(),
        registrationDeadline: t.registrationDeadline.toISOString(),
        entryFeePaid: meta?.entryFeePaid ?? 0,
        joinedAt: meta?.joinedAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[API/tournaments/my] GET error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch tournaments" }, { status: 500 });
  }
}
