import { requireAdminOrRole } from "@/lib/admin-auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  const admin = await requireAdminOrRole(request);
  if (admin instanceof Response) return admin;

  try {
    // 1. Physically delete Next.js incremental cache folder (.next/cache) on server
    try {
      const cacheDir = path.join(process.cwd(), ".next", "cache");
      if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true });
        console.log("✓ Programmatically deleted .next/cache directory");
      }
    } catch (e) {
      console.error("Failed to delete .next/cache folder programmatically:", e);
    }

    // 2. Invalidate all standard cache tags
    Object.values(CACHE_TAGS).forEach((tag) => {
      try {
        revalidateTag(tag, { expire: 0 });
      } catch (err) {
        console.error(`Failed to revalidate tag ${tag}:`, err);
      }
    });

    // 3. Revalidate the entire App Router path layout cache
    revalidatePath("/", "layout");

    // 4. Respond to client and instruct browser to clear local caches
    return new Response(
      JSON.stringify({ ok: true, message: "Server and browser caches purged successfully" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Clear-Site-Data": '"cache"',
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
