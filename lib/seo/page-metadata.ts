import type { Metadata } from "next";
import { getSeoData, buildMetadata } from "@/lib/seo";
import { getSharedSiteConfig } from "@/lib/site-config";

export async function createPageMetadata(pageId: string, path: string = "/"): Promise<Metadata> {
  try {
    const config = await getSharedSiteConfig();
    const seo = await getSeoData(pageId);
    
    return buildMetadata(
      seo,
      config.siteUrl || undefined,
      config.logoTitle || undefined,
      config.logoSrc || undefined,
      "en_IN",
      path
    );
  } catch (error) {
    return {};
  }
}
