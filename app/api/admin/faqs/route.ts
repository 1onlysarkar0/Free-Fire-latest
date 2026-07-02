import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { faq } from "@/db/schema";
import { asc, sql } from "drizzle-orm";
import { CACHE_TAGS, invalidatePublicCache } from "@/lib/cache";

export async function GET(request: Request) {
  const admin = await requireAdminOrRole(request, "pages:view");
  if (admin instanceof Response) return admin;

  const faqs = await db.select().from(faq).orderBy(asc(faq.order));
  return Response.json(faqs);
}

export async function POST(request: Request) {
  const admin = await requireAdminOrRole(request, "pages:create");
  if (admin instanceof Response) return admin;

  const body = await request.json();
  const { question, answer, order } = body;

  if (!question || !answer) {
    return Response.json({ error: "question and answer are required" }, { status: 400 });
  }

  const id = `faq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  
  // Calculate next order weight if not provided
  let finalOrder = typeof order === "number" ? order : 0;
  if (typeof order !== "number") {
    const [maxRow] = await db.select({ maxOrder: sql<number>`max(${faq.order})` }).from(faq);
    finalOrder = (maxRow?.maxOrder ?? 0) + 1;
  }

  const [created] = await db.insert(faq).values({
    id,
    question: String(question).trim(),
    answer: String(answer).trim(),
    order: finalOrder,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  await invalidatePublicCache({
    tags: [CACHE_TAGS.pages, CACHE_TAGS.seo],
    paths: ["/faq", "/sitemap.xml"],
  });

  return Response.json(created, { status: 201 });
}
