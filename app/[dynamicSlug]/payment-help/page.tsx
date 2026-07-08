export const dynamic = "force-dynamic";

import PaymentHelpAdminClient from "./_components/payment-help-admin-client";
import { requirePagePermission } from "@/lib/panel-auth";

export default async function PaymentHelpAdminPage({
  params,
}: {
  params: Promise<{ dynamicSlug: string }>;
}) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "payment_help:view");
  return <PaymentHelpAdminClient />;
}
