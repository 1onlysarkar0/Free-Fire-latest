import { getAdminNavigationCached } from "@/lib/admin-data";
import NavigationClient from "../_components/navigation-client";
import { requirePagePermission } from "@/lib/panel-auth";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export default async function NavigationPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "navigation:view");
  const data = await getAdminNavigationCached();
  
  return <NavigationClient initialData={data} />;
}
