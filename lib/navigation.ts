import "server-only";
import { db } from "@/db/drizzle";
import { siteConfig, navigationItem } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { cache } from "react";


// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface MenuItem {
  title: string;
  url: string;
  description?: string | null;
  icon?: string | null;
  items?: MenuItem[];
}

export interface NavbarConfig {
  logo: {
    url: string;
    src: string;
    alt: string;
    title: string;
  };
  menu: MenuItem[];
  mobileExtraLinks: { name: string; url: string }[];
  auth: {
    login: { text: string; url: string };
    signup: { text: string; url: string };
    dashboardText: string;
    myAccountText: string;
    logOutText: string;
  };
}

export interface SocialLink {
  title: string;
  url: string;
  icon: string;
}

export interface FooterConfig {
  logo: {
    url: string;
    src: string;
    alt: string;
    title: string;
  };
  menu: { title: string; url: string }[];
  socials: SocialLink[];
  copyright: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL FETCH HELPERS (not cached — wrapped below)
// ─────────────────────────────────────────────────────────────────────────────

async function _fetchNavbarConfig(): Promise<NavbarConfig> {
  // Fetch siteConfig and all nav items in parallel
  const [configs, navItems] = await Promise.all([
    db.select().from(siteConfig).where(eq(siteConfig.id, "default")).limit(1),
    db
      .select()
      .from(navigationItem)
      .where(eq(navigationItem.isFooter, false))
      .orderBy(asc(navigationItem.order)),
  ]);

  const configRow = configs[0];

  if (!configRow) {
    throw new Error(
      "Site configuration not found in database. Run 'npm run db:seed' to populate."
    );
  }

  const mobileExtraLinks = navItems
    .filter((item) => item.isMobileExtra)
    .map((item) => ({ name: item.title, url: item.url }));

  const regularItems = navItems.filter((item) => !item.isMobileExtra);

  // Build nested menu tree
  const menuMap = new Map<string, MenuItem & { id: string; parentId: string | null }>();
  for (const item of regularItems) {
    menuMap.set(item.id, {
      id: item.id,
      parentId: item.parentId,
      title: item.title,
      url: item.url,
      description: item.description,
      icon: item.icon,
      items: [],
    });
  }

  const roots: MenuItem[] = [];
  for (const node of menuMap.values()) {
    if (node.parentId && menuMap.has(node.parentId)) {
      menuMap.get(node.parentId)!.items!.push(node);
    } else {
      roots.push(node);
    }
  }

  const cleanMenu = (items: MenuItem[]): MenuItem[] =>
    items.map((item) => {
      const cleaned: MenuItem = { title: item.title, url: item.url };
      if (item.description) cleaned.description = item.description;
      if (item.icon)        cleaned.icon = item.icon;
      if (item.items?.length) cleaned.items = cleanMenu(item.items);
      return cleaned;
    });

  return {
    logo: {
      url:   configRow.logoUrl,
      src:   configRow.logoSrc || "/assets/favicon.png",
      alt:   configRow.logoAlt,
      title: configRow.logoTitle,
    },
    menu: cleanMenu(roots),
    mobileExtraLinks,
    auth: {
      login:  { text: configRow.authLoginText,  url: configRow.authLoginUrl },
      signup: { text: configRow.authSignupText, url: configRow.authSignupUrl },
      dashboardText: configRow.navbarDashboardText ?? "Dashboard",
      myAccountText: configRow.userProfileMyAccountText ?? "My Account",
      logOutText: configRow.userProfileLogOutText ?? "Log out",
    },
  };
}

async function _fetchFooterConfig(): Promise<FooterConfig> {
  const [configs, navItems, socialItems] = await Promise.all([
    db.select().from(siteConfig).where(eq(siteConfig.id, "default")).limit(1),
    db.select().from(navigationItem)
      .where(and(eq(navigationItem.isFooter, true), eq(navigationItem.isSocial, false)))
      .orderBy(asc(navigationItem.order)),
    db.select().from(navigationItem)
      .where(and(eq(navigationItem.isFooter, true), eq(navigationItem.isSocial, true)))
      .orderBy(asc(navigationItem.order)),
  ]);

  const configRow = configs[0];

  if (!configRow) {
    throw new Error(
      "Site configuration not found in database. Run 'npm run db:seed' to populate."
    );
  }

  return {
    logo: {
      url:   configRow.logoUrl,
      src:   configRow.logoSrc || "/assets/favicon.png",
      alt:   configRow.logoAlt,
      title: configRow.logoTitle,
    },
    menu: navItems.map((item) => ({ title: item.title, url: item.url })),
    socials: socialItems.map((item) => ({
      title: item.title,
      url:   item.url,
      icon:  item.icon || "Globe",
    })),
    copyright: configRow.copyrightText ?? `© ${new Date().getFullYear()} ${configRow.logoTitle}. All rights reserved.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIRECT PUBLIC EXPORTS (uncached)
// ─────────────────────────────────────────────────────────────────────────────

export const getNavbarConfig = cache(_fetchNavbarConfig);

export const getFooterConfig = cache(_fetchFooterConfig);
