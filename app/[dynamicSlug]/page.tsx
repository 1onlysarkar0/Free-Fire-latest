// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

import { verifyPanelAccess } from "@/lib/panel-auth";
import { db } from "@/db/drizzle";
import { customPage } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getAdminStatsCached, getAdminSiteConfigCached } from "@/lib/admin-data";
import AdminDashboardHome from "./_components/admin-dashboard-home";
import { Navbar } from "@/components/navbar";
import FooterSection from "@/components/homepage/footer";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { getSeoData, buildMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

async function getPublishedPage(slug: string) {
  const [page] = await db
    .select()
    .from(customPage)
    .where(and(eq(customPage.slug, slug), eq(customPage.status, "published")))
    .limit(1);
  return page ?? null;
}

interface Props {
  params: Promise<{ dynamicSlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { dynamicSlug } = await params;
  const authState = await verifyPanelAccess(dynamicSlug);

  if (authState.isPanel) {
    return { title: "Admin Panel", robots: { index: false, follow: false } };
  }

  const [page, seo, config, siteUrl] = await Promise.all([
    getPublishedPage(dynamicSlug),
    getSeoData(`page-${dynamicSlug}`),
    getAdminSiteConfigCached(),
    getSiteUrl(),
  ]);

  if (!page) return {};

  const siteName = config?.logoTitle || "";
  const baseUrl = siteUrl || process.env.NEXT_PUBLIC_APP_URL || "";

  return buildMetadata(
    seo,
    baseUrl || undefined,
    siteName || undefined,
    config?.logoSrc ?? undefined,
    undefined,
    `/${dynamicSlug}`
  );
}

export default async function DynamicSlugPage({ params }: Props) {
  const { dynamicSlug } = await params;
  const authState = await verifyPanelAccess(dynamicSlug);

  if (authState.isPanel) {
    const initialStats = await getAdminStatsCached();

    return (
      <AdminDashboardHome
        panelSlug={dynamicSlug}
        initialStats={initialStats}
        roleName={authState.roleName}
        isAdmin={authState.isAdmin}
        permissions={authState.permissions}
      />
    );
  }

  const page = await getPublishedPage(dynamicSlug);

  if (!page) notFound();

  const [seo, config, siteUrl] = await Promise.all([
    getSeoData(`page-${dynamicSlug}`).catch(() => null),
    getAdminSiteConfigCached().catch(() => null),
    getSiteUrl().catch(() => ""),
  ]);

  const siteName = config?.logoTitle || "";
  const baseUrl = siteUrl || process.env.NEXT_PUBLIC_APP_URL || "";

  let structuredData: any = null;
  if (seo?.structuredDataJson) {
    try {
      structuredData = JSON.parse(seo.structuredDataJson);
    } catch {}
  }

  if (!structuredData && page) {
    if (dynamicSlug === "how-to-join") {
      structuredData = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "How to Join a Free Fire Tournament on 1OnlySarkar",
        "description": "Step-by-step guide to register, add funds, book slots, and join custom room matches.",
        "step": [
          {
            "@type": "HowToStep",
            "position": 1,
            "name": "Create Account",
            "url": `${baseUrl}/sign-up`,
            "itemListElement": [
              { "@type": "HowToDirection", "text": "Register on the Sign Up page using your email or Google account." },
              { "@type": "HowToDirection", "text": "Set your Free Fire Game Name and UID in settings." }
            ]
          },
          {
            "@type": "HowToStep",
            "position": 2,
            "name": "Add Wallet Balance",
            "url": `${baseUrl}/dashboard/wallet`,
            "itemListElement": [
              { "@type": "HowToDirection", "text": "Scan the UPI QR code on the wallet page." },
              { "@type": "HowToDirection", "text": "Complete the payment and copy the transaction UTR number." },
              { "@type": "HowToDirection", "text": "Submit the UTR to instantly verify and credit your wallet." }
            ]
          },
          {
            "@type": "HowToStep",
            "position": 3,
            "name": "Join a Tournament",
            "url": `${baseUrl}/tournaments`,
            "itemListElement": [
              { "@type": "HowToDirection", "text": "Browse active tournaments on the platform." },
              { "@type": "HowToDirection", "text": "Select an available slot (Solo, Duo, or Squad) and register." }
            ]
          },
          {
            "@type": "HowToStep",
            "position": 4,
            "name": "Join the Custom Room",
            "itemListElement": [
              { "@type": "HowToDirection", "text": "Retrieve Room ID and Password from email or dashboard on match day." },
              { "@type": "HowToDirection", "text": "Open Free Fire, search for the Room ID, enter password, and play in your slot." }
            ]
          }
        ]
      };
    } else {
      structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": seo?.metaTitle || undefined,
        "description": seo?.metaDescription || undefined,
        "publisher": {
          "@type": "Organization",
          "name": siteName
        }
      };
    }
  }

  let cleanContent = page.content;
  if (cleanContent.startsWith("<!-- MODE:MARKDOWN -->\n")) cleanContent = cleanContent.replace("<!-- MODE:MARKDOWN -->\n", "");
  if (cleanContent.startsWith("<!-- MODE:VISUAL -->\n")) cleanContent = cleanContent.replace("<!-- MODE:VISUAL -->\n", "");

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-x-hidden">
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
      )}
      <Navbar />
      <div className="flex-1 w-full flex flex-col">
        <section className="mx-auto w-full max-w-5xl px-6 pt-32 pb-10">

          <MarkdownRenderer content={cleanContent} />
        </section>
      </div>
      <FooterSection />
    </div>
  );
}
