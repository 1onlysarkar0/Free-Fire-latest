// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

import { db } from "@/db/drizzle";
import { adminRole } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import EditRoleClient from "./_client";
import { requirePagePermission } from "@/lib/panel-auth";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

async function getAdminRoleById(id: string) {
  const [role] = await db
    .select()
    .from(adminRole)
    .where(eq(adminRole.id, id))
    .limit(1);
  return role ?? null;
}

interface Props {
  params: Promise<{ dynamicSlug: string; id: string }>;
}

export default async function EditRolePage({ params }: Props) {
  const { dynamicSlug, id } = await params;
  await requirePagePermission(dynamicSlug, "roles:edit");

  const roleRow = await getAdminRoleById(id);

  if (!roleRow) {
    notFound();
  }

  const initialRole = {
    id: roleRow.id,
    name: roleRow.name,
    description: roleRow.description,
    permissions: roleRow.permissions,
  };

  return (
    <EditRoleClient
      id={id}
      initialRole={initialRole}
      dynamicSlug={dynamicSlug}
    />
  );
}
