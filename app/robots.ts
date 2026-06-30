import type { MetadataRoute } from "next";


/**
 * Allowlist-based robots.txt.
 * Only public-facing routes are explicitly allowed.
 * Everything else (admin panel, dashboard, auth pages, API) is blocked via
 * a broad Disallow: / — the admin slug is never mentioned here.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/tournaments",
          "/tournaments/",
          "/sign-in",
          "/sign-up",
          "/forgot-password"
        ],
        disallow: [
          "/dashboard",
          "/api",
          "/reset-password",
          "/complete-profile",
        ],
      },
    ],
    sitemap: baseUrl ? `${baseUrl}/sitemap.xml` : undefined,
  };
}
