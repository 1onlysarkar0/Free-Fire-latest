export const dynamic = "force-dynamic";

import NewPageEditorClient from "./_client";
import { requirePagePermission } from "@/lib/panel-auth";

export default async function NewPageEditorPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "pages:create");
  return <NewPageEditorClient />;
}
