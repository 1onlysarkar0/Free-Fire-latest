import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/provider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { Agentation } from "agentation";
import { Lora, IBM_Plex_Sans } from "next/font/google";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { getSeoData } from "@/lib/seo";

import ChatbotLoader from "@/components/chatbot-loader";

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
    const [config, seo] = await Promise.all([
      getAdminSiteConfigCached(),
      getSeoData("global"),
    ]);

    const siteName = config?.logoTitle || undefined;
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL;
    const metadata: Metadata = {};

    if (siteUrl) metadata.metadataBase = new URL(siteUrl);

    if (siteName || seo.metaTitle) {
      metadata.title = {
        default: seo.metaTitle ?? siteName ?? "",
        template: siteName ? `%s | ${siteName}` : "%s",
      };
    }

    if (seo.metaDescription) metadata.description = seo.metaDescription;
    if (seo.metaKeywords) metadata.keywords = seo.metaKeywords;
    if (seo.robots) metadata.robots = seo.robots as Metadata["robots"];
    if (seo.canonicalUrl) metadata.alternates = { canonical: seo.canonicalUrl };

    if (siteName) {
      metadata.authors = [{ name: siteName }];
      metadata.creator = siteName;
      metadata.publisher = siteName;
    }

    const logoSrc = config?.logoSrc || "/assets/logo.webp";
    metadata.manifest = "/assets/site.webmanifest";
    metadata.icons = {
      icon: [
        { url: logoSrc, type: "image/png" },
        { url: "/assets/favicon-96x96.png", sizes: "96x96", type: "image/png" },
        { url: "/assets/favicon.ico", sizes: "any" },
        { url: "/assets/favicon-dark.png", media: "(prefers-color-scheme: dark)", type: "image/png" },
      ],
      apple: [
        { url: "/assets/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    };

    const ogImageFallback = seo.ogImage || "/assets/og-image.webp";
    const twitterImageFallback = seo.twitterImage || seo.ogImage || "/assets/og-image.webp";

    if (seo.ogTitle || seo.ogDescription || ogImageFallback || siteName) {
      metadata.openGraph = {
        type: (seo.ogType ?? "website") as "website",
        url: seo.canonicalUrl ?? siteUrl ?? undefined,
        siteName: siteName ?? undefined,
        locale: "en_IN",
        title: seo.ogTitle ?? seo.metaTitle ?? undefined,
        description: seo.ogDescription ?? seo.metaDescription ?? undefined,
        images: [{ url: ogImageFallback, width: 1200, height: 630 }],
      };
    }

    if (seo.twitterCard || seo.twitterTitle || seo.twitterDescription || siteName) {
      metadata.twitter = {
        card: (seo.twitterCard ?? "summary_large_image") as "summary_large_image",
        site: seo.twitterSite ?? undefined,
        title: seo.twitterTitle ?? seo.ogTitle ?? seo.metaTitle ?? undefined,
        description:
          seo.twitterDescription ?? seo.ogDescription ?? seo.metaDescription ?? undefined,
        images: [twitterImageFallback],
      };
    }

    metadata.other = {
      "geo.region": "IN",
      "geo.country": "India",
      language: "en-IN",
      "content-language": "en-IN",
      HandheldFriendly: "True",
      MobileOptimized: "width",
      "format-detection": "telephone=no",
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
  try {
    const seo = await getSeoData("global");
    if (seo.structuredDataJson) {
      JSON.parse(seo.structuredDataJson);
      structuredData = seo.structuredDataJson;
    }
  } catch {
    structuredData = null;
  }

  return (
    <html
      lang="en-IN"
      suppressHydrationWarning
      className={`${lora.variable} ${ibmPlex.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/google-font-preconnect */}
        <link
          rel="preload"
          href="https://fonts.gstatic.com/s/momotrustdisplay/v2/WWXPlieNYgyPZLyBUuEkKZFhFHyjqb1emGZJ.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        {structuredData && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: structuredData }}
          />
        )}
      </head>
      <body
        className="antialiased min-h-screen bg-background font-sans"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <ChatbotLoader />
          {process.env.NODE_ENV === "development" && <Agentation />}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
