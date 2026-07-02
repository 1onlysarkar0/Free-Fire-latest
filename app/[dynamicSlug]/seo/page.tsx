import { getAdminSeoCached } from "@/lib/admin-data";
import SeoClient from "../_components/seo-client";
import { requirePagePermission } from "@/lib/panel-auth";

export const dynamic = "force-dynamic";

export default async function SeoPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "seo:view");
  const data = await getAdminSeoCached();

  return <SeoClient initialData={data} dynamicSlug={dynamicSlug} />;
}
