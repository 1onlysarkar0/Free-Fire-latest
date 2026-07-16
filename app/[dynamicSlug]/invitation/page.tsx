import InvitationAdminClient from "./_components/invitation-admin-client";
import { requirePagePermission } from "@/lib/panel-auth";

export const instant = false;

export default async function InvitationAdminPage({
  params,
}: {
  params: Promise<{ dynamicSlug: string }>;
}) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "invitation:view");
  return <InvitationAdminClient />;
}