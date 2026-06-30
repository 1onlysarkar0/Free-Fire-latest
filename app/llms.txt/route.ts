import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { customPage, tournament } from "@/db/schema";
import { eq, ne, desc } from "drizzle-orm";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { getSeoData } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.1onlysarkar.shop";
  
  try {
    const [config, seoGlobal, pages, activeTournaments] = await Promise.all([
      getAdminSiteConfigCached(),
      getSeoData("global"),
      db
        .select({ slug: customPage.slug, title: customPage.title, metaDescription: customPage.metaDescription })
        .from(customPage)
        .where(eq(customPage.status, "published")),
      db
        .select({ id: tournament.id, name: tournament.name, gameMode: tournament.gameMode, prizePool: tournament.prizePool, joiningFee: tournament.joiningFee, teamFormat: tournament.teamFormat })
        .from(tournament)
        .where(ne(tournament.status, "CANCELLED"))
        .orderBy(desc(tournament.createdAt))
        .limit(10)
    ]);

    const siteName = config?.logoTitle || seoGlobal.metaTitle || "Gaming Tournament";
    const siteDescription = seoGlobal.metaDescription || "Esports tournament platform.";

    let md = `# ${siteName}\n\n`;
    md += `## About\n${siteDescription}\n\n`;

    md += `## Navigation and Information Routes\n\n`;
    md += `### Info & Support Pages (Public)\n`;
    md += `- [Home Page](${baseUrl}/) — Main landing page featuring live tournament marquee, top player leaderboard, and registration CTA.\n`;
    md += `- [Tournaments Listing](${baseUrl}/tournaments) — Directory of all active, upcoming, and completed tournaments.\n`;

    // Dynamic custom pages from database
    if (pages.length > 0) {
      for (const page of pages) {
        md += `- [${page.title}](${baseUrl}/${page.slug}) — ${page.metaDescription || "Custom page."}\n`;
      }
    }

    md += `\n### User Account & Profile (Authentication Required)\n`;
    md += `- [User Dashboard](${baseUrl}/dashboard) — Overview of linked game profile, active wallet balance, and user level.\n`;
    md += `- [My Tournaments Lobby](${baseUrl}/dashboard/my-tournaments) — Access joined tournaments, check room IDs, retrieve room passwords, and review slot numbers.\n`;
    md += `- [My Wallet Manager](${baseUrl}/dashboard/wallet) — Deposit money via UPI, verify transaction status, and submit withdrawal requests.\n`;
    md += `- [Profile & Security Settings](${baseUrl}/dashboard/settings) — Update gaming handles, link Google accounts, and configure 2FA security.\n`;

    md += `\n### Authentication Routes\n`;
    md += `- [Sign In](${baseUrl}/sign-in) — Log in using registered email or via Google OAuth.\n`;
    md += `- [Sign Up](${baseUrl}/sign-up) — Create a new player account.\n`;
    md += `- [Forgot Password](${baseUrl}/forgot-password) — Request password reset link.\n`;

    // Dynamic Tournaments from database
    if (activeTournaments.length > 0) {
      md += `\n## Active Tournaments\n\n`;
      for (const t of activeTournaments) {
        const modeLabel = t.gameMode.replace(/_/g, " ").toUpperCase();
        const formatLabel = t.teamFormat.toUpperCase();
        md += `- **[${t.name}](${baseUrl}/tournaments/${t.id})** — Format: ${formatLabel} (${modeLabel}). Prize Pool: ₹${t.prizePool}. Joining Fee: ₹${t.joiningFee}.\n`;
      }
    }

    // Official links from database
    md += `\n## Official Contact\n`;
    if (config?.contactEmail) {
      md += `- **Support Email**: [${config.contactEmail}](mailto:${config.contactEmail})\n`;
    }
    if (config?.logoUrl) {
      md += `- **Branding URL**: [${siteName}](${baseUrl}${config.logoUrl})\n`;
    }
    
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Error generating llms.txt:", err);
    return new NextResponse("Error generating llms.txt", { status: 500 });
  }
}
