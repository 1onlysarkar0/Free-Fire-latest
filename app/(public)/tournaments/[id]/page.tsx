import { Metadata } from "next";
import TournamentDetailClient from "./_components/tournament-detail-client";
import { fetchTournamentDetail } from "@/lib/tournaments";
import { getAdminSiteConfigCached } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const [t, config] = await Promise.all([
      fetchTournamentDetail(id),
      getAdminSiteConfigCached(),
    ]);
    const siteName = config?.logoTitle ?? "";
    if (!t) return { title: `Tournament — ${siteName}` };

    const title = `${t.name} — ${siteName}`;
    const description = `Join ${t.name}. ${t.type === "FREE" ? "Free entry" : `Entry fee: ₹${t.joiningFee}`}. Prize pool: ₹${t.prizePool}. ${t.gameMode} mode. ${t.totalSlots} slots available.`;
    const url = `${APP_URL}/tournaments/${id}`;

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
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return { title: "Tournament" };
  }
}

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [initialData, siteConfig] = await Promise.all([
    fetchTournamentDetail(id).catch(() => null),
    getAdminSiteConfigCached().catch(() => null),
  ]);

  const structuredData = initialData
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: initialData.name,
        description: `${initialData.gameMode} gaming tournament. Prize pool: ₹${initialData.prizePool}.`,
        url: `${APP_URL}/tournaments/${id}`,
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
      <TournamentDetailClient id={id} initialData={initialData} />
    </div>
  );
}
