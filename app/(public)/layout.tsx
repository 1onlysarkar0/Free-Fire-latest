import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import FooterSection from "@/components/homepage/footer";
import { getSeoData, buildMetadata } from "@/lib/seo";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [seo, config, siteUrl] = await Promise.all([
      getSeoData("global"),
      getAdminSiteConfigCached(),
      getSiteUrl(),
    ]);
    return buildMetadata(
      seo,
      siteUrl || undefined,
      config?.logoTitle ?? undefined,
      config?.logoSrc ?? undefined,
      undefined,
      "/"
    );
  } catch {
    return {};
  }
}

import { BreadcrumbsSchema } from "@/components/breadcrumbs-schema";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <BreadcrumbsSchema />
      <Navbar />
      <main className="min-h-screen">
        {children}
      </main>
      <FooterSection />
    </>
  );
}
