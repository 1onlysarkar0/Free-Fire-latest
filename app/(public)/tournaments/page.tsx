import { Suspense } from "react";
import { Metadata } from "next";
import TournamentsClient from "./_components/tournaments-client";
import { fetchTournamentsPaginated } from "@/lib/tournaments";
import { getSeoData, buildMetadata } from "@/lib/seo";
import { getAdminSiteConfigCached } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [seo, config] = await Promise.all([
    getSeoData("tournaments"),
    getAdminSiteConfigCached(),
  ]);
  const siteName = config?.logoTitle ?? "";
  return buildMetadata(seo, process.env.NEXT_PUBLIC_APP_URL as string, siteName, config?.logoSrc ?? undefined);
}

export default async function TournamentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const statusFilter = params.status || "ACTIVE,UPCOMING,ROOM_REVEALED,LIVE";
  
  const initialData = await fetchTournamentsPaginated(statusFilter, null, null, null, 1, 50)
    .then((res) => res.data)
    .catch(() => []);

  return (
    <div className="min-h-screen bg-background pt-[68px]">
      <Suspense fallback={null}>
        <TournamentsClient initialData={initialData} initialFilter={statusFilter} />
      </Suspense>
    </div>
  );
}
