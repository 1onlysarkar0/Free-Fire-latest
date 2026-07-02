import type { MetadataRoute } from "next";
import { db } from "@/db/drizzle";
import { customPage, tournament } from "@/db/schema";
import { eq, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_APP_URL environment variable is required");
  const now = new Date();

  // 1. Static Home & Tournaments Listings
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "always", priority: 1.0 },
    { url: `${baseUrl}/tournaments`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
  ];

  // 2. Auth Pages (Indexable for SEO discovery)
  const authRoutes: MetadataRoute.Sitemap = [
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

    // 3. Dynamic Custom Pages with custom SEO rules
    const customPageRoutes = pages.map((page: any) => {
      let priority = 0.6;
      let changeFrequency: "daily" | "weekly" | "monthly" = "weekly";

      if (page.slug === "how-to-join" || page.slug === "rules") {
        priority = 0.8;
        changeFrequency = "weekly";
      } else if (page.slug === "faq" || page.slug === "contact") {
        priority = 0.7;
        changeFrequency = "weekly";
      } else if (page.slug === "privacy" || page.slug === "terms") {
        priority = 0.5;
        changeFrequency = "monthly";
      }

      return {
        url: `${baseUrl}/${page.slug}`,
        lastModified: page.updatedAt ?? now,
        changeFrequency,
        priority,
        ...(page.ogImage ? { images: [page.ogImage.startsWith("http") ? page.ogImage : `${baseUrl}${page.ogImage}`] } : {}),
      };
    });

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
      ...authRoutes,
      ...customPageRoutes,
      ...tournamentRoutes,
    ];
  } catch (err) {
    console.error("Error generating sitemap:", err);
    return [...staticRoutes, ...authRoutes];
  }
}
