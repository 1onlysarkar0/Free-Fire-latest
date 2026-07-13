import { getAdminSeoCached } from "@/lib/admin-data";
import SeoClient from "../_components/seo-client";
import { requirePagePermission } from "@/lib/panel-auth";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export default async function SeoPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "seo:view");
  const data = await getAdminSeoCached();

  return <SeoClient initialData={data} dynamicSlug={dynamicSlug} />;
}
