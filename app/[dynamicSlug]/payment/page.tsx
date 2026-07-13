import { requirePagePermission } from "@/lib/panel-auth";
import { db } from "@/db/drizzle";
import { paymentConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import PaymentAdminClient from "./_components/payment-admin-client";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export default async function PaymentAdminPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  const authState = await requirePagePermission(dynamicSlug, "payment:view");

  const rows = await db
    .select()
    .from(paymentConfig)
    .where(eq(paymentConfig.id, "default"))
    .limit(1);

  const row = rows[0];
  const initialConfig = row
    ? {
        gmailEmail: row.gmailEmail,
        gmailAppPassword: row.gmailAppPassword ? "••••••••" : "",
        trustedSenders: JSON.parse(row.trustedSenders || "[]") as string[],
        checkDays: row.checkDays,
        upiId: row.upiId,
        upiName: row.upiName,
        pageContent: row.pageContent,
        enabled: row.enabled,
      }
    : null;

  return (
    <PaymentAdminClient
      initialConfig={initialConfig}
      canEdit={
        authState.isAdmin ||
        authState.permissions.includes("payment:config_edit")
      }
      canViewLogs={
        authState.isAdmin ||
        authState.permissions.includes("payment:view_verifications")
      }
    />
  );
}
