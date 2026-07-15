import "server-only";
import { db } from "@/db/drizzle";
import { siteConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";

export async function getSharedSiteConfig() {
  "use cache";
  cacheLife("minutes");
  cacheTag(CACHE_TAGS.siteConfig, "shared-site-config");
  const [config] = await db
    .select()
    .from(siteConfig)
    .where(eq(siteConfig.id, "default"))
    .limit(1);
  return config || null;
}
