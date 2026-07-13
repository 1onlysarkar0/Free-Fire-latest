import { getAdminAuthContentCached } from "@/lib/admin-data";
import AuthContentClient from "../_components/auth-content-client";
import { requirePagePermission } from "@/lib/panel-auth";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export default async function AuthContentPage({ params }: { params: Promise<{ dynamicSlug: string }> }) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "auth_content:view");
  const data = await getAdminAuthContentCached();
  
  return <AuthContentClient initialData={data} />;
}
