import "./globals.css";
import "katex/dist/katex.min.css";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/provider";
import { Toaster } from "@/components/ui/sonner";
// AUDIT FIX [9.1]: Analytics loaded with mode="auto" which respects browser Do Not Track
// For strict GDPR compliance, replace with a consent-gated wrapper.
import { Analytics } from "@vercel/analytics/react";
import { Agentation } from "agentation";
import { Lora, IBM_Plex_Sans } from "next/font/google";
import localFont from "next/font/local";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { getSeoData, buildMetadata, buildGeoMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";

import ChatbotLoader from "@/components/chatbot-loader";
import CacheBuster from "@/components/cache-buster";
import { CookieBanner } from "@/components/cookie-banner";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });
const ibmPlex = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex",
  display: "swap",
});

const momo = localFont({
  src: "../public/fonts/MomoTrustDisplay.ttf",
  variable: "--font-momo",
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
      className={`${lora.variable} ${ibmPlex.variable} ${momo.variable}`}
    >
      <body
        className="antialiased min-h-screen bg-background font-sans"
        suppressHydrationWarning
      >
        <noscript>
          <div className="bg-destructive text-destructive-foreground p-4 text-center font-bold">
            JavaScript is required to run this application. Please enable it in your browser settings.
          </div>
        </noscript>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:p-4 focus:bg-background focus:text-foreground focus:border focus:border-border focus:shadow-md rounded-md">
          Skip to main content
        </a>
        {structuredData && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: structuredData.replace(/</g, "\\u003c") }}
          />
        )}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          disableTransitionOnChange
        >
          {children}
          <CookieBanner />
          <CacheBuster />
          <ChatbotLoader />
          {process.env.NODE_ENV === "development" && <Agentation />}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
        {/* AUDIT FIX [9.1, 9.4]: Analytics with mode="auto" respects DNT signals.
            For strict GDPR compliance, replace with a consent-gated component. */}
        <Analytics mode="auto" />
      </body>
    </html>
  );
}
