import "server-only";
import { db } from "@/db/drizzle";
import { siteConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";

export async function getSiteUrl(): Promise<string> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CACHE_TAGS.siteConfig, "site-url");
  try {
    const [config] = await db
      .select({ siteUrl: siteConfig.siteUrl })
      .from(siteConfig)
      .where(eq(siteConfig.id, "default"))
      .limit(1);
    if (config?.siteUrl) {
      return config.siteUrl.replace(/\/+$/, "");
    }
  } catch {}
  return "";
}

export function resolveUrl(path: string, baseUrl: string): string {
  if (!baseUrl) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = baseUrl.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
