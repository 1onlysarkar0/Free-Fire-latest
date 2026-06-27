import { Metadata } from "next";
import TournamentDetailClient from "./_components/tournament-detail-client";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { fetchTournamentDetail } from "@/lib/tournaments";

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

  return (
    <div className="min-h-screen bg-background pt-[68px]">
      <TournamentDetailClient id={id} />
    </div>
  );
}
