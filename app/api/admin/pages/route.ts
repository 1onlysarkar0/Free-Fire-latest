import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { customPage } from "@/db/schema";
import { desc } from "drizzle-orm";
import { CACHE_TAGS, invalidatePublicCache } from "@/lib/cache";

export async function GET(request: Request) {
  const admin = await requireAdminOrRole(request, "pages:view");
  if (admin instanceof Response) return admin;

  const pages = await db.select().from(customPage).orderBy(desc(customPage.updatedAt));
  return Response.json(pages);
}

export async function POST(request: Request) {
  const admin = await requireAdminOrRole(request, "pages:create");
  if (admin instanceof Response) return admin;

  const body = await request.json();
  const { title, slug, content, status, metaTitle, metaDescription, metaKeywords, ogImage, robots } = body;

  if (!title || !slug) {
    return Response.json({ error: "title and slug are required" }, { status: 400 });
  }

  const id = `page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const cleanSlug = String(slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

  try {
    const [created] = await db.insert(customPage).values({
      id,
      title: String(title).trim(),
      slug: cleanSlug,
      content: content || "",
      status: status === "published" ? "published" : "draft",
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      metaKeywords: metaKeywords || null,
      ogImage: ogImage || null,
      robots: robots || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    await invalidatePublicCache({
      tags: [CACHE_TAGS.pages, CACHE_TAGS.seo],
      paths: [`/${cleanSlug}`, "/sitemap.xml"],
    });

    return Response.json(created, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as { code: string }).code === "23505") {
      return Response.json({ error: "A page with this slug already exists." }, { status: 409 });
    }
    throw err;
  }
}
