import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSeoData, buildMetadata, buildGeoMetadata } from "@/lib/seo";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { getSiteUrl } from "@/lib/site-url";
import PaymentHelpClient from "./_components/payment-help-client";
import { getUserProfileCached } from "@/lib/user-data";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BadgeDollarSign, LogIn } from "lucide-react";

export const dynamic = "force-dynamic";

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
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  const dbUser = session?.user?.id
    ? await getUserProfileCached(session.user.id).catch(() => null)
    : null;

  return (
    <PaymentHelpClient
      userId={session?.user?.id ?? null}
      userName={dbUser?.name ?? session?.user?.name ?? ""}
      userEmail={dbUser?.email ?? session?.user?.email ?? ""}
    />
  );
}
