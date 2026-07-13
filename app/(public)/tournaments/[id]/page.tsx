import { connection } from "next/server";
import { Metadata } from "next";
import TournamentDetailClient from "./_components/tournament-detail-client";
import { getTournamentDetail, getViewerTournamentDetail } from "@/lib/tournaments";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSeoData, buildMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";
import { buildTournamentMeta, buildTournamentSportsEventSchema } from "@/lib/seo/tournament";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const [t, config, seo, siteUrl] = await Promise.all([
      getTournamentDetail(id),
      getAdminSiteConfigCached(),
      getSeoData(`tournament-${id}`),
      getSiteUrl(),
    ]);
    const siteName = config?.logoTitle ?? "";
    if (!t) return { title: `Tournament — ${siteName}` };

    const baseUrl = siteUrl || process.env.NEXT_PUBLIC_APP_URL || "";
    const fallbackMeta = buildTournamentMeta({
      id,
      name: t.name,
      type: t.type,
      joiningFee: t.joiningFee,
      prizePool: t.prizePool,
      gameMode: t.gameMode,
      teamFormat: t.teamFormat,
      totalSlots: t.totalSlots,
      startTime: t.startTime,
      status: t.status,
      siteName,
      baseUrl,
      logoSrc: config?.logoSrc,
    });

    const title = seo.metaTitle || fallbackMeta.metaTitle;
    const description = seo.metaDescription || fallbackMeta.metaDescription;
    const url = seo.canonicalUrl || `${baseUrl}/tournaments/${id}`;
    const ogImage = seo.ogImage || null;

    const mergedSeo = {
      ...seo,
      metaTitle: title,
      metaDescription: description,
      ogTitle: seo.ogTitle || title,
      ogDescription: seo.ogDescription || description,
      ogImage: ogImage,
      twitterTitle: seo.twitterTitle || title,
      twitterDescription: seo.twitterDescription || description,
      twitterImage: ogImage,
      canonicalUrl: url,
    };

    return buildMetadata(mergedSeo, baseUrl || undefined, siteName || undefined, config?.logoSrc ?? undefined, undefined, `/tournaments/${id}`);
  } catch {
    return { title: "Tournament" };
  }
}

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);

  const [initialData, siteConfig, seo, siteUrl] = await Promise.all([
    getViewerTournamentDetail(id, session?.user?.id).catch(() => null),
    getAdminSiteConfigCached().catch(() => null),
    getSeoData(`tournament-${id}`).catch(() => null),
    getSiteUrl().catch(() => ""),
  ]);

  const baseUrl = siteUrl || process.env.NEXT_PUBLIC_APP_URL || "";

  const getDynamicSchema = () => {
    if (!initialData) return null;
    return buildTournamentSportsEventSchema({
      id,
      name: initialData.name,
      type: initialData.type,
      joiningFee: initialData.joiningFee,
      prizePool: initialData.prizePool,
      gameMode: initialData.gameMode,
      teamFormat: initialData.teamFormat,
      totalSlots: initialData.totalSlots,
      startTime: initialData.startTime,
      status: initialData.status,
      availableSlots: initialData.availableSlots,
      siteName: siteConfig?.logoTitle ?? "1OnlySarkar",
      baseUrl,
      logoSrc: siteConfig?.logoSrc,
    });
  };

  let structuredData = null;
  if (seo?.structuredDataJson) {
    try {
      structuredData = JSON.parse(seo.structuredDataJson);
    } catch {
      structuredData = getDynamicSchema();
    }
  } else {
    structuredData = getDynamicSchema();
  }

  return (
    <div className="flex-1 bg-background pt-20 md:pt-24 flex flex-col">
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
      )}
      <TournamentDetailClient
        id={id}
        initialData={initialData}
        initialIsLoggedIn={!!session?.user}
      />
    </div>
  );
}
