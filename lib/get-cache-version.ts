import "server-only";
import { db } from "@/db/drizzle";
import { siteConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCacheVersion(): Promise<string> {
  try {
    const [config] = await db
      .select({ cacheVersion: siteConfig.cacheVersion })
      .from(siteConfig)
      .where(eq(siteConfig.id, "default"))
      .limit(1);
    return config?.cacheVersion ?? "";
  } catch {
    return "";
  }
}
