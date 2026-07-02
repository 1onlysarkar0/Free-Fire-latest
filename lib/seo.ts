import "server-only";
import { db } from "@/db/drizzle";
import { seoConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { cache } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface SeoData {
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogType: string | null;
  twitterCard: string | null;
  twitterSite: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  structuredDataJson: string | null;
  schemaType: string | null;
  schemaData: any | null;
  ogImageDynamic: boolean | null;
  ogImageTemplate: string | null;
  seoScore: number | null;
  lastAudited: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RAW FETCH (uncached)
// Merges a page-specific row with the "global" fallback.
// pageId: "global" | "home" | "sign-in" | "sign-up" | "dashboard" | etc.
// Any field that is null on the page row falls back to the global value.
// ─────────────────────────────────────────────────────────────────────────────

async function _fetchSeo(pageId: string): Promise<SeoData> {
  if (pageId === "global") {
    const rows = await db
      .select()
      .from(seoConfig)
      .where(eq(seoConfig.id, "global"))
      .limit(1);

    const row = rows[0] ?? null;
    return {
      metaTitle: row?.metaTitle ?? null,
      metaDescription: row?.metaDescription ?? null,
      metaKeywords: row?.metaKeywords ?? null,
      ogTitle: row?.ogTitle ?? null,
      ogDescription: row?.ogDescription ?? null,
      ogImage: row?.ogImage ?? null,
      ogType: row?.ogType ?? "website",
      twitterCard: row?.twitterCard ?? "summary_large_image",
      twitterSite: row?.twitterSite ?? null,
      twitterTitle: row?.twitterTitle ?? null,
      twitterDescription: row?.twitterDescription ?? null,
      twitterImage: row?.twitterImage ?? null,
      canonicalUrl: row?.canonicalUrl ?? null,
      robots: row?.robots ?? "index, follow",
      structuredDataJson: row?.structuredDataJson ?? null,
      schemaType: row?.schemaType ?? "WebPage",
      schemaData: row?.schemaData ?? null,
      ogImageDynamic: row?.ogImageDynamic ?? false,
      ogImageTemplate: row?.ogImageTemplate ?? null,
      seoScore: row?.seoScore ?? null,
      lastAudited: row?.lastAudited ? row.lastAudited.toISOString() : null,
    };
  }

  // Fetch global + page-specific in parallel then merge
  const [globalRows, pageRows] = await Promise.all([
    db.select().from(seoConfig).where(eq(seoConfig.id, "global")).limit(1),
    db.select().from(seoConfig).where(eq(seoConfig.id, pageId)).limit(1),
  ]);

  const g = globalRows[0] ?? null;
  const p = pageRows[0] ?? null;

  return {
    metaTitle: p?.metaTitle ?? g?.metaTitle ?? null,
    metaDescription: p?.metaDescription ?? g?.metaDescription ?? null,
    metaKeywords: p?.metaKeywords ?? g?.metaKeywords ?? null,
    ogTitle: p?.ogTitle ?? g?.ogTitle ?? null,
    ogDescription: p?.ogDescription ?? g?.ogDescription ?? null,
    ogImage: p?.ogImage ?? g?.ogImage ?? null,
    ogType: p?.ogType ?? g?.ogType ?? "website",
    twitterCard: p?.twitterCard ?? g?.twitterCard ?? "summary_large_image",
    twitterSite: p?.twitterSite ?? g?.twitterSite ?? null,
    twitterTitle: p?.twitterTitle ?? g?.twitterTitle ?? null,
    twitterDescription: p?.twitterDescription ?? g?.twitterDescription ?? null,
    twitterImage: p?.twitterImage ?? g?.twitterImage ?? null,
    canonicalUrl: p?.canonicalUrl ?? g?.canonicalUrl ?? null,
    robots: p?.robots ?? g?.robots ?? "index, follow",
    structuredDataJson: p?.structuredDataJson ?? g?.structuredDataJson ?? null,
    schemaType: p?.schemaType ?? g?.schemaType ?? "WebPage",
    schemaData: p?.schemaData ?? g?.schemaData ?? null,
    ogImageDynamic: p?.ogImageDynamic ?? g?.ogImageDynamic ?? false,
    ogImageTemplate: p?.ogImageTemplate ?? g?.ogImageTemplate ?? null,
    seoScore: p?.seoScore ?? g?.seoScore ?? null,
    lastAudited: p?.lastAudited ? p.lastAudited.toISOString() : g?.lastAudited ? g.lastAudited.toISOString() : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIRECT EXPORT (cached & request-memoized)
// ─────────────────────────────────────────────────────────────────────────────

export const getSeoData = cache((pageId: string) => {
  return _fetchSeo(pageId);
});

// ─────────────────────────────────────────────────────────────────────────────
// NEXT.JS METADATA BUILDER
// Converts SeoData into a Next.js Metadata object for use in generateMetadata.
// ─────────────────────────────────────────────────────────────────────────────

export function buildMetadata(
  seo: SeoData,
  siteUrl?: string,
  siteName?: string,
  logoSrc?: string
): Metadata {
  const metadata: Metadata = {};

  if (seo.metaTitle) metadata.title = seo.metaTitle;
  if (seo.metaDescription) metadata.description = seo.metaDescription;
  if (seo.metaKeywords) metadata.keywords = seo.metaKeywords;
  if (seo.robots) metadata.robots = seo.robots as Metadata["robots"];
  if (seo.canonicalUrl) metadata.alternates = { canonical: seo.canonicalUrl };

  const iconSrc = logoSrc || "/assets/logo.webp";
  metadata.manifest = "/assets/site.webmanifest";
  metadata.icons = {
    icon: [
      { url: iconSrc, type: "image/png" },
      { url: "/assets/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/assets/favicon.ico", sizes: "any" },
      { url: "/assets/favicon-dark.png", media: "(prefers-color-scheme: dark)", type: "image/png" },
    ],
    apple: [
      { url: "/assets/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };

  const base = siteUrl || process.env.NEXT_PUBLIC_APP_URL || "";
  let ogImageFallback = seo.ogImage || logoSrc || undefined;
  if (ogImageFallback && !ogImageFallback.startsWith("http") && base) {
    ogImageFallback = `${base}${ogImageFallback}`;
  }

  if (seo.ogImageDynamic && base) {
    if (seo.ogImageTemplate === "tournament") {
      const match = seo.canonicalUrl?.match(/\/tournaments\/([^/]+)/);
      const tournamentId = match?.[1];
      if (tournamentId) {
        ogImageFallback = `${base}/api/og-image?tournament=${tournamentId}`;
      }
    } else if (seo.ogImageTemplate === "auth") {
      let pageType = "sign-in";
      if (seo.canonicalUrl?.includes("sign-up")) pageType = "sign-up";
      else if (seo.canonicalUrl?.includes("forgot-password")) pageType = "forgot-password";
      else if (seo.canonicalUrl?.includes("reset-password")) pageType = "reset-password";
      ogImageFallback = `${base}/api/og-image?template=auth&page=${pageType}`;
    } else if (seo.ogImageTemplate === "custom-page") {
      // Extract slug from canonicalUrl for the OG route
      const slug = seo.canonicalUrl?.split("/").filter(Boolean).pop() || "";
      ogImageFallback = `${base}/api/og-image?template=custom-page&slug=${encodeURIComponent(slug)}`;
    } else if (seo.ogImageTemplate) {
      // Other templates (homepage, etc.) — the OG route fetches data from DB
      ogImageFallback = `${base}/api/og-image?template=${seo.ogImageTemplate}`;
    }
  }

  const twitterImageFallback = seo.twitterImage || ogImageFallback || undefined;

  // Open Graph
  if (seo.ogTitle || seo.ogDescription || ogImageFallback || siteName) {
    metadata.openGraph = {
      title: seo.ogTitle ?? seo.metaTitle ?? undefined,
      description: seo.ogDescription ?? seo.metaDescription ?? undefined,
      type: (seo.ogType ?? "website") as "website",
      url: seo.canonicalUrl ?? siteUrl,
      siteName: siteName ?? undefined,
      images: ogImageFallback
        ? [{ url: ogImageFallback, width: 1200, height: 630, alt: seo.ogTitle ?? siteName ?? "" }]
        : undefined,
    };
  }

  // Twitter / X Card
  if (seo.twitterCard || seo.twitterTitle || seo.twitterDescription || siteName) {
    metadata.twitter = {
      card: (seo.twitterCard ?? "summary_large_image") as "summary_large_image",
      site: seo.twitterSite ?? undefined,
      title: seo.twitterTitle ?? seo.ogTitle ?? undefined,
      description: seo.twitterDescription ?? seo.ogDescription ?? undefined,
      images: twitterImageFallback ? [twitterImageFallback] : undefined,
    };
  }

  return metadata;
}
