import { connection } from "next/server";
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
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const [seo, config, siteUrl] = await Promise.all([
    getSeoData("tournaments"),
    getAdminSiteConfigCached(),
    getSiteUrl(),
  ]);
  const siteName = config?.logoTitle ?? "";
  return buildMetadata(seo, siteUrl || undefined, siteName || undefined, config?.logoSrc ?? undefined, undefined, "/tournaments");
}

export default async function TournamentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await connection();
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
    <div className="flex-1 bg-background pt-[68px] flex flex-col">
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
