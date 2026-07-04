import { ImageResponse } from "next/og";
import { db } from "@/db/drizzle";
import { tournament, siteConfig, seoConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import React from "react";

import { TournamentOgTemplate } from "@/lib/og-image/templates/tournament";
import { HomepageOgTemplate } from "@/lib/og-image/templates/homepage";
import { CustomPageOgTemplate } from "@/lib/og-image/templates/custom-page";
import { AuthPageOgTemplate } from "@/lib/og-image/templates/auth-page";
import { FaqOgTemplate } from "@/lib/og-image/templates/faq";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const template = searchParams.get("template") || "home";
    const tournamentId = searchParams.get("tournament");

    const [baseUrl, configRow] = await Promise.all([
      getSiteUrl(),
      db.select().from(siteConfig).limit(1).then(rows => rows[0] || null),
    ]);

    if (!baseUrl) {
      return new Response("Site URL not configured in database", { status: 500 });
    }
    const siteDomain = baseUrl.replace(/^https?:\/\//, "");
    const siteName = configRow?.logoTitle;
    if (!siteName) {
      return new Response("Site name branding not configured in database", { status: 404 });
    }

    if (tournamentId) {
      const [t] = await db
        .select()
        .from(tournament)
        .where(eq(tournament.id, tournamentId))
        .limit(1);

      if (!t) {
        return new Response("Tournament not found", { status: 404 });
      }

      const formattedDate = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }).format(new Date(t.startTime));

      const data = {
        tournamentName: t.name,
        format: t.teamFormat,
        prizePool: t.prizePool,
        entryFee: t.joiningFee,
        gameMode: t.gameMode,
        startTime: formattedDate + " IST",
        status: t.status,
        siteName,
      };

      return new ImageResponse(
        <TournamentOgTemplate data={data} />,
        {
          width: 1200,
          height: 630,
          headers: { "Cache-Control": "public, max-age=31536000, immutable" },
        }
      );
    }

    if (template === "faq") {
      const [seo] = await db
        .select()
        .from(seoConfig)
        .where(eq(seoConfig.id, "page-faq"))
        .limit(1);

      const title = seo?.ogTitle || seo?.metaTitle || "Frequently Asked Questions";
      const description = seo?.ogDescription || seo?.metaDescription || "Find answers about tournament registration, wallet deposits, Room ID, and more.";

      return new ImageResponse(
        <FaqOgTemplate data={{ title, description, siteName, siteDomain }} />,
        {
          width: 1200,
          height: 630,
          headers: { "Cache-Control": "public, max-age=31536000, immutable" },
        }
      );
    }

    if (template === "auth") {
      const pageType = searchParams.get("page") || "sign-in";

      const [seo] = await db
        .select()
        .from(seoConfig)
        .where(eq(seoConfig.id, pageType))
        .limit(1);

      const title = seo?.metaTitle;
      const description = seo?.metaDescription;

      if (!title || !description) {
        return new Response(`Authentication page SEO config not found for: ${pageType}`, { status: 404 });
      }

      return new ImageResponse(
        <AuthPageOgTemplate data={{ title, description, siteName, siteDomain }} />,
        {
          width: 1200,
          height: 630,
          headers: { "Cache-Control": "public, max-age=31536000, immutable" },
        }
      );
    }

    if (template === "custom-page") {
      const slug = searchParams.get("slug");
      if (!slug) {
        return new Response("Missing custom page slug parameter", { status: 400 });
      }

      const [seo] = await db
        .select()
        .from(seoConfig)
        .where(eq(seoConfig.id, `page-${slug}`))
        .limit(1);

      const title = seo?.metaTitle;
      const description = seo?.metaDescription;

      if (!title || !description) {
        return new Response(`Custom page metadata not configured for slug: ${slug}`, { status: 404 });
      }

      return new ImageResponse(
        <CustomPageOgTemplate data={{ title, description, siteName, siteDomain }} />,
        {
          width: 1200,
          height: 630,
          headers: { "Cache-Control": "public, max-age=31536000, immutable" },
        }
      );
    }

    const [homeSeo] = await db
      .select()
      .from(seoConfig)
      .where(eq(seoConfig.id, "home"))
      .limit(1);

    const title = homeSeo?.metaTitle || configRow?.heroHeadline;
    const description = homeSeo?.metaDescription || configRow?.heroSubheadline;

    if (!title || !description) {
      return new Response("Homepage SEO or Hero Configuration not found in database", { status: 404 });
    }

    return new ImageResponse(
      <HomepageOgTemplate data={{ title, description, siteName, siteDomain }} />,
      {
        width: 1200,
        height: 630,
        headers: { "Cache-Control": "public, max-age=31536000, immutable" },
      }
    );
  } catch (error: any) {
    console.error("OG Image generation failed:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
