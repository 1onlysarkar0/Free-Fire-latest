import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { customPage, seoConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CACHE_TAGS, invalidatePublicCache } from "@/lib/cache";
import { getSiteUrl } from "@/lib/site-url";

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
  const { slug, content, status } = body;

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (slug !== undefined) update.slug = String(slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (slug !== undefined) update.title = update.slug;
  if (content !== undefined) update.content = content;
  if (status !== undefined) update.status = status === "published" ? "published" : "draft";

  try {
    const [existing] = await db
      .select()
      .from(customPage)
      .where(eq(customPage.id, id))
      .limit(1);
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

    await db.update(customPage).set(update).where(eq(customPage.id, id));

    const [updatedRow] = await db
      .select()
      .from(customPage)
      .where(eq(customPage.id, id))
      .limit(1);

    if (updatedRow && updatedRow.status === "published") {
      if (existing.slug !== updatedRow.slug) {
        await db.delete(seoConfig).where(eq(seoConfig.id, `page-${existing.slug}`));
      }

      await db.insert(seoConfig).values({
        id: `page-${updatedRow.slug}`,
        metaTitle: updatedRow.slug,
        metaDescription: null,
        ogTitle: updatedRow.slug,
        ogImageDynamic: false,
      }).onConflictDoUpdate({
        target: seoConfig.id,
        set: {
          metaTitle: updatedRow.slug,
          updatedAt: new Date(),
        }
      });
    } else if (updatedRow && updatedRow.status !== "published") {
      await db.delete(seoConfig).where(eq(seoConfig.id, `page-${updatedRow.slug}`));
    }

    await invalidatePublicCache({
      tags: [CACHE_TAGS.pages, CACHE_TAGS.seo],
      paths: [existing ? `/${existing.slug}` : "/", slug ? `/${String(slug)}` : "/", "/sitemap.xml"],
    });
    return Response.json({ ok: true, seoConfigId: updatedRow ? `page-${updatedRow.slug}` : null });
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
  
  if (existing) {
    await db.delete(seoConfig).where(eq(seoConfig.id, `page-${existing.slug}`));
  }

  await db.delete(customPage).where(eq(customPage.id, id));
  await invalidatePublicCache({
    tags: [CACHE_TAGS.pages, CACHE_TAGS.seo],
    paths: [existing ? `/${existing.slug}` : "/", "/sitemap.xml"],
  });
  return Response.json({ ok: true });
}
