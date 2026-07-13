// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

import CheaterReportsAdminClient from "./_components/cheater-reports-admin-client";
import { requirePagePermission } from "@/lib/panel-auth";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function CheaterReportsPage({
  params,
}: {
  params: Promise<{ dynamicSlug: string }>;
}) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "cheater_reports:view");
  return <CheaterReportsAdminClient />;
}
