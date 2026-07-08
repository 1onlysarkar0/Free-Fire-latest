import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSeoData, buildMetadata, buildGeoMetadata } from "@/lib/seo";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { getSiteUrl } from "@/lib/site-url";
import CheaterReportClient from "./_components/cheater-report-client";
import { getUserProfileCached } from "@/lib/user-data";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert, LogIn } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [seo, config, siteUrl] = await Promise.all([
      getSeoData("cheater-report"),
      getAdminSiteConfigCached(),
      getSiteUrl(),
    ]);
    return {
      ...buildMetadata(seo, siteUrl || undefined, config?.logoTitle ?? undefined, config?.logoSrc ?? undefined, undefined, "/cheater-report"),
      other: buildGeoMetadata(),
    };
  } catch {
    return {};
  }
}

export default async function CheaterReportPage() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  const dbUser = session?.user?.id
    ? await getUserProfileCached(session.user.id).catch(() => null)
    : null;

  return (
    <CheaterReportClient
      userId={session?.user?.id ?? null}
      userName={dbUser?.name ?? session?.user?.name ?? ""}
      userGameName={dbUser?.gameName ?? ""}
    />
  );
}
