import { Suspense } from "react";
import { Metadata } from "next";
import TournamentsClient from "./_components/tournaments-client";
import { fetchTournamentsPaginated, TournamentListItem } from "@/lib/tournaments";
import { getSeoData, buildMetadata } from "@/lib/seo";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { tournamentParticipant } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

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

  const result = (await fetchTournamentsPaginated(statusFilter, null, null, null, 1, 50)
    .then((res) => res.data)
    .catch(() => [])) as TournamentListItem[];

  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  if (session?.user?.id && result.length > 0) {
    const joined = await db
      .select({ tournamentId: tournamentParticipant.tournamentId })
      .from(tournamentParticipant)
      .where(
        and(
          inArray(tournamentParticipant.tournamentId, result.map((t) => t.id)),
          eq(tournamentParticipant.userId, session.user.id)
        )
      );
    const joinedIds = new Set(joined.map((j) => j.tournamentId));
    for (const t of result) {
      if (joinedIds.has(t.id)) t.hasJoined = true;
    }
  }

  return (
    <div className="min-h-screen bg-background pt-[68px]">
      <Suspense fallback={null}>
        <TournamentsClient initialData={result} initialFilter={statusFilter} />
      </Suspense>
    </div>
  );
}
