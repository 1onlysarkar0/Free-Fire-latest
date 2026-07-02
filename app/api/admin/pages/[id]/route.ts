import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { customPage, seoConfig } from "@/db/schema";
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
      .select()
      .from(customPage)
      .where(eq(customPage.id, id))
      .limit(1);
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

    await db.update(customPage).set(update).where(eq(customPage.id, id));

    // Fetch updated row to sync
    const [updatedRow] = await db
      .select()
      .from(customPage)
      .where(eq(customPage.id, id))
      .limit(1);

    if (updatedRow && updatedRow.status === "published") {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!baseUrl) throw new Error("NEXT_PUBLIC_APP_URL environment variable is required");
      
      // If slug changed, delete the old seoConfig row
      if (existing.slug !== updatedRow.slug) {
        await db.delete(seoConfig).where(eq(seoConfig.id, `page-${existing.slug}`));
      }

      await db.insert(seoConfig).values({
        id: `page-${updatedRow.slug}`,
        metaTitle: updatedRow.metaTitle || updatedRow.title,
        metaDescription: updatedRow.metaDescription || null,
        metaKeywords: updatedRow.metaKeywords || null,
        ogTitle: updatedRow.metaTitle || updatedRow.title,
        ogDescription: updatedRow.metaDescription || null,
        ogImage: updatedRow.ogImage || null,
        ogType: "website",
        canonicalUrl: `${baseUrl}/${updatedRow.slug}`,
        robots: updatedRow.robots || "index, follow",
        schemaType: "WebPage",
        ogImageDynamic: false,
      }).onConflictDoUpdate({
        target: seoConfig.id,
        set: {
          metaTitle: updatedRow.metaTitle || updatedRow.title,
          metaDescription: updatedRow.metaDescription || null,
          metaKeywords: updatedRow.metaKeywords || null,
          ogTitle: updatedRow.metaTitle || updatedRow.title,
          ogDescription: updatedRow.metaDescription || null,
          ogImage: updatedRow.ogImage || null,
          canonicalUrl: `${baseUrl}/${updatedRow.slug}`,
          robots: updatedRow.robots || "index, follow",
          updatedAt: new Date(),
        }
      });
    } else if (updatedRow && updatedRow.status !== "published") {
      // If changed to draft, remove it from seoConfig
      await db.delete(seoConfig).where(eq(seoConfig.id, `page-${updatedRow.slug}`));
    }

    await invalidatePublicCache({
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
