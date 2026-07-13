import { getAdminSiteConfigCached } from "@/lib/admin-data";
import SiteConfigClient, { SiteConfigData } from "../_components/site-config-client";
import { requirePagePermission } from "@/lib/panel-auth";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export default async function SiteConfigPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "site_config:view");
  const d = (await getAdminSiteConfigCached()) || {};

  const initialData: SiteConfigData = {
    logoUrl: d.logoUrl ?? "",
    logoSrc: d.logoSrc ?? "",
    logoAlt: d.logoAlt ?? "",
    logoTitle: d.logoTitle ?? "",
    authLoginText: d.authLoginText ?? "",
    authLoginUrl: d.authLoginUrl ?? "",
    authSignupText: d.authSignupText ?? "",
    authSignupUrl: d.authSignupUrl ?? "",
    authPanelImageUrl: d.authPanelImageUrl ?? "",
    authPanelColor: d.authPanelColor ?? "#FF5A1F",
    copyrightText: d.copyrightText ?? "",
    heroHeadline: d.heroHeadline ?? "",
    heroSubheadline: d.heroSubheadline ?? "",
    heroCtaPrimaryText: d.heroCtaPrimaryText ?? "",
    heroCtaPrimaryUrl: d.heroCtaPrimaryUrl ?? "",
    heroCtaSecondaryText: d.heroCtaSecondaryText ?? "",
    heroCtaSecondaryUrl: d.heroCtaSecondaryUrl ?? "",
    heroBadgeText: d.heroBadgeText ?? "",
    heroBadgeUrl: d.heroBadgeUrl ?? "",
    contactEmail: d.contactEmail ?? "",
    companyAddress: d.companyAddress ?? "",
    jurisdictionName: d.jurisdictionName ?? "",
    adminSlug: d.adminSlug ?? "admin",
  };

  return <SiteConfigClient initialData={initialData} />;
}
