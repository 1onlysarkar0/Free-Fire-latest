export const dynamic = "force-dynamic";

import { verifyPanelAccess } from "@/lib/panel-auth";
import { db } from "@/db/drizzle";
import { customPage } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getAdminStatsCached } from "@/lib/admin-data";
import AdminDashboardHome from "./_components/admin-dashboard-home";
import { Navbar } from "@/components/navbar";
import FooterSection from "@/components/homepage/footer";
import { MarkdownRenderer } from "@/components/markdown-renderer";

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

  const page = await getPublishedPage(dynamicSlug);

  if (!page) return {};
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
    keywords: page.metaKeywords || undefined,
    robots: page.robots ? { index: page.robots.includes("index"), follow: page.robots.includes("follow") } : undefined,
    openGraph: page.ogImage ? { images: [page.ogImage] } : undefined,
  };
}

export default async function DynamicSlugPage({ params }: Props) {
  const { dynamicSlug } = await params;
  const authState = await verifyPanelAccess(dynamicSlug);

  if (authState.isPanel) {
    // Fetch all stats in parallel for instant dashboard render (no client-side spinner)
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

  // 2. Otherwise, look up published custom page (cached 1hr, tag: custom-pages)
  const page = await getPublishedPage(dynamicSlug);

  if (!page) notFound();

  let cleanContent = page.content;
  if (cleanContent.startsWith("<!-- MODE:MARKDOWN -->\n")) cleanContent = cleanContent.replace("<!-- MODE:MARKDOWN -->\n", "");
  if (cleanContent.startsWith("<!-- MODE:VISUAL -->\n")) cleanContent = cleanContent.replace("<!-- MODE:VISUAL -->\n", "");

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-x-hidden">
      <Navbar />
      <div className="flex-1 w-full flex flex-col">
        <section className="mx-auto w-full max-w-5xl px-6 pt-32 pb-24">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-10 font-lora">{page.title}</h1>
          <MarkdownRenderer content={cleanContent} />
        </section>
      </div>
      <FooterSection />
    </div>
  );
}
