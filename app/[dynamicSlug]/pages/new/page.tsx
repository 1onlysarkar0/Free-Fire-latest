// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

import NewPageEditorClient from "./_client";
import { requirePagePermission } from "@/lib/panel-auth";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function NewPageEditorPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "pages:create");
  return <NewPageEditorClient />;
}
