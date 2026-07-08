import { connection } from "next/server";
import { Metadata } from "next";
import TournamentDetailClient from "./_components/tournament-detail-client";
import { getTournamentDetail, getViewerTournamentDetail } from "@/lib/tournaments";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSeoData, buildMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";

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

    const title = seo.metaTitle || `${t.name} — ${siteName}`;
    const description = seo.metaDescription || `Join ${t.name}. ${t.type === "FREE" ? "Free entry" : `Entry fee: ₹${t.joiningFee}`}. Prize pool: ₹${t.prizePool}. ${t.gameMode} mode. ${t.totalSlots} slots available.`;
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

  const mapStatusToSchema = (status: string) => {
    switch (status) {
      case "CANCELLED": return "https://schema.org/EventCancelled";
      case "LIVE": return "https://schema.org/EventLive";
      case "FINISHED":
      case "COMPLETED": return "https://schema.org/EventCompleted";
      default: return "https://schema.org/EventScheduled";
    }
  };

  const baseUrl = siteUrl || process.env.NEXT_PUBLIC_APP_URL || "";

  const getDynamicSchema = () => {
    if (!initialData) return null;
    return {
      "@context": "https://schema.org",
      "@type": "SportsEvent",
      "name": initialData.name,
      "description": `${initialData.gameMode.replace(/_/g, " ")} tournament. Prize pool: ₹${initialData.prizePool}.`,
      "url": `${baseUrl}/tournaments/${id}`,
      "startDate": initialData.startTime,
      "eventStatus": mapStatusToSchema(initialData.status),
      "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
      "location": {
        "@type": "VirtualLocation",
        "url": `${baseUrl}/tournaments/${id}`
      },
      "organizer": {
        "@type": "Organization",
        "name": siteConfig?.logoTitle ?? "",
        "url": baseUrl,
        "logo": `${baseUrl}${siteConfig?.logoSrc ?? "/assets/logo.webp"}`
      },
      "offers": {
        "@type": "Offer",
        "price": initialData.joiningFee ?? 0,
        "priceCurrency": "INR",
        "availability": initialData.status === "UPCOMING" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
        "url": `${baseUrl}/tournaments/${id}`
      },
      "maximumAttendeeCapacity": initialData.totalSlots,
      "game": {
        "@type": "VideoGame",
        "name": "Free Fire",
        "applicationCategory": "Game",
        "operatingSystem": "Android, iOS"
      }
    };
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
    <div className="flex-1 bg-background pt-[68px] flex flex-col">
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
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
