export const dynamic = "force-dynamic";

import { getUserProfileCached, getUserWalletCached, getUserPermissionsCached } from "@/lib/user-data";
import { getAdminRolesCached } from "@/lib/admin-data";
import { notFound } from "next/navigation";
import UserEditClient from "./_components/user-edit-client";
import { requirePagePermission } from "@/lib/panel-auth";

export default async function UserEditPage({ params }: { params: Promise<{ dynamicSlug: string; id: string }> }) {
  const { dynamicSlug, id } = await params;
  await requirePagePermission(dynamicSlug, "users:edit");
  
  const [userRow, roles, userPermissions, walletRow] = await Promise.all([
    getUserProfileCached(id),
    getAdminRolesCached(),
    getUserPermissionsCached(id),
    getUserWalletCached(id),
  ]);
  
  if (!userRow) notFound();
  
  return (
    <UserEditClient
      dynamicSlug={dynamicSlug}
      userId={id}
      initialUser={userRow}
      initialRoles={roles}
      initialUserRoleIds={userPermissions.roles.map(r => r.id)}
      initialUserRoles={userPermissions.roles as { id: string; name: string; assignedAt: string | null }[]}
      initialWalletBalance={walletRow?.balance ?? 0}
    />
  );
}
