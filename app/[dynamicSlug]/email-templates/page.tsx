import { getAdminEmailTemplatesCached } from "@/lib/admin-data";
import EmailTemplatesClient from "../_components/email-templates-client";
import { requirePagePermission } from "@/lib/panel-auth";

export const dynamic = "force-dynamic";

export default async function EmailTemplatesPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "email_templates:view");
  const data = await getAdminEmailTemplatesCached();
  
  return <EmailTemplatesClient initialData={data} />;
}
