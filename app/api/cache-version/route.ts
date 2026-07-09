import { db } from "@/db/drizzle";
import { siteConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Public endpoint — no auth required.
 * Returns the current global cache version token from the DB.
 * The CacheBuster client component polls this on every page mount
 * to detect if a cache purge has been triggered by the admin.
 */
export async function GET() {
  try {
    const [config] = await db
      .select({ cacheVersion: siteConfig.cacheVersion })
      .from(siteConfig)
      .where(eq(siteConfig.id, "default"))
      .limit(1);

    const version = config?.cacheVersion ?? "1";

    return Response.json(
      { version },
      {
        status: 200,
        headers: {
          // Never cache this endpoint — it must always return the live value
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch {
    return Response.json({ version: "1" }, { status: 200 });
  }
}
