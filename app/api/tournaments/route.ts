import { NextRequest, NextResponse } from "next/server";
import { fetchTournamentsPaginated, TournamentListItem } from "@/lib/tournaments";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { tournamentParticipant } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const gameMode = searchParams.get("gameMode");
    const teamFormat = searchParams.get("teamFormat");
    const type = searchParams.get("type");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));

    const result = await fetchTournamentsPaginated(
      status,
      gameMode,
      teamFormat,
      type,
      page,
      limit
    );

    const data = result.data as TournamentListItem[];
    const total = result.total;

    // Check which tournaments the current user has joined
    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
    if (session?.user?.id && data.length > 0) {
      const joined = await db
        .select({ tournamentId: tournamentParticipant.tournamentId })
        .from(tournamentParticipant)
        .where(
          and(
            inArray(
              tournamentParticipant.tournamentId,
              data.map((t) => t.id)
            ),
            eq(tournamentParticipant.userId, session.user.id)
          )
        );

      const joinedIds = new Set(joined.map((j) => j.tournamentId));
      for (const t of data) {
        if (joinedIds.has(t.id)) {
          t.hasJoined = true;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[API/tournaments] GET error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch tournaments" }, { status: 500 });
  }
}
