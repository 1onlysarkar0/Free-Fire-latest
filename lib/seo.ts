import "server-only";
import { db } from "@/db/drizzle";
import { seoConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { cache } from "react";

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

async function _fetchSeo(pageId: string): Promise<SeoData> {
  const [globalRows, pageRows] = await Promise.all([
    db.select().from(seoConfig).where(eq(seoConfig.id, "global")).limit(1),
    db.select().from(seoConfig).where(eq(seoConfig.id, pageId)).limit(1),
  ]);

  const g = globalRows[0] ?? null;
  const p = pageRows[0] ?? null;

  if (pageId === "global") {
    return {
      metaTitle: g?.metaTitle ?? null,
      metaDescription: g?.metaDescription ?? null,
      metaKeywords: g?.metaKeywords ?? null,
      ogTitle: g?.ogTitle ?? null,
      ogDescription: g?.ogDescription ?? null,
      ogImage: g?.ogImage ?? null,
      ogType: g?.ogType ?? null,
      twitterCard: g?.twitterCard ?? null,
      twitterSite: g?.twitterSite ?? null,
      twitterTitle: g?.twitterTitle ?? null,
      twitterDescription: g?.twitterDescription ?? null,
      twitterImage: g?.twitterImage ?? null,
      canonicalUrl: g?.canonicalUrl ?? null,
      robots: g?.robots ?? null,
      structuredDataJson: g?.structuredDataJson ?? null,
      schemaType: g?.schemaType ?? null,
      schemaData: g?.schemaData ?? null,
      ogImageDynamic: g?.ogImageDynamic ?? null,
      ogImageTemplate: g?.ogImageTemplate ?? null,
      seoScore: g?.seoScore ?? null,
      lastAudited: g?.lastAudited ? g.lastAudited.toISOString() : null,
    };
  }

  return {
    metaTitle: p?.metaTitle ?? g?.metaTitle ?? null,
    metaDescription: p?.metaDescription ?? g?.metaDescription ?? null,
    metaKeywords: p?.metaKeywords ?? g?.metaKeywords ?? null,
    ogTitle: p?.ogTitle ?? g?.ogTitle ?? null,
    ogDescription: p?.ogDescription ?? g?.ogDescription ?? null,
    ogImage: p?.ogImage ?? g?.ogImage ?? null,
    ogType: p?.ogType ?? g?.ogType ?? null,
    twitterCard: p?.twitterCard ?? g?.twitterCard ?? null,
    twitterSite: p?.twitterSite ?? g?.twitterSite ?? null,
    twitterTitle: p?.twitterTitle ?? g?.twitterTitle ?? null,
    twitterDescription: p?.twitterDescription ?? g?.twitterDescription ?? null,
    twitterImage: p?.twitterImage ?? g?.twitterImage ?? null,
    canonicalUrl: p?.canonicalUrl ?? g?.canonicalUrl ?? null,
    robots: p?.robots ?? g?.robots ?? null,
    structuredDataJson: p?.structuredDataJson ?? g?.structuredDataJson ?? null,
    schemaType: p?.schemaType ?? g?.schemaType ?? null,
    schemaData: p?.schemaData ?? g?.schemaData ?? null,
    ogImageDynamic: p?.ogImageDynamic ?? g?.ogImageDynamic ?? null,
    ogImageTemplate: p?.ogImageTemplate ?? g?.ogImageTemplate ?? null,
    seoScore: p?.seoScore ?? g?.seoScore ?? null,
    lastAudited: p?.lastAudited ? p.lastAudited.toISOString() : g?.lastAudited ? g.lastAudited.toISOString() : null,
  };
}

export const getSeoData = cache((pageId: string) => {
  return _fetchSeo(pageId);
});

export function buildMetadata(
  seo: SeoData,
  siteUrl?: string,
  siteName?: string,
  logoSrc?: string,
  locale?: string,
  path?: string
): Metadata {
  const metadata: Metadata = {};

  if (seo.metaTitle) metadata.title = seo.metaTitle;
  if (seo.metaDescription) metadata.description = seo.metaDescription;
  if (seo.metaKeywords) metadata.keywords = seo.metaKeywords;
  if (seo.robots) metadata.robots = seo.robots as Metadata["robots"];

  const base = siteUrl || "";

  // Dynamic canonical URL: manual override > dynamic from siteUrl + path
  const canonicalUrl = seo.canonicalUrl || (base && path ? `${base}${path}` : null);
  if (canonicalUrl) metadata.alternates = { canonical: canonicalUrl };

  const iconSrc = logoSrc;
  if (iconSrc) {
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
  }

  let ogImageFinal = seo.ogImage ?? null;
  if (ogImageFinal && !ogImageFinal.startsWith("http") && base) {
    ogImageFinal = `${base}${ogImageFinal}`;
  } else if (!ogImageFinal && seo.ogImageDynamic && base && seo.ogImageTemplate) {
    if (seo.ogImageTemplate === "tournament") {
      const match = canonicalUrl?.match(/\/tournaments\/([^/]+)/);
      const tournamentId = match?.[1];
      if (tournamentId) {
        ogImageFinal = `${base}/api/og-image?tournament=${tournamentId}`;
      }
    } else if (seo.ogImageTemplate === "auth") {
      let pageType = "sign-in";
      if (canonicalUrl?.includes("sign-up")) pageType = "sign-up";
      else if (canonicalUrl?.includes("forgot-password")) pageType = "forgot-password";
      else if (canonicalUrl?.includes("reset-password")) pageType = "reset-password";
      ogImageFinal = `${base}/api/og-image?template=auth&page=${pageType}`;
    } else if (seo.ogImageTemplate === "custom-page") {
      const slug = path?.split("/").filter(Boolean).pop() || "";
      ogImageFinal = `${base}/api/og-image?template=custom-page&slug=${encodeURIComponent(slug)}`;
    } else if (seo.ogImageTemplate === "faq") {
      ogImageFinal = `${base}/api/og-image?template=faq`;
    } else if (seo.ogImageTemplate === "homepage") {
      ogImageFinal = `${base}/api/og-image?template=homepage`;
    }
  }

  const twitterImageFinal = seo.twitterImage || ogImageFinal || null;

  if (seo.ogTitle || seo.ogDescription || ogImageFinal || siteName) {
    const og: Record<string, unknown> = {};
    if (seo.ogTitle) og.title = seo.ogTitle;
    if (seo.ogDescription) og.description = seo.ogDescription;
    if (seo.ogType) og.type = seo.ogType;
    if (canonicalUrl) og.url = canonicalUrl;
    if (siteName) og.siteName = siteName;
    if (locale) og.locale = locale;
    if (ogImageFinal) {
      og.images = [{ url: ogImageFinal, width: 1200, height: 630, alt: seo.ogTitle ?? siteName ?? "" }];
    }
    metadata.openGraph = og as Metadata["openGraph"];
  }

  if (seo.twitterCard || seo.twitterTitle || seo.twitterDescription || twitterImageFinal || seo.twitterSite) {
    const tw: Record<string, unknown> = {};
    if (seo.twitterCard) tw.card = seo.twitterCard;
    if (seo.twitterSite) tw.site = seo.twitterSite;
    if (seo.twitterTitle) tw.title = seo.twitterTitle;
    if (seo.twitterDescription) tw.description = seo.twitterDescription;
    if (twitterImageFinal) tw.images = [twitterImageFinal];
    metadata.twitter = tw as Metadata["twitter"];
  }

  return metadata;
}

export function buildGeoMetadata(): Metadata["other"] {
  return {
    "geo.region": "IN",
    "geo.country": "India",
    language: "en-IN",
    "content-language": "en-IN",
    HandheldFriendly: "True",
    MobileOptimized: "width",
    "format-detection": "telephone=no",
  };
}
