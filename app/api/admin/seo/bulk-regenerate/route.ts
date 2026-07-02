import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { tournament, seoConfig, siteConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auditSeo } from "@/lib/seo/audit";

export async function POST(request: Request) {
  const admin = await requireAdminOrRole(request, "seo:edit");
  if (admin instanceof Response) return admin;

  try {
    const [configRow] = await db.select().from(siteConfig).limit(1);
    const siteName = configRow?.logoTitle;
    if (!siteName) throw new Error("Site name configuration not found in database");

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) throw new Error("NEXT_PUBLIC_APP_URL environment variable is required");

    const tournaments = await db.select().from(tournament);

    let regeneratedCount = 0;

    for (const t of tournaments) {
      const metaTitle = `${t.name} — ${siteName}`;
      const metaDescription = `Join ${t.name}. ${t.type.toUpperCase() === "FREE" ? "Free entry" : `Entry fee: ₹${t.joiningFee}`}. Prize pool: ₹${t.prizePool}. ${t.gameMode.replace(/_/g, " ")} mode. ${t.teamFormat.toUpperCase()} format. Register now!`;

      const sportsEventSchema = {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        "name": t.name,
        "description": metaDescription,
        "url": `${baseUrl}/tournaments/${t.id}`,
        "startDate": t.startTime.toISOString(),
        "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
        "location": {
          "@type": "VirtualLocation",
          "url": `${baseUrl}/tournaments/${t.id}`
        },
        "offers": {
          "@type": "Offer",
          "price": t.joiningFee ?? 0,
          "priceCurrency": "INR",
          "availability": "https://schema.org/InStock"
        }
      };

      const seoId = `tournament-${t.id}`;

      // Upsert seo_config
      await db.insert(seoConfig).values({
        id: seoId,
        metaTitle,
        metaDescription,
        ogTitle: t.name,
        ogDescription: metaDescription,
        ogImage: `/api/og-image?tournament=${t.id}`,
        ogType: "website",
        canonicalUrl: `${baseUrl}/tournaments/${t.id}`,
        robots: "index, follow",
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
          canonicalUrl: `${baseUrl}/tournaments/${t.id}`,
          structuredDataJson: JSON.stringify(sportsEventSchema),
          schemaType: "SportsEvent",
          ogImageDynamic: true,
          ogImageTemplate: "tournament",
          updatedAt: new Date(),
        }
      });

      // Update tournament linking if not linked
      if (t.seoConfigId !== seoId) {
        await db.update(tournament).set({
          seoConfigId: seoId,
          updatedAt: new Date(),
        }).where(eq(tournament.id, t.id));
      }

      // Run audit to populate initial score
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
