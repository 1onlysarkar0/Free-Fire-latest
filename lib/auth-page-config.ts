import "server-only";
import { db } from "@/db/drizzle";
import { siteConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "react";

export interface AuthPageConfig {
  logo: {
    url: string;
    src: string;
    alt: string;
    title: string;
  };
  panel: {
    imageUrl: string | null;
    color: string;
  };
  copyright: string;
}

async function _fetchAuthPageConfig(): Promise<AuthPageConfig> {
  const rows = await db
    .select()
    .from(siteConfig)
    .where(eq(siteConfig.id, "default"))
    .limit(1);

  const row = rows[0];

  if (!row) {
    throw new Error(
      "Site configuration not found in database. Run 'npm run db:seed' to populate."
    );
  }

  return {
    logo: {
      url:   row.logoUrl,
      src:   row.logoSrc || "/assets/logo.svg",
      alt:   row.logoAlt,
      title: row.logoTitle,
    },
    panel: {
      imageUrl: row.authPanelImageUrl ?? null,
      color:    row.authPanelColor   ?? "#FF5A1F",
    },
    copyright: row.copyrightText ?? `© ${new Date().getFullYear()} ${row.logoTitle}. All rights reserved.`,
  };
}

export const getAuthPageConfig = cache(_fetchAuthPageConfig);
