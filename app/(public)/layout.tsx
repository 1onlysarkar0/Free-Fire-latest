import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import FooterSection from "@/components/homepage/footer";
import { getSeoData, buildMetadata } from "@/lib/seo";
import { getAdminSiteConfigCached } from "@/lib/admin-data";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [seo, config] = await Promise.all([
      getSeoData("global"),
      getAdminSiteConfigCached(),
    ]);
    return buildMetadata(seo, process.env.NEXT_PUBLIC_APP_URL as string, config?.logoTitle ?? undefined);
  } catch {
    return {};
  }
}

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {children}
      </main>
      <FooterSection />
    </>
  );
}
