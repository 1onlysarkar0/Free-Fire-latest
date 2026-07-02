import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { tournament, tournamentSlot, tournamentParticipant, tournamentWinner, user, siteConfig, seoConfig } from "@/db/schema";
import { count, eq, sql } from "drizzle-orm";
import { invalidateTournamentCache } from "@/lib/cache";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await requireAdminOrRole(req, "tournaments:view");
  if (adminUser instanceof Response) return adminUser;

  try {
    const { id } = await params;

    const [row] = await db.select().from(tournament).where(eq(tournament.id, id)).limit(1);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [slots, participants, winners, [{ total: participantCount }]] = await Promise.all([
      db.select().from(tournamentSlot).where(eq(tournamentSlot.tournamentId, id)).orderBy(tournamentSlot.slotNumber),
      db
        .select({
          id: tournamentParticipant.id,
          userId: tournamentParticipant.userId,
          slotId: tournamentParticipant.slotId,
          entryFeePaid: tournamentParticipant.entryFeePaid,
          joinTransactionId: tournamentParticipant.joinTransactionId,
          createdAt: tournamentParticipant.createdAt,
          userName: user.name,
          userEmail: user.email,
          userGameName: user.gameName,
          userUid: user.uid,
          userImage: user.image,
        })
        .from(tournamentParticipant)
        .innerJoin(user, eq(tournamentParticipant.userId, user.id))
        .where(eq(tournamentParticipant.tournamentId, id)),
      db
        .select({
          id: tournamentWinner.id,
          userId: tournamentWinner.userId,
          slotId: tournamentWinner.slotId,
          placement: tournamentWinner.placement,
          prizeAmount: tournamentWinner.prizeAmount,
          declaredAt: tournamentWinner.declaredAt,
          userName: user.name,
          userGameName: user.gameName,
          userImage: user.image,
        })
        .from(tournamentWinner)
        .innerJoin(user, eq(tournamentWinner.userId, user.id))
        .where(eq(tournamentWinner.tournamentId, id)),
      db.select({ total: count() }).from(tournamentParticipant).where(eq(tournamentParticipant.tournamentId, id)),
    ]);

    return NextResponse.json({
      ...row,
      maps: JSON.parse(row.maps || "[]"),
      slots: slots.map((s: typeof tournamentSlot.$inferSelect) => ({ ...s, ignList: JSON.parse(s.ignList || "[]") })),
      participants,
      winners,
      participantCount,
    });
  } catch (err) {
    console.error("[API/admin/tournaments/[id]] GET:", err);
    return NextResponse.json({ error: "Failed to fetch tournament" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await requireAdminOrRole(req, "tournaments:edit");
  if (adminUser instanceof Response) return adminUser;

  try {
    const { id } = await params;

    const [existing] = await db.select({ id: tournament.id, status: tournament.status }).from(tournament).where(eq(tournament.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const allowed = ["name", "type", "joiningFee", "prizePool", "gameMode", "teamFormat", "maps", "startTime", "registrationDeadline", "endTime", "descriptionHtml", "descriptionMarkdown", "rulesHtml", "rulesMarkdown", "status"];

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (key in body) {
        if (key === "maps") updates.maps = JSON.stringify(Array.isArray(body[key]) ? body[key] : []);
        else if (key === "startTime" || key === "registrationDeadline" || key === "endTime")
          updates[key] = body[key] ? new Date(body[key]) : null;
        else if (key === "joiningFee" || key === "prizePool")
          updates[key] = Math.max(0, parseInt(body[key]) || 0);
        else if (key === "type" || key === "status")
          updates[key] = (body[key] as string).toUpperCase();
        else updates[key] = body[key];
      }
    }

    await db.update(tournament).set(updates).where(eq(tournament.id, id));

    // Sync SEO config with updated tournament data
    const [updated] = await db.select().from(tournament).where(eq(tournament.id, id)).limit(1);
    if (updated) {
      const [configRow] = await db.select().from(siteConfig).limit(1);
      const siteName = configRow?.logoTitle;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

      if (siteName && baseUrl) {
        const metaTitle = `${updated.name} — ${siteName}`;
        const metaDescription = `Join ${updated.name}. ${updated.type === "FREE" ? "Free entry" : `Entry fee: ₹${updated.joiningFee}`}. Prize pool: ₹${updated.prizePool}. ${updated.gameMode.replace(/_/g, " ")} mode. ${updated.teamFormat.toUpperCase()} format. Register now!`;

        const sportsEventSchema = {
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          "name": updated.name,
          "description": metaDescription,
          "url": `${baseUrl}/tournaments/${id}`,
          "startDate": updated.startTime instanceof Date ? updated.startTime.toISOString() : new Date(updated.startTime).toISOString(),
          "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
          "eventStatus": updated.status === "UPCOMING" ? "https://schema.org/EventScheduled"
            : updated.status === "LIVE" || updated.status === "ACTIVE" ? "https://schema.org/EventActive"
            : updated.status === "COMPLETED" ? "https://schema.org/EventCompleted"
            : updated.status === "CANCELLED" ? "https://schema.org/EventCancelled"
            : "https://schema.org/EventScheduled",
          "location": {
            "@type": "VirtualLocation",
            "url": `${baseUrl}/tournaments/${id}`
          },
          "offers": {
            "@type": "Offer",
            "price": updated.joiningFee ?? 0,
            "priceCurrency": "INR",
            "availability": updated.status === "UPCOMING" ? "https://schema.org/InStock" : "https://schema.org/SoldOut"
          }
        };

        await db.insert(seoConfig).values({
          id: `tournament-${id}`,
          metaTitle,
          metaDescription,
          ogTitle: updated.name,
          ogDescription: metaDescription,
          ogImage: `/api/og-image?tournament=${id}`,
          ogType: "website",
          canonicalUrl: `${baseUrl}/tournaments/${id}`,
          robots: "index, follow",
          structuredDataJson: JSON.stringify(sportsEventSchema),
          schemaType: "SportsEvent",
          ogImageDynamic: true,
          ogImageTemplate: "tournament",
        }).onConflictDoUpdate({
          target: seoConfig.id,
          set: {
            metaTitle,
            metaDescription,
            ogTitle: updated.name,
            ogDescription: metaDescription,
            ogImage: `/api/og-image?tournament=${id}`,
            canonicalUrl: `${baseUrl}/tournaments/${id}`,
            structuredDataJson: JSON.stringify(sportsEventSchema),
            updatedAt: new Date(),
          },
        });
      }
    }

    await invalidateTournamentCache(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API/admin/tournaments/[id]] PATCH:", err);
    return NextResponse.json({ error: "Failed to update tournament" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await requireAdminOrRole(req, "tournaments:delete");
  if (adminUser instanceof Response) return adminUser;

  try {
    const { id } = await params;

    const [existing] = await db.select({ status: tournament.status }).from(tournament).where(eq(tournament.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (["ACTIVE", "ROOM_REVEALED", "LIVE"].includes(existing.status)) {
      return NextResponse.json({ error: "Cannot delete an active tournament. Cancel it first." }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      await tx.delete(tournament).where(eq(tournament.id, id));
      await tx
        .update(siteConfig)
        .set({
          deletedTournamentsCount: sql`${siteConfig.deletedTournamentsCount} + 1`
        })
        .where(eq(siteConfig.id, "default"));
    });
    await invalidateTournamentCache(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API/admin/tournaments/[id]] DELETE:", err);
    return NextResponse.json({ error: "Failed to delete tournament" }, { status: 500 });
  }
}
