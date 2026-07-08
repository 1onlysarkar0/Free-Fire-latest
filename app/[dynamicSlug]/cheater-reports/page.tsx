export const dynamic = "force-dynamic";

import CheaterReportsAdminClient from "./_components/cheater-reports-admin-client";
import { requirePagePermission } from "@/lib/panel-auth";

export default async function CheaterReportsPage({
  params,
}: {
  params: Promise<{ dynamicSlug: string }>;
}) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "cheater_reports:view");
  return <CheaterReportsAdminClient />;
}
