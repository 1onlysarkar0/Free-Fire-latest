import { getAdminContentTemplatesCached } from "@/lib/admin-data";
import ContentTemplatesClient from "./_components/content-templates-client";
import { requirePagePermission } from "@/lib/panel-auth";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export default async function ContentTemplatesPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "content_templates:view");
  const templates = await getAdminContentTemplatesCached();
  return <ContentTemplatesClient dynamicSlug={dynamicSlug} initialData={templates} />;
}
