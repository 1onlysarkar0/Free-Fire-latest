import type { Metadata } from "next";
import { db } from "@/db/drizzle";
import { faq } from "@/db/schema";
import { asc } from "drizzle-orm";
import { FaqPro } from "./_components/faq-pro";
import { getSeoData, buildMetadata, type SeoData } from "@/lib/seo";
import { getAdminSiteConfigCached } from "@/lib/admin-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [seo, config] = await Promise.all([
      getSeoData("page-faq").catch(() => null),
      getAdminSiteConfigCached().catch(() => null),
    ]);

    const siteName = config?.logoTitle || "";
    const title = seo?.metaTitle || "";
    const description = seo?.metaDescription || "";

    const mergedSeo: SeoData = {
      ...(seo ?? ({} as SeoData)),
      metaTitle: title,
      metaDescription: description,
      metaKeywords: seo?.metaKeywords || "",
      robots: seo?.robots || "",
    };

    return buildMetadata(
      mergedSeo,
      process.env.NEXT_PUBLIC_APP_URL || "",
      siteName,
      config?.logoSrc ?? undefined
    );
  } catch {
    return {};
  }
}

export default async function FaqPage() {
  const items = await db.select().from(faq).orderBy(asc(faq.order));

  // Load SEO config for FAQ page heading and description
  const seo = await getSeoData("page-faq").catch(() => null);
  const pageTitle = seo?.metaTitle || "";
  const pageDescription = seo?.metaDescription || "";

  let structuredData = null;
  if (seo?.structuredDataJson) {
    try {
      structuredData = JSON.parse(seo.structuredDataJson);
    } catch {}
  }

  // Fallback to generate standard FAQPage schema if not customized
  if (!structuredData && items.length > 0) {
    structuredData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": items.map((item) => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer,
        }
      }))
    };
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-x-hidden pt-32 pb-24">
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}

      <div className="mx-auto w-full max-w-5xl px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight font-lora">
            {pageTitle || "Frequently Asked Questions"}
          </h1>
          {pageDescription && (
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mt-2">
              {pageDescription}
            </p>
          )}
        </div>

        <FaqPro items={items} defaultOpenFirst={true} />
      </div>
    </div>
  );
}
