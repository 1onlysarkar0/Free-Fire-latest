import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { authPageContent } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CACHE_TAGS, invalidatePublicCache } from "@/lib/cache";
import { z } from "zod";

const updateSchema = z.object({
  quote: z.string().trim().min(1).max(2_000),
  subtext: z.string().trim().min(1).max(2_000),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOrRole(request, "auth_content:edit");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid auth page content" }, { status: 400 });
  const { quote, subtext } = parsed.data;

  await db.update(authPageContent)
    .set({ quote, subtext, updatedAt: new Date() })
    .where(eq(authPageContent.id, id));
  invalidatePublicCache({ tags: [CACHE_TAGS.authContent], paths: [`/${id}`] });

  return Response.json({ ok: true });
}
