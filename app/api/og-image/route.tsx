import { ImageResponse } from "next/og";
import { db } from "@/db/drizzle";
import { tournament, siteConfig, seoConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import React from "react";

// Templates
import { TournamentOgTemplate } from "@/lib/og-image/templates/tournament";
import { HomepageOgTemplate } from "@/lib/og-image/templates/homepage";
import { CustomPageOgTemplate } from "@/lib/og-image/templates/custom-page";
import { AuthPageOgTemplate } from "@/lib/og-image/templates/auth-page";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const template = searchParams.get("template") || "home";
    const tournamentId = searchParams.get("tournament");

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      return new Response("Missing NEXT_PUBLIC_APP_URL environment variable", { status: 500 });
    }
    const siteDomain = baseUrl.replace(/^https?:\/\//, "");

    // Fetch site config branding
    const [configRow] = await db.select().from(siteConfig).limit(1);
    const siteName = configRow?.logoTitle;
    if (!siteName) {
      return new Response("Site name branding not configured in database", { status: 404 });
    }

    // 1. Tournament Template
    if (tournamentId) {
      const [t] = await db
        .select()
        .from(tournament)
        .where(eq(tournament.id, tournamentId))
        .limit(1);

      if (!t) {
        return new Response("Tournament not found", { status: 404 });
      }

      // Format date beautifully
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
          headers: {
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        }
      );
    }

    // 2. Auth Page Template
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
        return new Response(`Authentication page SEO config not found in database for page: ${pageType}`, { status: 404 });
      }

      return new ImageResponse(
        <AuthPageOgTemplate data={{ title, description, siteName, siteDomain }} />,
        {
          width: 1200,
          height: 630,
          headers: {
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        }
      );
    }

    // 3. Custom Page Template
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
        return new Response(`Custom page metadata not configured in database for slug: ${slug}`, { status: 404 });
      }

      return new ImageResponse(
        <CustomPageOgTemplate data={{ title, description, siteName, siteDomain }} />,
        {
          width: 1200,
          height: 630,
          headers: {
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        }
      );
    }

    // 4. Default / Homepage Template
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
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      }
    );
  } catch (error: any) {
    console.error("OG Image generation failed:", error);
    return new Response("Failed to generate image due to missing database records or server issue", { status: 500 });
  }
}
