import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { customPage, tournament, navigationItem, seoConfig } from "@/db/schema";
import { eq, ne, desc } from "drizzle-orm";
import { getAdminSiteConfigCached } from "@/lib/admin-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_APP_URL environment variable is required");
  
  try {
    const [config, seoConfigs, pages, activeTournaments, navItems] = await Promise.all([
      getAdminSiteConfigCached(),
      db.select().from(seoConfig),
      db
        .select({ slug: customPage.slug, title: customPage.title, metaDescription: customPage.metaDescription })
        .from(customPage)
        .where(eq(customPage.status, "published")),
      db
        .select({ id: tournament.id, name: tournament.name, gameMode: tournament.gameMode, prizePool: tournament.prizePool, joiningFee: tournament.joiningFee, teamFormat: tournament.teamFormat })
        .from(tournament)
        .where(ne(tournament.status, "CANCELLED"))
        .orderBy(desc(tournament.createdAt))
        .limit(10),
      db.select().from(navigationItem)
    ]);

    const seoMap = new Map<string, typeof seoConfig.$inferSelect>();
    for (const s of seoConfigs) {
      seoMap.set(s.id, s);
    }

    const globalSeo = seoMap.get("global");
    const llmsSeo = seoMap.get("llms-txt");

    const siteName = config?.logoTitle || globalSeo?.metaTitle || "";
    const siteDescription = llmsSeo?.metaDescription || globalSeo?.metaDescription || "";

    let md = `# ${siteName}\n\n`;
    md += `## About\n${siteDescription}\n\n`;

    md += `## Navigation and Information Routes\n\n`;
    md += `### Public Navigation Links\n`;

    const publicNavs = navItems.filter(item => !item.isSocial && !item.url.startsWith("http"));
    if (publicNavs.length > 0) {
      for (const item of publicNavs) {
        md += `- [${item.title}](${baseUrl}${item.url.startsWith("/") ? "" : "/"}${item.url})${item.description ? ` — ${item.description}` : ""}\n`;
      }
    } else {
      const homeSeo = seoMap.get("home");
      const tourSeo = seoMap.get("tournaments");
      md += `- [Home Page](${baseUrl}/)${homeSeo?.metaDescription ? ` — ${homeSeo.metaDescription}` : ""}\n`;
      md += `- [Tournaments Directory](${baseUrl}/tournaments)${tourSeo?.metaDescription ? ` — ${tourSeo.metaDescription}` : ""}\n`;
    }

    // Dynamic custom pages from database
    if (pages.length > 0) {
      md += `\n### Custom Pages\n`;
      for (const page of pages) {
        const pageSeo = seoMap.get(`page-${page.slug}`);
        md += `- [${page.title}](${baseUrl}/${page.slug})${pageSeo?.metaDescription || page.metaDescription ? ` — ${pageSeo?.metaDescription || page.metaDescription}` : ""}\n`;
      }
    }

    md += `\n### User Account & Profile (Authentication Required)\n`;
    const dashSeo = seoMap.get("dashboard");
    md += `- [User Dashboard](${baseUrl}/dashboard)${dashSeo?.metaDescription ? ` — ${dashSeo.metaDescription}` : ""}\n`;

    const lobbySeo = seoMap.get("dashboard-my-tournaments") || seoMap.get("my-tournaments");
    md += `- [My Tournaments Lobby](${baseUrl}/dashboard/my-tournaments)${lobbySeo?.metaDescription ? ` — ${lobbySeo.metaDescription}` : ""}\n`;

    const walletSeo = seoMap.get("dashboard-wallet") || seoMap.get("wallet");
    md += `- [My Wallet Manager](${baseUrl}/dashboard/wallet)${walletSeo?.metaDescription ? ` — ${walletSeo.metaDescription}` : ""}\n`;

    const settingsSeo = seoMap.get("dashboard-settings") || seoMap.get("settings");
    md += `- [Profile & Security Settings](${baseUrl}/dashboard/settings)${settingsSeo?.metaDescription ? ` — ${settingsSeo.metaDescription}` : ""}\n`;

    md += `\n### Authentication Routes\n`;
    const signinSeo = seoMap.get("sign-in");
    md += `- [Sign In](${baseUrl}/sign-in)${signinSeo?.metaDescription ? ` — ${signinSeo.metaDescription}` : ""}\n`;

    const signupSeo = seoMap.get("sign-up");
    md += `- [Sign Up](${baseUrl}/sign-up)${signupSeo?.metaDescription ? ` — ${signupSeo.metaDescription}` : ""}\n`;

    const forgotSeo = seoMap.get("forgot-password");
    md += `- [Forgot Password](${baseUrl}/forgot-password)${forgotSeo?.metaDescription ? ` — ${forgotSeo.metaDescription}` : ""}\n`;

    // Dynamic Tournaments from database
    if (activeTournaments.length > 0) {
      md += `\n## Active Tournaments\n\n`;
      for (const t of activeTournaments) {
        const tournamentSeo = seoMap.get(`tournament-${t.id}`);
        const modeLabel = t.gameMode.replace(/_/g, " ").toUpperCase();
        const formatLabel = t.teamFormat.toUpperCase();
        md += `- **[${t.name}](${baseUrl}/tournaments/${t.id})**${tournamentSeo?.metaDescription ? ` — ${tournamentSeo.metaDescription}` : ""}\n`;
      }
    }

    // Official contact links from database
    md += `\n## Official Contact\n`;
    if (config?.contactEmail) {
      md += `- **Support Email**: [${config.contactEmail}](mailto:${config.contactEmail})\n`;
    }
    if (config?.logoUrl) {
      md += `- **Branding URL**: [${siteName}](${baseUrl}${config.logoUrl})\n`;
    }

    // Entities and references from llms-txt DB config (seeded in seed-db.ts)
    let entities: { name: string; description: string }[] = [];
    let references: string[] = [];

    if (llmsSeo?.structuredDataJson) {
      try {
        const parsed = JSON.parse(llmsSeo.structuredDataJson);
        if (Array.isArray(parsed.entities)) {
          entities = parsed.entities;
        }
        if (Array.isArray(parsed.references)) {
          references = parsed.references;
        }
      } catch (e) {
        console.error("Failed to parse custom llms-txt schema data:", e);
      }
    }

    if (entities.length > 0) {
      md += `\n## Entity Definitions (for AI understanding)\n`;
      for (const ent of entities) {
        md += `- **${ent.name}**: ${ent.description}\n`;
      }
    }

    if (references.length > 0) {
      md += `\n## Structured Data References\n`;
      for (const ref of references) {
        md += `- ${ref}\n`;
      }
    }
    
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err) {
    console.error("Error generating llms.txt:", err);
    return new NextResponse("Error generating llms.txt", { status: 500 });
  }
}
