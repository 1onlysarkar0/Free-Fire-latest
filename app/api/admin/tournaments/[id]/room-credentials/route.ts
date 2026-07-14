import { NextRequest, NextResponse, after } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { tournament, tournamentParticipant } from "@/db/schema";
import { eq } from "drizzle-orm";
import { invalidateTournamentCache } from "@/lib/cache";
import { sendRoomRevealedNotifications } from "@/lib/tournament-emails";
import { getSiteUrl } from "@/lib/site-url";

// Give Vercel serverless functions 30 seconds
export const maxDuration = 30;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await requireAdminOrRole(req, "tournaments:manage_room");
  if (adminUser instanceof Response) return adminUser;

  try {
    const { id } = await params;

    const [t] = await db.select().from(tournament).where(eq(tournament.id, id)).limit(1);
    if (!t) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

    if (["COMPLETED", "CANCELLED"].includes(t.status)) {
      return NextResponse.json({ error: "Cannot update credentials for a completed or cancelled tournament" }, { status: 400 });
    }

    const body = await req.json();
    const { roomId, roomPassword } = body;

    if (!roomId?.trim()) return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
    if (!roomPassword?.trim()) return NextResponse.json({ error: "Room Password is required" }, { status: 400 });

    await db
      .update(tournament)
      .set({
        roomId: roomId.trim(),
        roomPassword: roomPassword.trim(),
        status: "ROOM_REVEALED",
        updatedAt: new Date(),
      })
      .where(eq(tournament.id, id));

    // Get all participant user IDs for notifications
    const participants = await db
      .select({ userId: tournamentParticipant.userId })
      .from(tournamentParticipant)
      .where(eq(tournamentParticipant.tournamentId, id));

    const userIds = participants.map((p: { userId: string }) => p.userId);

    // Defer notifications and cache invalidation to after() so the response returns immediately
    after(async () => {
      try {
        const siteUrl = await getSiteUrl();
        await sendRoomRevealedNotifications({
          tournamentId: id,
          tournamentName: t.name,
          startTime: t.startTime,
          participantUserIds: userIds,
          siteUrl: siteUrl || undefined,
        });
      } catch (err) {
        console.error("[room-credentials] Notification error:", err);
      }
      try {
        await invalidateTournamentCache(id);
      } catch (e) {
        console.error("[after] invalidateTournamentCache failed:", e);
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API/admin/tournaments/room-credentials] PATCH:", err);
    return NextResponse.json({ error: "Failed to update room credentials" }, { status: 500 });
  }
}
