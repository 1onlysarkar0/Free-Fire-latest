// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

import { db } from "@/db/drizzle";
import { seoConfig, siteConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import SeoEditClient from "../[id]/_client";
import { requirePagePermission } from "@/lib/panel-auth";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

async function getSeoById(id: string) {
  const [row] = await db
    .select()
    .from(seoConfig)
    .where(eq(seoConfig.id, id))
    .limit(1);
  return row ?? null;
}

async function getSiteBranding() {
  // Fetch site name and canonical URL to prevent hardcoding in the client
  const [siteData] = await db
    .select({
      siteName: siteConfig.logoTitle,
    })
    .from(siteConfig)
    .where(eq(siteConfig.id, "default"))
    .limit(1);

  const [globalSeo] = await db
    .select({
      canonicalUrl: seoConfig.canonicalUrl,
    })
    .from(seoConfig)
    .where(eq(seoConfig.id, "global"))
    .limit(1);

  return {
    siteName: siteData?.siteName || "",
    siteUrl: globalSeo?.canonicalUrl || process.env.NEXT_PUBLIC_APP_URL || "",
  };
}

interface Props {
  params: Promise<{ dynamicSlug: string; id: string }>;
}

export default async function EditSeoPage({ params }: Props) {
  const { dynamicSlug, id } = await params;
  await requirePagePermission(dynamicSlug, "seo:edit");

  const [row, branding] = await Promise.all([
    getSeoById(id),
    getSiteBranding(),
  ]);

  if (!row) {
    notFound();
  }

  return (
    <SeoEditClient
      initialData={row}
      dynamicSlug={dynamicSlug}
      mode="edit"
      siteName={branding.siteName}
      siteUrl={branding.siteUrl}
    />
  );
}