import type { Metadata } from "next";
import { getSeoData, buildMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

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
