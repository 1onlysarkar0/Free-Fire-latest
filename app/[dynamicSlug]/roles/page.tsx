import { getAdminRolesCached } from "@/lib/admin-data";
import RolesClient from "../_components/roles-client";
import { requirePagePermission } from "@/lib/panel-auth";

export const dynamic = "force-dynamic";

export default async function RolesPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "roles:view");
  const roles = await getAdminRolesCached();
  return <RolesClient initialData={roles} />;
}
