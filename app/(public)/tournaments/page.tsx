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
  const siteUrlPromise = getSiteUrl().catch(() => "");

  const [session, initialData, siteUrl] = await Promise.all([sessionPromise, dataPromise, siteUrlPromise]);
  const baseUrl = siteUrl || process.env.NEXT_PUBLIC_APP_URL || "";
  const collectionSchema = baseUrl
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Free Fire Tournaments",
        "url": `${baseUrl}/tournaments`,
        "mainEntity": {
          "@type": "ItemList",
          "itemListElement": initialData.slice(0, 20).map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "url": `${baseUrl}/tournaments/${item.id}`,
          })),
        },
      }
    : null;
  const joinedIds = session?.user?.id
    ? await db
        .select({ tournamentId: tournamentParticipant.tournamentId })
        .from(tournamentParticipant)
        .where(eq(tournamentParticipant.userId, session.user.id))
        .then((rows) => rows.map((row) => row.tournamentId))
        .catch(() => [])
    : [];

  return (
    <div className="flex-1 bg-background pt-20 md:pt-24 flex flex-col">
      {collectionSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema).replace(/</g, "\\u003c") }}
        />
      )}
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
