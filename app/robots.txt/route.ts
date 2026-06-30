import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.1onlysarkar.shop";
  const domain = baseUrl.replace(/^https?:\/\//, "");

  const lines = [
    `# Robots.txt for ${domain}`,
    "",
    "User-agent: *",
    "Allow: /",
    "",
    "# Sitemap",
    `Sitemap: ${baseUrl}/sitemap.xml`,
    "",
    "# AI/LLM friendly content",
    "# See https://llmstxt.org for the llms.txt specification",
    "# llms.txt provides curated content for AI assistants and LLMs",
    "",
    "# Allow AI crawlers to access markdown versions of pages",
    "User-agent: GPTBot",
    "Allow: /",
    "",
    "User-agent: ChatGPT-User",
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
    "User-agent: CCBot",
    "Allow: /",
    "",
    "User-agent: PerplexityBot",
    "Allow: /",
    "",
    "User-agent: Cohere-ai",
    "Allow: /",
    "",
    "# Content Signals — declare AI content usage preferences",
    "# See https://contentsignals.org/ and https://datatracker.ietf.org/doc/draft-romm-aipref-contentsignals/",
    "Content-Signal: ai-train=yes, search=yes, ai-input=yes",
    "",
    "# AI-friendly content locations",
    `- /llms.txt - Curated overview for AI/LLMs (markdown)`
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
