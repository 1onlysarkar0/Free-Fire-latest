import { db } from "@/db/drizzle";
import { emailTemplate } from "@/db/schema";
import { requirePagePermission } from "@/lib/panel-auth";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import EmailDesignerClient from "./_client";

export const dynamic = "force-dynamic";

export default async function EmailDesignerPage({
  params,
}: {
  params: Promise<{ dynamicSlug: string; templateId: string }>;
}) {
  const { dynamicSlug, templateId } = await params;
  await requirePagePermission(dynamicSlug, "email_templates:edit");

  const [template] = await db
    .select()
    .from(emailTemplate)
    .where(eq(emailTemplate.id, templateId))
    .limit(1);

  if (!template) notFound();

  return (
    <EmailDesignerClient
      template={{
        ...template,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      }}
      adminSlug={dynamicSlug}
    />
  );
}
