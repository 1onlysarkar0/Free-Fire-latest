import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.1onlysarkar.shop";

  const lines = [
    "User-agent: *",
    "Disallow:",
    "",
    "User-agent: FreshpingBot",
    "Disallow: /",
    "",
    `Sitemap: ${baseUrl}/sitemap.xml`
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
