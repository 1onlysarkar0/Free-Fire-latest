import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { tournament, tournamentSlot, tournamentParticipant } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { fetchTournamentPublicData } from "@/lib/tournaments";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);

    const publicData = await fetchTournamentPublicData(id);
    if (!publicData) return NextResponse.json({ success: false, error: "Tournament not found" }, { status: 404 });

    const { row, slots, bookedSlots, winners } = publicData;

    // Check if current user is a participant
    let userParticipant = null;
    let userSlot = null;
    if (session?.user?.id) {
      const [p] = await db
        .select()
        .from(tournamentParticipant)
        .where(
          and(
            eq(tournamentParticipant.tournamentId, id),
            eq(tournamentParticipant.userId, session.user.id)
          )
        )
        .limit(1);

      if (p) {
        userParticipant = p;
        const [s] = await db
          .select()
          .from(tournamentSlot)
          .where(eq(tournamentSlot.id, p.slotId))
          .limit(1);
        userSlot = s;
      }
    }

    // Room credentials — only visible if status is ROOM_REVEALED+ AND user is a participant
    const showRoom =
      ["ROOM_REVEALED", "LIVE", "FINISHED", "COMPLETED"].includes(row.status) &&
      userParticipant !== null;
    const [roomCredentials] = showRoom
      ? await db
          .select({ roomId: tournament.roomId, roomPassword: tournament.roomPassword })
          .from(tournament)
          .where(eq(tournament.id, id))
          .limit(1)
      : [undefined];

    return NextResponse.json({
      success: true,
      data: {
        ...row,
        bookedSlots,
        availableSlots: row.totalSlots - bookedSlots,
        roomId: roomCredentials?.roomId ?? null,
        roomPassword: roomCredentials?.roomPassword ?? null,
        slots: slots.map((s: {
          id: string;
          slotNumber: number;
          status: string;
          teamName: string | null;
          ignList: string[];
          bookedAt: string | null;
          userId: string | null;
          userName: string | null;
          userGameName: string | null;
        }) => ({
          ...s,
          userId: s.userId === session?.user?.id ? s.userId : undefined,
          userName: s.status === "BOOKED" ? (s.userGameName || s.userName) : undefined,
          userGameName: undefined,
        })),
        userParticipant,
        userSlot: userSlot
          ? { ...userSlot, ignList: JSON.parse(userSlot.ignList || "[]") }
          : null,
        winners,
      },
    });
  } catch (err) {
    console.error("[API/tournaments/[id]] GET error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch tournament" }, { status: 500 });
  }
}
