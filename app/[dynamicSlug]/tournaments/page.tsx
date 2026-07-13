// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";
import { getAdminTournamentsCached, getAdminSiteConfigCached } from "@/lib/admin-data";
import AdminTournamentsClient, { Tournament } from "./_components/admin-tournaments-client";
import { requirePagePermission } from "@/lib/panel-auth";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function AdminTournamentsPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "tournaments:view");
  
  const [rows, config] = await Promise.all([
    getAdminTournamentsCached(),
    getAdminSiteConfigCached(),
  ]);

  const initialData = rows.map(t => ({
    ...t,
    maps: (() => { try { return JSON.parse(t.maps || "[]"); } catch { return []; } })()
  }));

  const deletedCount = config?.deletedTournamentsCount ?? 0;

  return (
    <AdminTournamentsClient
      dynamicSlug={dynamicSlug}
      initialData={initialData as unknown as Tournament[]}
      initialDeletedCount={deletedCount}
    />
  );
}
