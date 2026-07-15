import "server-only";
import { db } from "@/db/drizzle";
import { authPageContent, siteConfig, faq } from "@/db/schema";
import { eq, inArray, asc } from "drizzle-orm";
import { cache } from "react";
import { getSharedSiteConfig } from "@/lib/site-config";

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
  const row = await getSharedSiteConfig();

  if (row) {
    return {
      title: "Tournament Overview",
      subtitle: "Live stats, player activity, and tournament data.",
      welcomeMessage: "Welcome to the tournament platform. Prepare to register, coordinate with your team, and dominate the rankings!",
      siteName: row.logoTitle,
      logoSrc: row.logoSrc || "/assets/logo.svg",
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
  const row = await getSharedSiteConfig();
  if (!row) {
    throw new Error(
      "Site configuration not found in database. Run 'npm run db:seed' to populate."
    );
  }
  return row;
}

export const getHeroConfig = cache(_fetchHeroConfig);

// ─────────────────────────────────────────────────────────────────────────────
// HOMEPAGE FAQS
// ─────────────────────────────────────────────────────────────────────────────

import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";

export async function getHomepageFaqs() {
  "use cache";
  cacheLife("minutes");
  cacheTag(CACHE_TAGS.faqs, "homepage-faqs");
  return db
    .select()
    .from(faq)
    .where(inArray(faq.order, [1, 3, 7, 13]))
    .orderBy(asc(faq.order))
    .catch(() => []);
}
