export const dynamic = "force-dynamic";
import { getAdminTournamentsCached } from "@/lib/admin-data";
import AdminTournamentsClient from "./_components/admin-tournaments-client";
import { requirePagePermission } from "@/lib/panel-auth";

export default async function AdminTournamentsPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "tournaments:view");
  const rows = await getAdminTournamentsCached();
  const initialData = rows.map(t => ({ ...t, maps: (() => { try { return JSON.parse(t.maps || "[]"); } catch { return []; } })() }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <AdminTournamentsClient dynamicSlug={dynamicSlug} initialData={initialData as any} />;
}
