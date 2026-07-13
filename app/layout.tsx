import "./globals.css";
import "katex/dist/katex.min.css";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/provider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { Agentation } from "agentation";
import { Lora, IBM_Plex_Sans } from "next/font/google";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { getSeoData, buildMetadata, buildGeoMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";

import ChatbotLoader from "@/components/chatbot-loader";
import CacheBuster from "@/components/cache-buster";

const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });
const ibmPlex = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ff4d00" },
    { media: "(prefers-color-scheme: dark)", color: "#ff4d00" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [config, seo, siteUrl] = await Promise.all([
      getAdminSiteConfigCached(),
      getSeoData("global"),
      getSiteUrl(),
    ]);

    const siteName = config?.logoTitle ?? null;
    const logoSrc = config?.logoSrc ?? null;
    const locale = "en_IN";

    const metadata = buildMetadata(seo, siteUrl || undefined, siteName || undefined, logoSrc || undefined, locale, "/");

    if (siteUrl) metadata.metadataBase = new URL(siteUrl);

    if (siteName) {
      metadata.authors = [{ name: siteName }];
      metadata.creator = siteName;
      metadata.publisher = siteName;
    }

    if (siteUrl) {
      if (!metadata.title) {
        metadata.title = {
          default: siteName || "",
          template: siteName ? `%s | ${siteName}` : "%s",
        };
      }
    }

    metadata.other = {
      ...buildGeoMetadata(),
      "msvalidate.01": "916CB07EE8AE31B93BDADD076F476746",
    };

    return metadata;
  } catch {
    return {};
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let structuredData: string | null = null;
  let siteUrl = "";
  let siteName = "";
  try {
    const [seo, config] = await Promise.all([
      getSeoData("global"),
      getAdminSiteConfigCached(),
    ]);
    if (seo.structuredDataJson) {
      JSON.parse(seo.structuredDataJson);
      structuredData = seo.structuredDataJson;
    }
    siteName = config?.logoTitle || "";
    siteUrl = await getSiteUrl();
  } catch {}

  return (
    <html
      lang="en-IN"
      suppressHydrationWarning
      className={`${lora.variable} ${ibmPlex.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://jdj14ctwppwprnqu.public.blob.vercel-storage.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://jdj14ctwppwprnqu.public.blob.vercel-storage.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body
        className="antialiased min-h-screen bg-background font-sans"
        suppressHydrationWarning
      >
        {structuredData && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: structuredData.replace(/</g, "\\u003c") }}
          />
        )}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <CacheBuster />
          <ChatbotLoader />
          {process.env.NODE_ENV === "development" && <Agentation />}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
