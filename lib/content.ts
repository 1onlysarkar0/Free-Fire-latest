import "server-only";
import { db } from "@/db/drizzle";
import { authPageContent, siteConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthPageTextData {
  quote: string;
  subtext: string;
}

export interface DashboardConfigData {
  title: string;
  subtitle: string;
  welcomeMessage: string;
  siteName: string;
  logoSrc: string;
  logoUrl: string;
  logoAlt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH PAGE TEXT
// Fetches the left-panel quote + subtext for each auth page from the DB.
// pageKey: "sign-in" | "sign-up" | "forgot-password" | "reset-password" | "complete-profile"
// ─────────────────────────────────────────────────────────────────────────────

async function _fetchAuthPageText(pageKey: string): Promise<AuthPageTextData> {
  const rows = await db
    .select()
    .from(authPageContent)
    .where(eq(authPageContent.id, pageKey))
    .limit(1);

  if (rows[0]) {
    return { quote: rows[0].quote, subtext: rows[0].subtext };
  }

  throw new Error(
    `Auth page text for "${pageKey}" not found in database. Run 'npm run db:seed' to populate.`
  );
}

export const getAuthPageText = cache((pageKey: string) => {
  return _fetchAuthPageText(pageKey);
});

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD CONFIG
// Fetches title, subtitle, welcome message, and site name from site_config.
// ─────────────────────────────────────────────────────────────────────────────

async function _fetchDashboardConfig(): Promise<DashboardConfigData> {
  const rows = await db
    .select()
    .from(siteConfig)
    .where(eq(siteConfig.id, "default"))
    .limit(1);

  if (rows[0]) {
    const row = rows[0];
    return {
      title: "Tournament Overview",
      subtitle: "Live stats, player activity, and tournament data.",
      welcomeMessage: "Welcome to the tournament platform. Prepare to register, coordinate with your team, and dominate the rankings!",
      siteName: row.logoTitle,
      logoSrc: row.logoSrc || "",
      logoUrl: row.logoUrl || "/",
      logoAlt: row.logoAlt || "Logo",
    };
  }

  throw new Error(
    "Site configuration not found in database. Run 'npm run db:seed' to populate."
  );
}

export const getDashboardConfig = cache(_fetchDashboardConfig);

// ─────────────────────────────────────────────────────────────────────────────
// HERO CONFIG
// Full site_config row used by the homepage hero section and top players banner.
// ─────────────────────────────────────────────────────────────────────────────

async function _fetchHeroConfig() {
  const [row] = await db
    .select()
    .from(siteConfig)
    .where(eq(siteConfig.id, "default"))
    .limit(1);
  if (!row) {
    throw new Error(
      "Site configuration not found in database. Run 'npm run db:seed' to populate."
    );
  }
  return row;
}

export const getHeroConfig = cache(_fetchHeroConfig);
