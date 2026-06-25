import type { MetadataRoute } from "next";
import { db } from "@/db/drizzle";
import { customPage, tournament } from "@/db/schema";
import { eq, ne } from "drizzle-orm";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ("http://local" + "host:3000");
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/tournaments`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
  ];

  try {
    const [pages, tournaments] = await Promise.all([
      db
        .select({ slug: customPage.slug, updatedAt: customPage.updatedAt })
        .from(customPage)
        .where(eq(customPage.status, "published")),
      db
        .select({ id: tournament.id, updatedAt: tournament.updatedAt })
        .from(tournament)
        .where(ne(tournament.status, "CANCELLED")),
    ]);

    return [
      ...staticRoutes,
    ...pages.map((page) => ({
      url: `${baseUrl}/${page.slug}`,
      lastModified: page.updatedAt ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...tournaments.map((item) => ({
      url: `${baseUrl}/tournaments/${item.id}`,
      lastModified: item.updatedAt ?? now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ];
  } catch {
    return staticRoutes;
  }
}
