import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { tournament, tournamentSlot, seoConfig, siteConfig } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { invalidateTournamentCache } from "@/lib/cache";

// Convert slot number to team label (1→A, 2→B, ..., 26→Z, 27→AA, ...)
function slotLabel(n: number): string {
  let label = "";
  let num = n;
  while (num > 0) {
    const rem = (num - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    num = Math.floor((num - 1) / 26);
  }
  return `Team ${label}`;
}

export async function GET(req: NextRequest) {
  const adminUser = await requireAdminOrRole(req, "tournaments:view");
  if (adminUser instanceof Response) return adminUser;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const rows = await db
      .select()
      .from(tournament)
      .where(status ? eq(tournament.status, status.toUpperCase()) : undefined)
      .orderBy(desc(tournament.createdAt));

    return NextResponse.json(
      rows.map((t: typeof tournament.$inferSelect) => ({ ...t, maps: JSON.parse(t.maps || "[]") }))
    );
  } catch (err) {
    console.error("[API/admin/tournaments] GET:", err);
    return NextResponse.json({ error: "Failed to fetch tournaments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const adminUser = await requireAdminOrRole(req, "tournaments:create");
  if (adminUser instanceof Response) return adminUser;

  try {
    const body = await req.json();
    const {
      name, type = "FREE", joiningFee = 0, prizePool = 0,
      gameMode, teamFormat, maps = [], totalSlots = 12,
      startTime, registrationDeadline, endTime,
      descriptionHtml, descriptionMarkdown,
      rulesHtml, rulesMarkdown,
    } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Tournament name is required" }, { status: 400 });
    if (!gameMode) return NextResponse.json({ error: "Game mode is required" }, { status: 400 });
    if (!teamFormat) return NextResponse.json({ error: "Team format is required" }, { status: 400 });
    if (!startTime) return NextResponse.json({ error: "Start time is required" }, { status: 400 });
    if (!registrationDeadline) return NextResponse.json({ error: "Registration deadline is required" }, { status: 400 });

    const rawSlots = Math.max(2, Math.min(500, parseInt(totalSlots) || 12));
    const format = (teamFormat as string).toLowerCase();

    // Create slot records for all individual player spots
    let teamSize: number;
    if (format === "duo") {
      teamSize = 2;
    } else if (format === "squad") {
      teamSize = 4;
    } else {
      teamSize = 1;
    }
    const slotRecordCount = rawSlots;

    const id = nanoid();

    await db.transaction(async (tx) => {
      await tx.insert(tournament).values({
        id,
        name: name.trim(),
        type: type.toUpperCase(),
        joiningFee: Math.max(0, parseInt(joiningFee) || 0),
        prizePool: Math.max(0, parseInt(prizePool) || 0),
        gameMode,
        teamFormat,
        maps: JSON.stringify(Array.isArray(maps) ? maps : []),
        totalSlots: slotRecordCount,
        startTime: new Date(startTime),
        registrationDeadline: new Date(registrationDeadline),
        endTime: endTime ? new Date(endTime) : null,
        descriptionHtml: descriptionHtml ?? null,
        descriptionMarkdown: descriptionMarkdown ?? null,
        rulesHtml: rulesHtml ?? null,
        rulesMarkdown: rulesMarkdown ?? null,
        status: "UPCOMING",
        createdByAdminId: adminUser.user.id,
        seoConfigId: `tournament-${id}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Auto-create slots
      const slotRows = Array.from({ length: slotRecordCount }, (_, i) => {
        const teamIndex = teamSize > 1 ? Math.floor(i / teamSize) + 1 : null;
        return {
          id: nanoid(),
          tournamentId: id,
          slotNumber: i + 1,
          // Prefill team name to group individual slots
          teamName: teamIndex ? slotLabel(teamIndex) : null,
          status: "AVAILABLE",
          userId: null,
          ignList: "[]",
          bookedAt: null,
        };
      });
      await tx.insert(tournamentSlot).values(slotRows);

       // Auto-create SEO Config
      const [configRow] = await tx.select().from(siteConfig).limit(1);
      const siteName = configRow?.logoTitle;
      if (!siteName) throw new Error("Site name configuration not found in database");

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!baseUrl) throw new Error("NEXT_PUBLIC_APP_URL environment variable is required");

      const metaTitle = `${name.trim()} — ${siteName}`;
      const metaDescription = `Join ${name.trim()}. ${type.toUpperCase() === "FREE" ? "Free entry" : `Entry fee: ₹${joiningFee}`}. Prize pool: ₹${prizePool}. ${gameMode.replace(/_/g, " ")} mode. ${teamFormat.toUpperCase()} format. Register now!`;

      const sportsEventSchema = {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        "name": name.trim(),
        "description": metaDescription,
        "url": `${baseUrl}/tournaments/${id}`,
        "startDate": new Date(startTime).toISOString(),
        "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
        "location": {
          "@type": "VirtualLocation",
          "url": `${baseUrl}/tournaments/${id}`
        },
        "offers": {
          "@type": "Offer",
          "price": joiningFee ?? 0,
          "priceCurrency": "INR",
          "availability": "https://schema.org/InStock"
        }
      };

      await tx.insert(seoConfig).values({
        id: `tournament-${id}`,
        metaTitle,
        metaDescription,
        ogTitle: name.trim(),
        ogDescription: metaDescription,
        ogImage: `/api/og-image?tournament=${id}`,
        ogType: "website",
        canonicalUrl: `${baseUrl}/tournaments/${id}`,
        robots: "index, follow",
        structuredDataJson: JSON.stringify(sportsEventSchema),
        schemaType: "SportsEvent",
        ogImageDynamic: true,
        ogImageTemplate: "tournament",
      });
    });

    await invalidateTournamentCache(id);

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (err) {
    console.error("[API/admin/tournaments] POST:", err);
    return NextResponse.json({ error: "Failed to create tournament" }, { status: 500 });
  }
}
