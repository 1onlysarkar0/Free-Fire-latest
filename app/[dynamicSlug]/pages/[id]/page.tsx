export const dynamic = "force-dynamic";

import { db } from "@/db/drizzle";
import { customPage } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import EditPageClient from "./_client";
import { requirePagePermission } from "@/lib/panel-auth";

async function getCustomPageById(id: string) {
  const [page] = await db
    .select()
    .from(customPage)
    .where(eq(customPage.id, id))
    .limit(1);
  return page ?? null;
}

interface Props {
  params: Promise<{ dynamicSlug: string; id: string }>;
}

export default async function EditPagePage({ params }: Props) {
  const { dynamicSlug, id } = await params;
  await requirePagePermission(dynamicSlug, "pages:edit");

  const pageRow = await getCustomPageById(id);

  if (!pageRow) {
    notFound();
  }

  const initialData = {
    id: pageRow.id,
    slug: pageRow.slug,
    content: pageRow.content,
    status: pageRow.status,
  };

  return (
    <EditPageClient
      id={id}
      initialData={initialData}
      dynamicSlug={dynamicSlug}
    />
  );
}
