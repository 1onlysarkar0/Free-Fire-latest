export const dynamic = "force-dynamic";

import WithdrawAdminClient from "./_components/withdraw-admin-client";
import { requirePagePermission } from "@/lib/panel-auth";

export default async function WithdrawPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "withdraw:view");
  return <WithdrawAdminClient />;
}
