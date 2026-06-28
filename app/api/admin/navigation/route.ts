import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { navigationItem } from "@/db/schema";
import { CACHE_TAGS, invalidatePublicCache } from "@/lib/cache";

export async function GET(request: Request) {
  const admin = await requireAdminOrRole(request, "navigation:view");
  if (admin instanceof Response) return admin;

  const items = await db.select().from(navigationItem).orderBy(navigationItem.order);
  return Response.json(items);
}

import { navigationItemSchema } from "@/lib/schemas/admin";

export async function POST(request: Request) {
  const admin = await requireAdminOrRole(request, "navigation:create");
  if (admin instanceof Response) return admin;

  const body = await request.json();
  const parsed = navigationItemSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const { title, url, description, icon, parentId, order, isMobileExtra, isFooter, isSocial } = parsed.data;

  const id = `nav-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await db.insert(navigationItem).values({
    id, title, url,
    description: description ?? null,
    icon: icon ?? null,
    parentId: parentId ?? null,
    order: order ?? 0,
    isMobileExtra: isMobileExtra ?? false,
    isFooter: isFooter ?? false,
    isSocial: isSocial ?? false,
  });
  await invalidatePublicCache({ tags: [CACHE_TAGS.navigation], paths: ["/"] });
  return Response.json({ ok: true, id });
}
