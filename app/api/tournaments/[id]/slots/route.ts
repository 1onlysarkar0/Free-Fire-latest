import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { tournamentSlot } from "@/db/schema";
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
      })
      .from(tournamentSlot)
      .where(eq(tournamentSlot.tournamentId, tournamentId))
      .orderBy(tournamentSlot.slotNumber);

    return NextResponse.json({
      success: true,
      data: slots.map((s) => ({ ...s, ignList: JSON.parse((s.ignList as string) || "[]") })),
    });
  } catch (err) {
    console.error("[API/tournaments/slots] error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch slots" }, { status: 500 });
  }
}
