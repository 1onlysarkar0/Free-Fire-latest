import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { robotsConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "Google-Extended",
  "Anthropic-AI",
  "Claude-Web",
  "ClaudeBot",
  "PerplexityBot",
  "Perplexity-User",
  "cohere-ai",
  "Bytespider",
  "Applebot-Extended",
  "CCBot",
];

const DISALLOWED_PARAMS = ["?sort=", "?filter=", "?page=", "?ref="];

function getDefaultRobots(domain: string, baseUrl: string): string[] {
  const lines: string[] = [
    `# Robots.txt for ${domain}`,
    "",
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /dashboard/",
    "Disallow: /auth/",
    ...DISALLOWED_PARAMS.map((p) => `Disallow: ${p}`),
    "",
    "# AI Crawlers — explicitly allowed for LLM training and citation",
    ...AI_AGENTS.flatMap((agent) => [
      `User-agent: ${agent}`,
      "Allow: /",
      "Disallow: /api/",
      "Disallow: /dashboard/",
      "",
    ]),
  ];

  lines.push("# Sitemap");
  lines.push(`Sitemap: ${baseUrl}/sitemap.xml`);
  lines.push("");
  lines.push("# Content Signals");
  lines.push("Content-Signal: ai-train=yes, search=yes, ai-input=yes");
  lines.push("");
  lines.push("# AI-friendly content locations");
  lines.push(`See: ${baseUrl}/llms.txt`);
  lines.push(`See: ${baseUrl}/faq`);

  return lines;
}

export async function GET() {
  const baseUrl = await getSiteUrl();
  if (!baseUrl) {
    return new NextResponse("Site URL not configured", { status: 500 });
  }
  const domain = baseUrl.replace(/^https?:\/\//, "");

  let lines: string[] = [];

  try {
    const [config] = await db.select().from(robotsConfig).where(eq(robotsConfig.id, "default")).limit(1);

    if (config && Array.isArray(config.rules) && config.rules.length > 0) {
      lines.push(`# Robots.txt for ${domain} (DB-driven)`);
      lines.push("");

      for (const rule of config.rules as any[]) {
        lines.push(`User-agent: ${rule.userAgent || "*"}`);
        if (Array.isArray(rule.allow)) {
          rule.allow.forEach((path: string) => lines.push(`Allow: ${path}`));
        }
        if (Array.isArray(rule.disallow)) {
          rule.disallow.forEach((path: string) => lines.push(`Disallow: ${path}`));
        }
        lines.push("");
      }

      lines.push("# Sitemap");
      lines.push(`Sitemap: ${baseUrl}/sitemap.xml`);
    } else {
      lines = getDefaultRobots(domain, baseUrl);
    }
  } catch {
    lines = getDefaultRobots(domain, baseUrl);
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
