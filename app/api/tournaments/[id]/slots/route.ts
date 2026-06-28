import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { tournamentSlot, user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tournamentId } = await params;

    const slots = await db
      .select({
        id: tournamentSlot.id,
        slotNumber: tournamentSlot.slotNumber,
        status: tournamentSlot.status,
        teamName: tournamentSlot.teamName,
        ignList: tournamentSlot.ignList,
        bookedAt: tournamentSlot.bookedAt,
        userName: user.name,
        userGameName: user.gameName,
      })
      .from(tournamentSlot)
      .leftJoin(user, eq(tournamentSlot.userId, user.id))
      .where(eq(tournamentSlot.tournamentId, tournamentId))
      .orderBy(tournamentSlot.slotNumber);

    return NextResponse.json({
      success: true,
      data: slots.map((s) => ({
        id: s.id,
        slotNumber: s.slotNumber,
        status: s.status,
        teamName: s.teamName,
        ignList: JSON.parse((s.ignList as string) || "[]"),
        bookedAt: s.bookedAt,
        userName: s.status === "BOOKED" ? (s.userGameName || "Booked") : undefined,
      })),
    });
  } catch (err) {
    console.error("[API/tournaments/slots] error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch slots" }, { status: 500 });
  }
}
