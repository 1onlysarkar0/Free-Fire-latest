import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { customPage } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CACHE_TAGS, invalidatePublicCache } from "@/lib/cache";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOrRole(request, "pages:view");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  const [page] = await db.select().from(customPage).where(eq(customPage.id, id)).limit(1);
  if (!page) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(page);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOrRole(request, "pages:edit");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  const body = await request.json();
  const { title, slug, content, status, metaTitle, metaDescription, metaKeywords, ogImage, robots } = body;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = { updatedAt: new Date() };
  if (title !== undefined) update.title = String(title).trim();
  if (slug !== undefined) update.slug = String(slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (content !== undefined) update.content = content;
  if (status !== undefined) update.status = status === "published" ? "published" : "draft";
  if (metaTitle !== undefined) update.metaTitle = metaTitle || null;
  if (metaDescription !== undefined) update.metaDescription = metaDescription || null;
  if (metaKeywords !== undefined) update.metaKeywords = metaKeywords || null;
  if (ogImage !== undefined) update.ogImage = ogImage || null;
  if (robots !== undefined) update.robots = robots || null;

  try {
    const [existing] = await db
      .select({ slug: customPage.slug })
      .from(customPage)
      .where(eq(customPage.id, id))
      .limit(1);
    await db.update(customPage).set(update).where(eq(customPage.id, id));
    invalidatePublicCache({
      tags: [CACHE_TAGS.pages, CACHE_TAGS.seo],
      paths: [existing ? `/${existing.slug}` : "/", update.slug ? `/${String(update.slug)}` : "/", "/sitemap.xml"],
    });
    return Response.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as { code: string }).code === "23505") {
      return Response.json({ error: "A page with this slug already exists." }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOrRole(request, "pages:delete");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  const [existing] = await db
    .select({ slug: customPage.slug })
    .from(customPage)
    .where(eq(customPage.id, id))
    .limit(1);
  await db.delete(customPage).where(eq(customPage.id, id));
  invalidatePublicCache({
    tags: [CACHE_TAGS.pages, CACHE_TAGS.seo],
    paths: [existing ? `/${existing.slug}` : "/", "/sitemap.xml"],
  });
  return Response.json({ ok: true });
}
