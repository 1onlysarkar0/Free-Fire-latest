import { requireAdminOrRole } from "@/lib/admin-auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";
import { db } from "@/db/drizzle";
import { siteConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  const admin = await requireAdminOrRole(request);
  if (admin instanceof Response) return admin;

  const hasConfigEdit = admin.isAdmin || admin.permissions.some(p => p.startsWith("site_config:edit"));
  if (!hasConfigEdit) {
    return Response.json({ error: "Forbidden: missing permission to purge cache" }, { status: 403 });
  }

  try {
    // ── 1. Bump the global cache version token in the DB ─────────────────────
    // This is the KEY mechanism: every client browser checks this value on
    // each page load. When it changes, they clear all local caches and reload.
    const newVersion = Date.now().toString();
    await db
      .update(siteConfig)
      .set({ cacheVersion: newVersion })
      .where(eq(siteConfig.id, "default"));

    // ── 2. Invalidate all Next.js server-side cache tags ─────────────────────
    Object.values(CACHE_TAGS).forEach((tag) => {
      try {
        revalidateTag(tag, { expire: 0 });
      } catch (err) {
        console.error(`Failed to revalidate tag ${tag}:`, err);
      }
    });

    // ── 3. Revalidate the entire App Router path layout cache ─────────────────
    revalidatePath("/", "layout");

    // ── 4. Physically delete Next.js incremental cache & image cache ────────
    try {
      const cacheDir = path.join(process.cwd(), ".next", "cache");
      if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true });
        console.log("✓ Deleted .next/cache directory");
      }
      // Explicitly nuke the Next.js image optimization cache
      const imgCacheDir = path.join(process.cwd(), ".next", "cache", "images");
      if (fs.existsSync(imgCacheDir)) {
        fs.rmSync(imgCacheDir, { recursive: true, force: true });
        console.log("✓ Deleted .next/cache/images directory");
      }
    } catch (e) {
      console.error("Failed to delete .next/cache folder:", e);
    }


    console.log(`✓ Cache version bumped to: ${newVersion}`);

    return Response.json(
      {
        ok: true,
        version: newVersion,
        message:
          "Server cache purged. All users will receive a fresh cache on their next page load.",
      },
      {
        status: 200,
        headers: {
          // Clear this admin's own browser cache immediately too
          "Clear-Site-Data": '"cache", "storage"',
        },
      }
    );
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Failed to purge cache" },
      { status: 500 }
    );
  }
}
