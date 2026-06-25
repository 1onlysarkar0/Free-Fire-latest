import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/provider";
import { Toaster } from "@/components/ui/sonner";
import dynamic from "next/dynamic";
import { Analytics } from "@vercel/analytics/react";
import { Agentation } from "agentation";
import { Inter, IBM_Plex_Sans } from "next/font/google";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { getSeoData } from "@/lib/seo";

const ChatbotWidget = dynamic(
  () => import("@/components/chatbot/chatbot-widget").then((m) => m.ChatbotWidget)
);

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
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

    if (seo.ogTitle || seo.ogDescription || seo.ogImage || siteName) {
      metadata.openGraph = {
        type: (seo.ogType ?? "website") as "website",
        url: seo.canonicalUrl ?? siteUrl ?? undefined,
        siteName: siteName ?? undefined,
        locale: "en_IN",
        title: seo.ogTitle ?? seo.metaTitle ?? undefined,
        description: seo.ogDescription ?? seo.metaDescription ?? undefined,
        ...(seo.ogImage && {
          images: [{ url: seo.ogImage, width: 1200, height: 630 }],
        }),
      };
    }

    if (seo.twitterCard || seo.twitterTitle || seo.twitterDescription || siteName) {
      metadata.twitter = {
        card: (seo.twitterCard ?? "summary_large_image") as "summary_large_image",
        site: seo.twitterSite ?? undefined,
        title: seo.twitterTitle ?? seo.ogTitle ?? seo.metaTitle ?? undefined,
        description:
          seo.twitterDescription ?? seo.ogDescription ?? seo.metaDescription ?? undefined,
        ...(seo.twitterImage && { images: [seo.twitterImage] }),
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
      className={`${inter.variable} ${ibmPlex.variable}`}
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
          <ChatbotWidget />
          {process.env.NODE_ENV === "development" && <Agentation />}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
