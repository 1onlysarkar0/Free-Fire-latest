import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSeoData, buildMetadata, buildGeoMetadata } from "@/lib/seo";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { getSiteUrl } from "@/lib/site-url";
import PaymentHelpClient from "./_components/payment-help-client";
import { getUserProfileCached } from "@/lib/user-data";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [seo, config, siteUrl] = await Promise.all([
      getSeoData("payment-help"),
      getAdminSiteConfigCached(),
      getSiteUrl(),
    ]);
    return {
      ...buildMetadata(seo, siteUrl || undefined, config?.logoTitle ?? undefined, config?.logoSrc ?? undefined, undefined, "/payment-help"),
      other: buildGeoMetadata(),
    };
  } catch {
    return {};
  }
}

export default async function PaymentHelpPage() {
  const [session, seoData] = await Promise.all([
    auth.api.getSession({ headers: await headers() }).catch(() => null),
    getSeoData("payment-help").catch(() => null)
  ]);

  const dbUser = session?.user?.id
    ? await getUserProfileCached(session.user.id).catch(() => null)
    : null;

  let structuredData = null;
  if (seoData?.structuredDataJson) {
    try {
      structuredData = JSON.parse(seoData.structuredDataJson);
    } catch {}
  }

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <PaymentHelpClient
        userId={session?.user?.id ?? null}
        userName={dbUser?.name ?? session?.user?.name ?? ""}
        userEmail={dbUser?.email ?? session?.user?.email ?? ""}
      />
    </>
  );
}
