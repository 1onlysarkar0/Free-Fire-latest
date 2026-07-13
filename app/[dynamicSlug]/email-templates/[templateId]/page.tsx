import { db } from "@/db/drizzle";
import { emailTemplate, siteConfig } from "@/db/schema";
import { requirePagePermission } from "@/lib/panel-auth";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import EmailDesignerClient from "./_client";
import { Mail } from "lucide-react";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";
// TODO: Cache Components adoption — restore export const revalidate = 0;

interface PageProps {
  params: Promise<{ dynamicSlug: string; templateId: string }>;
}

/* ═══════════════════════════════════════════════════════════
   SEO Metadata — 100% Database Driven, Zero Hardcoded Fallbacks
═══════════════════════════════════════════════════════════ */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { dynamicSlug, templateId } = await params;

  /* Fetch site name from DB only — no hardcoded brand fallback */
  const configRows = await db
    .select({ logoTitle: siteConfig.logoTitle })
    .from(siteConfig)
    .limit(1);

  const siteName = configRows[0]?.logoTitle ?? null;

  /* Fetch template name for dynamic title */
  const [templateRow] = await db
    .select({ name: emailTemplate.name })
    .from(emailTemplate)
    .where(eq(emailTemplate.id, templateId))
    .limit(1);

  const templateName = templateRow?.name ?? "Edit Template";

  return {
    title: siteName ? `${templateName} — ${siteName}` : templateName,
    robots: { index: false, follow: false }, // Admin panel — never index
  };
}

/* ═══════════════════════════════════════════════════════════
   Server Component — Email Template Designer Page
═══════════════════════════════════════════════════════════ */
export default async function EmailDesignerPage({ params }: PageProps) {
  const { dynamicSlug, templateId } = await params;

  /* Role-based permission check */
  await requirePagePermission(dynamicSlug, "email_templates:edit");

  /* Fetch site configuration — ALL values from DB only */
  const siteConfigRows = await db.select().from(siteConfig).limit(1);
  const siteConf = siteConfigRows[0] ?? null;

  /* Fetch template with error handling */
  let template: (typeof emailTemplate.$inferSelect) | null = null;
  let fetchError: string | null = null;

  try {
    const [t] = await db
      .select()
      .from(emailTemplate)
      .where(eq(emailTemplate.id, templateId))
      .limit(1);
    template = t ?? null;
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to load template from database";
  }

  if (!template) {
    if (fetchError) {
      /* If DB error, show error UI instead of 404 */
      return (
        <div className="w-full min-w-0 space-y-6 px-3 pt-4 sm:px-4 md:px-6 lg:px-8">
          <div className="header-admin">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Edit Email Template
                </h1>
                {fetchError && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {fetchError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
    notFound();
  }

  /* Build site config object — every field from DB */
  const siteConfigData = {
    siteName: siteConf?.logoTitle ?? "",
    logoUrl: siteConf?.logoSrc ?? "",
    logoAlt: siteConf?.logoAlt ?? "",
    contactEmail: siteConf?.contactEmail ?? "",
    companyAddress: siteConf?.companyAddress ?? "",
    copyrightText: siteConf?.copyrightText ?? "",
  };

  return (
    <EmailDesignerClient
      template={{
        ...template,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      }}
      adminSlug={dynamicSlug}
      siteConfig={siteConfigData}
    />
  );
}