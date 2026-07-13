// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

import WithdrawAdminClient from "./_components/withdraw-admin-client";
import { requirePagePermission } from "@/lib/panel-auth";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function WithdrawPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "withdraw:view");
  return <WithdrawAdminClient />;
}
