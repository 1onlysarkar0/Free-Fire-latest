import { getAdminContentTemplatesCached } from "@/lib/admin-data";
import ContentTemplatesClient from "./_components/content-templates-client";
import { requirePagePermission } from "@/lib/panel-auth";

export const dynamic = "force-dynamic";

export default async function ContentTemplatesPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "content_templates:view");
  const templates = await getAdminContentTemplatesCached();
  return <ContentTemplatesClient dynamicSlug={dynamicSlug} initialData={templates} />;
}
