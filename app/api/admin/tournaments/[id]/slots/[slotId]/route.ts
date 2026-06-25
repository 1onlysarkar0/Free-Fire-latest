import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { tournamentSlot } from "@/db/schema";
import { eq } from "drizzle-orm";
import { invalidateTournamentCache } from "@/lib/cache";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; slotId: string }> }
) {
  const adminUser = await requireAdminOrRole(req, "tournaments:manage_participants");
  if (adminUser instanceof Response) return adminUser;

  try {
    const { id, slotId } = await params;

    const [slot] = await db
      .select()
      .from(tournamentSlot)
      .where(eq(tournamentSlot.id, slotId))
      .limit(1);

    if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if ("teamName" in body) updates.teamName = body.teamName ?? null;
    if ("ignList" in body && Array.isArray(body.ignList)) {
      updates.ignList = JSON.stringify(body.ignList);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await db.update(tournamentSlot).set(updates).where(eq(tournamentSlot.id, slotId));
    invalidateTournamentCache(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API/admin/tournaments/slots/[slotId]] PATCH:", err);
    return NextResponse.json({ error: "Failed to update slot" }, { status: 500 });
  }
}
