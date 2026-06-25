import { getAdminSmtpCached } from "@/lib/admin-data";
import SmtpClient, { SmtpData } from "../_components/smtp-client";
import { requirePagePermission } from "@/lib/panel-auth";

export const dynamic = "force-dynamic";

export default async function SmtpPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "smtp:view");

  const d = await getAdminSmtpCached() || {};

  const initialData: SmtpData = {
    host: d.host ?? "",
    port: d.port ?? 587,
    username: d.username ?? "",
    password: d.password ?? "",
    fromName: d.fromName ?? "",
    fromEmail: d.fromEmail ?? "",
    secure: d.secure ?? false,
    enabled: d.enabled ?? false,
  };

  return <SmtpClient initialData={initialData} />;
}
