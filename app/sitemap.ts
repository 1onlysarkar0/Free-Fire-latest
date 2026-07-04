import type { MetadataRoute } from "next";
import { db } from "@/db/drizzle";
import { customPage, tournament } from "@/db/schema";
import { eq, ne } from "drizzle-orm";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getSiteUrl() || process.env.NEXT_PUBLIC_APP_URL || "";
  const now = new Date();

  // 1. Static Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "always", priority: 1.0 },
    { url: `${baseUrl}/tournaments`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${baseUrl}/faq`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/how-to-join`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/rules`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/sign-in`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/sign-up`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/forgot-password`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    const [pages, tournaments] = await Promise.all([
      db
        .select({ slug: customPage.slug, updatedAt: customPage.updatedAt })
        .from(customPage)
        .where(eq(customPage.status, "published")),
      db
        .select({ id: tournament.id, status: tournament.status, updatedAt: tournament.updatedAt })
        .from(tournament)
        .where(ne(tournament.status, "CANCELLED")),
    ]);

    // 3. Additional Custom Pages (beyond known static ones above)
    const knownStatic = new Set(["faq","how-to-join","contact","rules","privacy","terms","sign-in","sign-up","forgot-password"]);
    const extraPages = pages.filter(p => !knownStatic.has(p.slug));

    const customPageRoutes = extraPages.map((page) => ({
      url: `${baseUrl}/${page.slug}`,
      lastModified: page.updatedAt ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    // 4. Dynamic Tournaments (Active tournaments have higher priority and frequent crawling)
    const tournamentRoutes = tournaments.map((item) => {
      const isLiveOrUpcoming = ["UPCOMING", "ROOM_REVEALED", "LIVE", "ACTIVE"].includes(item.status);
      const priority = isLiveOrUpcoming ? 0.9 : 0.6;
      const changeFrequency = isLiveOrUpcoming ? ("hourly" as const) : ("monthly" as const);

      return {
        url: `${baseUrl}/tournaments/${item.id}`,
        lastModified: item.updatedAt ?? now,
        changeFrequency,
        priority,
        images: [`${baseUrl}/api/og-image?tournament=${item.id}`],
      };
    });

    return [
      ...staticRoutes,
      ...customPageRoutes,
      ...tournamentRoutes,
    ];
  } catch (err) {
    console.error("Error generating sitemap:", err);
    return [...staticRoutes];
  }
}
