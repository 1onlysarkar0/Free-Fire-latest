import { db } from "@/db/drizzle";
import { smtpProviders } from "@/db/schema";
import { requirePagePermission } from "@/lib/panel-auth";
import SmtpProvidersClient from "../_components/smtp-providers-client";
import { desc } from "drizzle-orm";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export default async function SmtpPage({
  params,
}: {
  params: Promise<{ dynamicSlug: string }>;
}) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "smtp:view");

  const providers = await db
    .select()
    .from(smtpProviders)
    .orderBy(desc(smtpProviders.createdAt));

  // Mask passwords before sending to client
  const masked = providers.map((p) => ({
    ...p,
    password: p.password ? "••••••••" : "",
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <SmtpProvidersClient initialProviders={masked} />;
}
