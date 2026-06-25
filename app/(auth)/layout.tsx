import type { Metadata } from "next";
import { getSeoData, buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const seo = await getSeoData("global");
    return {
      ...buildMetadata(seo, process.env.NEXT_PUBLIC_APP_URL as string),
      robots: { index: false, follow: false },
    };
  } catch {
    return { robots: { index: false, follow: false } };
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
