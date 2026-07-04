import type { Metadata } from "next";
import { getSeoData, buildMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [seo, siteUrl] = await Promise.all([
      getSeoData("global"),
      getSiteUrl(),
    ]);
    return buildMetadata(seo, siteUrl || undefined, undefined, undefined, undefined, "/");
  } catch {
    return {};
  }
}

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
