import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/db/drizzle";
import { siteConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

export const CACHE_TAGS = {
  siteConfig: "site-config",
  navigation: "navigation",
  authContent: "auth-content",
  seo: "seo",
  pages: "pages",
  tournaments: "tournaments",
  topPlayers: "top-players",
} as const;

export function tournamentCacheTag(id: string) {
  return `tournament:${id}`;
}

export async function invalidatePublicCache({
  tags,
  paths = [],
}: {
  tags: string[];
  paths?: string[];
}) {
  for (const tag of new Set(tags)) revalidateTag(tag, { expire: 0 });
  for (const path of new Set(paths)) revalidatePath(path);

  try {
    revalidatePath("/[dynamicSlug]", "layout");
    const [config] = await db
      .select({ adminSlug: siteConfig.adminSlug })
      .from(siteConfig)
      .where(eq(siteConfig.id, "default"))
      .limit(1);
    if (config?.adminSlug) {
      revalidatePath(`/${config.adminSlug}`, "layout");
    }
  } catch (e) {
    console.error("Failed to invalidate admin cache in invalidatePublicCache:", e);
  }
}

export async function invalidateTournamentCache(id?: string) {
  await invalidatePublicCache({
    tags: [CACHE_TAGS.tournaments, ...(id ? [tournamentCacheTag(id)] : [])],
    paths: ["/", "/tournaments", ...(id ? [`/tournaments/${id}`] : []), "/sitemap.xml"],
  });
}

export async function invalidateAdminCache() {
  try {
    revalidatePath("/[dynamicSlug]", "layout");
    const [config] = await db
      .select({ adminSlug: siteConfig.adminSlug })
      .from(siteConfig)
      .where(eq(siteConfig.id, "default"))
      .limit(1);
    if (config?.adminSlug) {
      revalidatePath(`/${config.adminSlug}`, "layout");
    }
    revalidatePath("/dashboard", "layout");
  } catch (e) {
    console.error("Failed to invalidate admin cache in invalidateAdminCache:", e);
  }
}
