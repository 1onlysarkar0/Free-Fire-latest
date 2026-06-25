import { getAdminNavigationCached } from "@/lib/admin-data";
import NavigationClient from "../_components/navigation-client";
import { requirePagePermission } from "@/lib/panel-auth";

export const dynamic = "force-dynamic";

export default async function NavigationPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "navigation:view");
  const data = await getAdminNavigationCached();
  
  return <NavigationClient initialData={data} />;
}
