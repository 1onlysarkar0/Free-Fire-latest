import { NextRequest, NextResponse, after } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { tournament, tournamentSlot, seoConfig, siteConfig } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { invalidateTournamentCache } from "@/lib/cache";
import { getSiteUrl } from "@/lib/site-url";
import { submitUrlForIndexing } from "@/lib/indexing";
import { buildTournamentMeta, buildTournamentSportsEventSchema } from "@/lib/seo/tournament";

// Give Vercel serverless functions 30 seconds to handle large slot inserts + DB transactions
export const maxDuration = 30;

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
    const parsedJoiningFee = Math.max(0, parseInt(joiningFee) || 0);
    const parsedPrizePool = Math.max(0, parseInt(prizePool) || 0);
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

    // Resolve site URL once before the transaction to avoid duplicate DB round-trips
    const baseUrl =
      (await getSiteUrl()) ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "https://www.1onlysarkar.shop";

    await db.transaction(async (tx) => {
      await tx.insert(tournament).values({
        id,
        name: name.trim(),
        type: type.toUpperCase(),
        joiningFee: parsedJoiningFee,
        prizePool: parsedPrizePool,
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
      const siteName = configRow?.logoTitle || "1OnlySarkar";

      const tournamentSeoInput = {
        id,
        name: name.trim(),
        type: type.toUpperCase(),
        joiningFee: parsedJoiningFee,
        prizePool: parsedPrizePool,
        gameMode,
        teamFormat,
        totalSlots: slotRecordCount,
        startTime: new Date(startTime),
        status: "UPCOMING",
        availableSlots: slotRecordCount,
        siteName,
        baseUrl,
        logoSrc: configRow?.logoSrc || "/assets/logo.svg",
      };
      const { metaTitle, metaDescription } = buildTournamentMeta(tournamentSeoInput);
      const sportsEventSchema = buildTournamentSportsEventSchema(tournamentSeoInput);

      await tx.insert(seoConfig).values({
        id: `tournament-${id}`,
        metaTitle,
        metaDescription,
        ogTitle: name.trim(),
        ogDescription: metaDescription,
        ogImage: `/api/og-image?tournament=${id}`,
        ogType: "website",
        canonicalUrl: `${baseUrl}/tournaments/${id}`,
        robots: "index, follow, max-image-preview:large",
        structuredDataJson: JSON.stringify(sportsEventSchema),
        schemaType: "SportsEvent",
        ogImageDynamic: true,
        ogImageTemplate: "tournament",
      });
    });

    // Defer cache invalidation and search engine indexing to AFTER the response is sent.
    // This prevents these operations from blocking the client response or causing Vercel
    // serverless timeouts. `after()` is the correct Next.js pattern for post-response work.
    after(async () => {
      try {
        await invalidateTournamentCache(id);
      } catch (e) {
        console.error("[after] invalidateTournamentCache failed:", e);
      }
      try {
        await submitUrlForIndexing(`${baseUrl}/tournaments/${id}`, "URL_UPDATED");
      } catch (e) {
        console.error("[after] submitUrlForIndexing failed:", e);
      }
    });

    return NextResponse.json({ success: true, id, message: "Tournament created successfully" }, { status: 201 });
  } catch (err) {
    console.error("[API/admin/tournaments] POST:", err);
    return NextResponse.json({ error: "Failed to create tournament" }, { status: 500 });
  }
}
