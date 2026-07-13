import { getAdminFaqsCached } from "@/lib/admin-data";
import FaqListClient from "../_components/faq-client";
import { requirePagePermission } from "@/lib/panel-auth";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export default async function FaqListPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "pages:view");
  const initialData = await getAdminFaqsCached();
  
  const formattedData = initialData.map(item => ({
    ...item,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : item.createdAt.toISOString(),
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : item.updatedAt.toISOString(),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <FaqListClient initialData={formattedData as any} />;
}
