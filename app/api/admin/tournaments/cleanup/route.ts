import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { tournament, siteConfig } from "@/db/schema";
import { and, lt, inArray, eq, sql } from "drizzle-orm";
import { invalidateTournamentCache } from "@/lib/cache";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const adminUser = await requireAdminOrRole(req, "tournaments:view");
  if (adminUser instanceof Response) return adminUser;

  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await db
      .select()
      .from(tournament)
      .where(lt(tournament.startTime, cutoff))
      .orderBy(tournament.startTime);

    return NextResponse.json(
      rows.map((t) => ({ ...t, maps: JSON.parse(t.maps || "[]") }))
    );
  } catch (err) {
    console.error("[API/admin/tournaments/cleanup] GET:", err);
    return NextResponse.json({ error: "Failed to fetch cleanup tournaments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const adminUser = await requireAdminOrRole(req, "tournaments:delete");
  if (adminUser instanceof Response) return adminUser;

  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No tournament IDs provided" }, { status: 400 });
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const targetTournaments = await db
      .select({ id: tournament.id })
      .from(tournament)
      .where(
        and(
          inArray(tournament.id, ids),
          lt(tournament.startTime, cutoff)
        )
      );

    const targetIds = targetTournaments.map(t => t.id);
    if (targetIds.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    await db.transaction(async (tx) => {
      // 1. Delete tournaments (cascading deletes slot details, participants, etc.)
      await tx.delete(tournament).where(inArray(tournament.id, targetIds));

      // 2. Increment deletedTournamentsCount
      await tx
        .update(siteConfig)
        .set({
          deletedTournamentsCount: sql`${siteConfig.deletedTournamentsCount} + ${targetIds.length}`
        })
        .where(eq(siteConfig.id, "default"));
    });

    // Invalidate cache
    for (const id of targetIds) {
      invalidateTournamentCache(id);
    }
    revalidateTag("site-config");

    return NextResponse.json({ success: true, count: targetIds.length });
  } catch (err) {
    console.error("[API/admin/tournaments/cleanup] POST:", err);
    return NextResponse.json({ error: "Failed to cleanup tournaments" }, { status: 500 });
  }
}
