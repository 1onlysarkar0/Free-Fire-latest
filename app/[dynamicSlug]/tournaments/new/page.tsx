export const dynamic = "force-dynamic";

import NewTournamentClient from "./_client";
import { requirePagePermission } from "@/lib/panel-auth";

interface Props {
  params: Promise<{ dynamicSlug: string }>;
}

export default async function NewTournamentPage({ params }: Props) {
  const { dynamicSlug } = await params;
  await requirePagePermission(dynamicSlug, "tournaments:create");
  return <NewTournamentClient dynamicSlug={dynamicSlug} />;
}
