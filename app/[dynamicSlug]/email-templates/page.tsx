import { db } from "@/db/drizzle";
import { emailTemplate } from "@/db/schema";
import { requirePagePermission } from "@/lib/panel-auth";
import EmailTemplatesClient from "../_components/email-templates-client";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function EmailTemplatesPage({
  params,
}: {
  params: Promise<{ dynamicSlug: string }>;
}) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "email_templates:view");

  const templates = await db
    .select()
    .from(emailTemplate)
    .orderBy(desc(emailTemplate.updatedAt));

  const serialized = templates.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <EmailTemplatesClient
      initialTemplates={serialized}
      adminSlug={dynamicSlug}
    />
  );
}
