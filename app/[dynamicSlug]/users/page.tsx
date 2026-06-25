import { getAdminUsersCached } from "@/lib/admin-data";
import UsersPageClient from "../_components/users-client";
import { requirePagePermission } from "@/lib/panel-auth";

export const dynamic = "force-dynamic";

export default async function UsersPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "users:view");
  const users = await getAdminUsersCached();
  return <UsersPageClient initialData={users} />;
}
