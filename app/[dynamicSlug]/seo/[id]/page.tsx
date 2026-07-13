// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

import { db } from "@/db/drizzle";
import { seoConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import SeoEditClient from "./_client";
import { requirePagePermission } from "@/lib/panel-auth";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

async function getSeoById(id: string) {
  const [row] = await db
    .select()
    .from(seoConfig)
    .where(eq(seoConfig.id, id))
    .limit(1);
  return row ?? null;
}

interface Props {
  params: Promise<{ dynamicSlug: string; id: string }>;
}

export default async function EditSeoPage({ params }: Props) {
  const { dynamicSlug, id } = await params;
  await requirePagePermission(dynamicSlug, "seo:edit");

  const row = await getSeoById(id);

  if (!row) {
    notFound();
  }

  return (
    <SeoEditClient
      initialData={row}
      dynamicSlug={dynamicSlug}
      mode="edit"
    />
  );
}
