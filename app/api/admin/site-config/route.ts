import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { siteConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CACHE_TAGS, invalidatePublicCache } from "@/lib/cache";

const FIELD_PERMISSIONS: Record<string, string> = {
  logoUrl: "site_config:edit_branding",
  logoSrc: "site_config:edit_branding",
  logoAlt: "site_config:edit_branding",
  logoTitle: "site_config:edit_branding",
  authLoginText: "site_config:edit_auth",
  authLoginUrl: "site_config:edit_auth",
  authSignupText: "site_config:edit_auth",
  authSignupUrl: "site_config:edit_auth",
  authPanelImageUrl: "site_config:edit_auth",
  authPanelColor: "site_config:edit_auth",
  copyrightText: "site_config:edit_footer",
  heroHeadline: "site_config:edit_hero",
  heroSubheadline: "site_config:edit_hero",
  heroCtaPrimaryText: "site_config:edit_hero",
  heroCtaPrimaryUrl: "site_config:edit_hero",
  heroCtaSecondaryText: "site_config:edit_hero",
  heroCtaSecondaryUrl: "site_config:edit_hero",
  heroBadgeText: "site_config:edit_hero",
  heroBadgeUrl: "site_config:edit_hero",
  contactEmail: "site_config:edit_contact",
  companyAddress: "site_config:edit_contact",
  jurisdictionName: "site_config:edit_contact",
};

export async function GET(request: Request) {
  const admin = await requireAdminOrRole(request, "site_config:view");
  if (admin instanceof Response) return admin;

  const [row] = await db.select().from(siteConfig).where(eq(siteConfig.id, "default")).limit(1);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(row);
}

import { siteConfigSchema } from "@/lib/schemas/admin";

export async function PUT(request: Request) {
  const admin = await requireAdminOrRole(request);
  if (admin instanceof Response) return admin;

  const body = await request.json();
  const parsed = siteConfigSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const validatedData = parsed.data;

  const allowed = [
    "logoUrl","logoSrc","logoAlt","logoTitle",
    "authLoginText","authLoginUrl","authSignupText","authSignupUrl",
    "authPanelImageUrl","authPanelColor","copyrightText",
    "heroHeadline","heroSubheadline",
    "heroCtaPrimaryText","heroCtaPrimaryUrl",
    "heroCtaSecondaryText","heroCtaSecondaryUrl",
    "heroBadgeText","heroBadgeUrl",
    "contactEmail","companyAddress","jurisdictionName",
    "adminSlug",
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (!(key in validatedData)) continue;
    if (key === "adminSlug") {
      if (!admin.isAdmin) {
        return Response.json({ error: "Only a superadmin can change the admin panel slug" }, { status: 403 });
      }
    } else {
      const permission = FIELD_PERMISSIONS[key];
      if (permission && !admin.isAdmin && !admin.permissions.includes(permission)) {
        return Response.json({ error: `Forbidden: missing permission "${permission}"` }, { status: 403 });
      }
    }
    update[key] = validatedData[key as keyof typeof validatedData] ?? null;
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.update(siteConfig).set(update as any).where(eq(siteConfig.id, "default"));
  await invalidatePublicCache({
    tags: [CACHE_TAGS.siteConfig, CACHE_TAGS.navigation, CACHE_TAGS.seo],
    paths: ["/", "/sign-in", "/sign-up", "/dashboard"],
  });
  return Response.json({ ok: true });
}
