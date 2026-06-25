import { getAdminCustomPagesCached } from "@/lib/admin-data";
import PagesListClient from "../_components/pages-client";
import { requirePagePermission } from "@/lib/panel-auth";

export const dynamic = "force-dynamic";

export default async function PagesListPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "pages:view");
  const initialData = await getAdminCustomPagesCached();
  
  const formattedData = initialData.map(page => ({
    ...page,
    createdAt: typeof page.createdAt === "string" ? page.createdAt : page.createdAt.toISOString(),
    updatedAt: typeof page.updatedAt === "string" ? page.updatedAt : page.updatedAt.toISOString(),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <PagesListClient initialData={formattedData as any} />;
}
