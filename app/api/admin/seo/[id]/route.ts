import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { seoConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CACHE_TAGS, invalidatePublicCache } from "@/lib/cache";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOrRole(request, "seo:view");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  const [row] = await db.select().from(seoConfig).where(eq(seoConfig.id, id)).limit(1);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(row);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOrRole(request, "seo:edit");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  const body = await request.json();

  const allowed = ["metaTitle","metaDescription","metaKeywords","ogTitle","ogDescription","ogImage","ogType","twitterCard","twitterSite","twitterTitle","twitterDescription","twitterImage","canonicalUrl","robots","structuredDataJson"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = { updatedAt: new Date() };
  for (const k of allowed) {
    if (k in body) update[k] = body[k] ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.update(seoConfig).set(update as any).where(eq(seoConfig.id, id));
  await invalidatePublicCache({ tags: [CACHE_TAGS.seo], paths: ["/", `/${id}`, "/sitemap.xml"] });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOrRole(request, "seo:delete");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  if (id === "global") return Response.json({ error: "Cannot delete global SEO config" }, { status: 400 });
  await db.delete(seoConfig).where(eq(seoConfig.id, id));
  await invalidatePublicCache({ tags: [CACHE_TAGS.seo], paths: ["/", `/${id}`, "/sitemap.xml"] });
  return Response.json({ ok: true });
}
