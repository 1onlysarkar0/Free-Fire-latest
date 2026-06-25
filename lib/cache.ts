import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";

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

export function invalidatePublicCache({
  tags,
  paths = [],
}: {
  tags: string[];
  paths?: string[];
}) {
  for (const tag of new Set(tags)) revalidateTag(tag);
  for (const path of new Set(paths)) revalidatePath(path);
}

export function invalidateTournamentCache(id?: string) {
  invalidatePublicCache({
    tags: [CACHE_TAGS.tournaments, ...(id ? [tournamentCacheTag(id)] : [])],
    paths: ["/", "/tournaments", ...(id ? [`/tournaments/${id}`] : []), "/sitemap.xml"],
  });
}
