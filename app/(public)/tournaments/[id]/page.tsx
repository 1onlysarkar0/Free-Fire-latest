import { connection } from "next/server";
import { Metadata } from "next";
import TournamentDetailClient from "./_components/tournament-detail-client";
import { getTournamentDetail, getViewerTournamentDetail } from "@/lib/tournaments";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";


export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const [t, config] = await Promise.all([
      getTournamentDetail(id),
      getAdminSiteConfigCached(),
    ]);
    const siteName = config?.logoTitle ?? "";
    if (!t) return { title: `Tournament — ${siteName}` };

    const title = `${t.name} — ${siteName}`;
    const description = `Join ${t.name}. ${t.type === "FREE" ? "Free entry" : `Entry fee: ₹${t.joiningFee}`}. Prize pool: ₹${t.prizePool}. ${t.gameMode} mode. ${t.totalSlots} slots available.`;
    const url = `${APP_URL}/tournaments/${id}`;

    const ogImage = config?.logoSrc || "/assets/og-image.png";

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "website",
        url,
        title,
        description,
        siteName,
        images: [{ url: ogImage, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return { title: "Tournament" };
  }
}

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);

  const [initialData, siteConfig] = await Promise.all([
    getViewerTournamentDetail(id, session?.user?.id).catch(() => null),
    getAdminSiteConfigCached().catch(() => null),
  ]);

  const structuredData = initialData
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: initialData.name,
        description: `${initialData.gameMode} gaming tournament. Prize pool: ₹${initialData.prizePool}.`,
        url: `${APP_URL}/tournaments/${id}`,
        startDate: initialData.startTime,
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
        location: {
          "@type": "VirtualLocation",
          url: `${APP_URL}/tournaments/${id}`,
        },
        organizer: {
          "@type": "Organization",
          name: siteConfig?.logoTitle ?? "",
          url: APP_URL,
        },
        offers: {
          "@type": "Offer",
          price: initialData.joiningFee ?? 0,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
          url: `${APP_URL}/tournaments/${id}`,
        },
      }
    : null;

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
