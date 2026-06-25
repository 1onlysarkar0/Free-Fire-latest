import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { navigationItem } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CACHE_TAGS, invalidatePublicCache } from "@/lib/cache";

import { navigationItemSchema } from "@/lib/schemas/admin";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOrRole(request, "navigation:edit");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  const body = await request.json();
  const parsed = navigationItemSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const { title, url, description, icon, parentId, order, isMobileExtra, isFooter, isSocial } = parsed.data;

  await db.update(navigationItem).set({
    title, url,
    description: description ?? null,
    icon: icon ?? null,
    parentId: parentId ?? null,
    order: order ?? 0,
    isMobileExtra: isMobileExtra ?? false,
    isFooter: isFooter ?? false,
    isSocial: isSocial ?? false,
  }).where(eq(navigationItem.id, id));
  invalidatePublicCache({ tags: [CACHE_TAGS.navigation], paths: ["/"] });

  return Response.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOrRole(request, "navigation:delete");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  await db.delete(navigationItem).where(eq(navigationItem.id, id));
  invalidatePublicCache({ tags: [CACHE_TAGS.navigation], paths: ["/"] });
  return Response.json({ ok: true });
}
