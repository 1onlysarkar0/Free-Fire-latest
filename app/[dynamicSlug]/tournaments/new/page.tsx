// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

import NewTournamentClient from "./_client";
import { requirePagePermission } from "@/lib/panel-auth";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

interface Props {
  params: Promise<{ dynamicSlug: string }>;
}

export default async function NewTournamentPage({ params }: Props) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "tournaments:create");
  return <NewTournamentClient dynamicSlug={dynamicSlug} />;
}
