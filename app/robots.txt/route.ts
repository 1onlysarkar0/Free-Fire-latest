import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.1onlysarkar.shop";

  const lines = [
    "# As a condition of accessing this website, you agree to abide by the following",
    "# content signals:",
    "#",
    "# (a)  If a Content-Signal = yes, you may collect content for the corresponding",
    "#      use.",
    "# (b)  If a Content-Signal = no, you may not collect content for the",
    "#      corresponding use.",
    "# (c)  If the website operator does not include a Content-Signal for a",
    "#      corresponding use, the website operator neither grants nor restricts",
    "#      permission via Content-Signal with respect to the corresponding use.",
    "#",
    "# The content signals and their meanings are:",
    "#",
    "# search:   building a search index and providing search results (e.g., returning",
    "#           hyperlinks and short excerpts from your website's contents). Search does not",
    "#           include providing AI-generated search summaries.",
    "# ai-input: inputting content into one or more AI models (e.g., retrieval",
    "#           augmented generation, grounding, or other real-time taking of content for",
    "#           generative AI search answers).",
    "# ai-train: training or fine-tuning AI models.",
    "#",
    "# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF",
    "# RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790 ON COPYRIGHT",
    "# AND RELATED RIGHTS IN THE DIGITAL SINGLE MARKET.",
    "",
    "# BEGIN Cloudflare Managed content",
    "",
    "User-agent: *",
    "Content-Signal: search=yes,ai-train=yes",
    "Allow: /",
    "Allow: /tournaments",
    "Allow: /tournaments/",
    "Allow: /sign-in",
    "Allow: /sign-up",
    "Allow: /forgot-password",
    "Disallow: /dashboard",
    "Disallow: /api",
    "Disallow: /reset-password",
    "Disallow: /complete-profile",
    "",
    "User-agent: Amazonbot",
    "Disallow: /",
    "",
    "User-agent: Applebot-Extended",
    "Disallow: /",
    "",
    `Sitemap: ${baseUrl}/sitemap.xml`
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
