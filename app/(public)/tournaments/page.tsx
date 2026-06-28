import { Suspense } from "react";
import { Metadata } from "next";
import TournamentsClient from "./_components/tournaments-client";
import { getTournamentsPaginated } from "@/lib/tournaments";
import { getSeoData, buildMetadata } from "@/lib/seo";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { tournamentParticipant } from "@/db/schema";
import { eq } from "drizzle-orm";

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
  const sessionPromise = auth.api.getSession({ headers: await headers() }).catch(() => null);
  const dataPromise = getTournamentsPaginated(statusFilter, null, null, null, 1, 50)
    .then((res) => res.data)
    .catch(() => []);

  const [session, initialData] = await Promise.all([sessionPromise, dataPromise]);
  const joinedIds = session?.user?.id
    ? await db
        .select({ tournamentId: tournamentParticipant.tournamentId })
        .from(tournamentParticipant)
        .where(eq(tournamentParticipant.userId, session.user.id))
        .then((rows) => rows.map((row) => row.tournamentId))
        .catch(() => [])
    : [];

  return (
    <div className="min-h-screen bg-background pt-[68px]">
      <Suspense fallback={null}>
        <TournamentsClient
          initialData={initialData}
          initialFilter={statusFilter}
          initialJoinedIds={joinedIds}
        />
      </Suspense>
    </div>
  );
}
