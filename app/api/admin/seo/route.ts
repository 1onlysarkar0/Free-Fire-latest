import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { seoConfig } from "@/db/schema";
import { CACHE_TAGS, invalidatePublicCache } from "@/lib/cache";

export async function GET(request: Request) {
  const admin = await requireAdminOrRole(request, "seo:view");
  if (admin instanceof Response) return admin;

  const rows = await db.select().from(seoConfig).orderBy(seoConfig.id);
  return Response.json(rows);
}

export async function POST(request: Request) {
  const admin = await requireAdminOrRole(request, "seo:create");
  if (admin instanceof Response) return admin;

  const body = await request.json();
  const { id, ...rest } = body;

  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const allowed = ["metaTitle","metaDescription","metaKeywords","ogTitle","ogDescription","ogImage","ogType","twitterCard","twitterSite","twitterTitle","twitterDescription","twitterImage","canonicalUrl","robots","structuredDataJson"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: Record<string, any> = { id };
  for (const k of allowed) {
    if (k in rest) values[k] = rest[k] ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.insert(seoConfig).values(values as any).onConflictDoNothing();
  invalidatePublicCache({ tags: [CACHE_TAGS.seo], paths: ["/", "/sitemap.xml"] });
  return Response.json({ ok: true });
}
