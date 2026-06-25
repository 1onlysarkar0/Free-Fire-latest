export const dynamic = "force-dynamic";

import NewRoleClient from "./_client";
import { requirePagePermission } from "@/lib/panel-auth";

export default async function NewRolePage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "roles:create");
  return <NewRoleClient />;
}
