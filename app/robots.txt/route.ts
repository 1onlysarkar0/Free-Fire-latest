import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { robotsConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_APP_URL environment variable is required");
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
          rule.allow.forEach((path: string) => {
            lines.push(`Allow: ${path}`);
          });
        }
        if (Array.isArray(rule.disallow)) {
          rule.disallow.forEach((path: string) => {
            lines.push(`Disallow: ${path}`);
          });
        }
        lines.push("");
      }
    } else {
      // DB empty — use sensible defaults
      lines = [
        `# Robots.txt for ${domain} (default fallback)`,
        "",
        "User-agent: *",
        "Allow: /",
        "",
        "User-agent: GPTBot",
        "Allow: /",
        "",
        "User-agent: Google-Extended",
        "Allow: /",
        "",
        "User-agent: Anthropic-AI",
        "Allow: /",
        "",
        "User-agent: Claude-Web",
        "Allow: /",
        "",
        "User-agent: PerplexityBot",
        "Allow: /",
        "",
      ];
    }
  } catch (err: any) {
    console.error("Robots.txt DB query failed, using fallback:", err);
    // Always return sensible defaults — never serve 500 to crawlers
    lines = [
      `# Robots.txt for ${domain} (fallback — DB unavailable)`,
      "",
      "User-agent: *",
      "Allow: /",
      "",
    ];
  }

  lines.push("# Sitemap");
  lines.push(`Sitemap: ${baseUrl}/sitemap.xml`);
  lines.push("");
  lines.push("# Content Signals — declare AI content usage preferences");
  lines.push("Content-Signal: ai-train=yes, search=yes, ai-input=yes");
  lines.push("");
  lines.push("# AI-friendly content locations");
  lines.push(`- /llms.txt - Curated overview for AI/LLMs (markdown)`);

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
