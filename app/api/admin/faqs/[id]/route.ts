import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { faq } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CACHE_TAGS, invalidatePublicCache } from "@/lib/cache";
import { submitUrlForIndexing } from "@/lib/indexing";
import { getSiteUrl } from "@/lib/site-url";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdminOrRole(request, "pages:edit");
  if (admin instanceof Response) return admin;

  const body = await request.json();
  const { question, answer, order } = body;

  const updateFields: Partial<typeof faq.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (question !== undefined) updateFields.question = String(question).trim();
  if (answer !== undefined) updateFields.answer = String(answer).trim();
  if (order !== undefined) updateFields.order = Number(order);

  const [updated] = await db
    .update(faq)
    .set(updateFields)
    .where(eq(faq.id, id))
    .returning();

  if (!updated) {
    return Response.json({ error: "FAQ not found" }, { status: 404 });
  }

  await invalidatePublicCache({
    tags: [CACHE_TAGS.pages, CACHE_TAGS.seo],
    paths: ["/faq", "/sitemap.xml"],
  });

  const siteUrl = await getSiteUrl();
  submitUrlForIndexing(`${siteUrl}/faq`, "URL_UPDATED").catch(console.error);

  return Response.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdminOrRole(request, "pages:delete");
  if (admin instanceof Response) return admin;

  const [deleted] = await db
    .delete(faq)
    .where(eq(faq.id, id))
    .returning();

  if (!deleted) {
    return Response.json({ error: "FAQ not found" }, { status: 404 });
  }

  await invalidatePublicCache({
    tags: [CACHE_TAGS.pages, CACHE_TAGS.seo],
    paths: ["/faq", "/sitemap.xml"],
  });

  const siteUrl = await getSiteUrl();
  submitUrlForIndexing(`${siteUrl}/faq`, "URL_UPDATED").catch(console.error);

  return Response.json({ ok: true });
}
