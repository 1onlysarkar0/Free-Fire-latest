import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { tournament, seoConfig, siteConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auditSeo } from "@/lib/seo/audit";
import { getSiteUrl } from "@/lib/site-url";
import { buildTournamentMeta, buildTournamentSportsEventSchema } from "@/lib/seo/tournament";

export async function POST(request: Request) {
  const admin = await requireAdminOrRole(request, "seo:edit");
  if (admin instanceof Response) return admin;

  try {
    const [[configRow], baseUrl] = await Promise.all([
      db.select().from(siteConfig).limit(1),
      getSiteUrl(),
    ]);

    const siteName = configRow?.logoTitle;
    if (!siteName) throw new Error("Site name configuration not found in database");
    if (!baseUrl) throw new Error("Site URL not configured in database");

    const tournaments = await db.select().from(tournament);

    let regeneratedCount = 0;

    for (const t of tournaments) {
      const tournamentSeoInput = {
        id: t.id,
        name: t.name,
        type: t.type,
        joiningFee: t.joiningFee,
        prizePool: t.prizePool,
        gameMode: t.gameMode,
        teamFormat: t.teamFormat,
        totalSlots: t.totalSlots,
        startTime: t.startTime,
        status: t.status,
        siteName,
        baseUrl,
        logoSrc: configRow.logoSrc,
      };
      const { metaTitle, metaDescription } = buildTournamentMeta(tournamentSeoInput);
      const sportsEventSchema = buildTournamentSportsEventSchema(tournamentSeoInput);

      const seoId = `tournament-${t.id}`;

      await db.insert(seoConfig).values({
        id: seoId,
        metaTitle,
        metaDescription,
        ogTitle: t.name,
        ogDescription: metaDescription,
        ogImage: `/api/og-image?tournament=${t.id}`,
        ogType: "website",
        twitterCard: "summary_large_image",
        twitterSite: "@1onlysarkar",
        twitterTitle: t.name,
        twitterDescription: metaDescription,
        twitterImage: `/api/og-image?tournament=${t.id}`,
        canonicalUrl: `${baseUrl}/tournaments/${t.id}`,
        robots: "index, follow, max-image-preview:large",
        structuredDataJson: JSON.stringify(sportsEventSchema),
        schemaType: "SportsEvent",
        ogImageDynamic: true,
        ogImageTemplate: "tournament",
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: seoConfig.id,
        set: {
          metaTitle,
          metaDescription,
          ogTitle: t.name,
          ogDescription: metaDescription,
          ogImage: `/api/og-image?tournament=${t.id}`,
          twitterTitle: t.name,
          twitterDescription: metaDescription,
          twitterImage: `/api/og-image?tournament=${t.id}`,
          canonicalUrl: `${baseUrl}/tournaments/${t.id}`,
          robots: "index, follow, max-image-preview:large",
          structuredDataJson: JSON.stringify(sportsEventSchema),
          schemaType: "SportsEvent",
          ogImageDynamic: true,
          ogImageTemplate: "tournament",
          updatedAt: new Date(),
        }
      });

      if (t.seoConfigId !== seoId) {
        await db.update(tournament).set({
          seoConfigId: seoId,
          updatedAt: new Date(),
        }).where(eq(tournament.id, t.id));
      }

      const [row] = await db.select().from(seoConfig).where(eq(seoConfig.id, seoId)).limit(1);
      if (row) {
        const auditResult = auditSeo(seoId, row);
        await db.update(seoConfig).set({
          seoScore: auditResult.score,
          lastAudited: new Date(),
        }).where(eq(seoConfig.id, seoId));
      }

      regeneratedCount++;
    }

    return Response.json({ success: true, count: regeneratedCount });
  } catch (error: any) {
    console.error("Bulk SEO regeneration failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
