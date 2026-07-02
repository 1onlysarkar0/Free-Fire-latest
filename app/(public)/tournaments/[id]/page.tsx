import { connection } from "next/server";
import { Metadata } from "next";
import TournamentDetailClient from "./_components/tournament-detail-client";
import { getTournamentDetail, getViewerTournamentDetail } from "@/lib/tournaments";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSeoData, buildMetadata } from "@/lib/seo";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";


export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const [t, config, seo] = await Promise.all([
      getTournamentDetail(id),
      getAdminSiteConfigCached(),
      getSeoData(`tournament-${id}`),
    ]);
    const siteName = config?.logoTitle ?? "";
    if (!t) return { title: `Tournament — ${siteName}` };

    const title = seo.metaTitle || `${t.name} — ${siteName}`;
    const description = seo.metaDescription || `Join ${t.name}. ${t.type === "FREE" ? "Free entry" : `Entry fee: ₹${t.joiningFee}`}. Prize pool: ₹${t.prizePool}. ${t.gameMode} mode. ${t.totalSlots} slots available.`;
    const url = seo.canonicalUrl || `${APP_URL}/tournaments/${id}`;
    const ogImage = seo.ogImage || config?.logoSrc || null;

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

    return buildMetadata(mergedSeo, APP_URL, siteName, config?.logoSrc ?? undefined);
  } catch {
    return { title: "Tournament" };
  }
}

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);

  const [initialData, siteConfig, seo] = await Promise.all([
    getViewerTournamentDetail(id, session?.user?.id).catch(() => null),
    getAdminSiteConfigCached().catch(() => null),
    getSeoData(`tournament-${id}`).catch(() => null),
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

  const getDynamicSchema = () => {
    if (!initialData) return null;
    return {
      "@context": "https://schema.org",
      "@type": "SportsEvent",
      "name": initialData.name,
      "description": `${initialData.gameMode.replace(/_/g, " ")} tournament. Prize pool: ₹${initialData.prizePool}.`,
      "url": `${APP_URL}/tournaments/${id}`,
      "startDate": initialData.startTime,
      "eventStatus": mapStatusToSchema(initialData.status),
      "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
      "location": {
        "@type": "VirtualLocation",
        "url": `${APP_URL}/tournaments/${id}`
      },
      "organizer": {
        "@type": "Organization",
        "name": siteConfig?.logoTitle ?? "",
        "url": APP_URL,
        "logo": `${APP_URL}${siteConfig?.logoSrc ?? "/assets/logo.webp"}`
      },
      "offers": {
        "@type": "Offer",
        "price": initialData.joiningFee ?? 0,
        "priceCurrency": "INR",
        "availability": initialData.status === "UPCOMING" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
        "url": `${APP_URL}/tournaments/${id}`
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
    <div className="min-h-screen bg-background pt-[68px]">
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
