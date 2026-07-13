// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

import { db } from "@/db/drizzle";
import { tournament, tournamentSlot, tournamentParticipant, tournamentWinner, user } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { notFound } from "next/navigation";
import ManageTournamentClient from "./_client";
import { requirePagePermission } from "@/lib/panel-auth";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

async function getAdminTournamentDetailCached(tournamentId: string) {
  const [row] = await db
    .select()
    .from(tournament)
    .where(eq(tournament.id, tournamentId))
    .limit(1);

  if (!row) return null;

  const [slots, participants, winners, [{ total: participantCount }]] = await Promise.all([
    db
      .select()
      .from(tournamentSlot)
      .where(eq(tournamentSlot.tournamentId, tournamentId))
      .orderBy(tournamentSlot.slotNumber),
    db
      .select({
        id: tournamentParticipant.id,
        userId: tournamentParticipant.userId,
        slotId: tournamentParticipant.slotId,
        entryFeePaid: tournamentParticipant.entryFeePaid,
        joinTransactionId: tournamentParticipant.joinTransactionId,
        createdAt: tournamentParticipant.createdAt,
        userName: user.name,
        userEmail: user.email,
        userGameName: user.gameName,
        userUid: user.uid,
        userImage: user.image,
      })
      .from(tournamentParticipant)
      .innerJoin(user, eq(tournamentParticipant.userId, user.id))
      .where(eq(tournamentParticipant.tournamentId, tournamentId)),
    db
      .select({
        id: tournamentWinner.id,
        userId: tournamentWinner.userId,
        slotId: tournamentWinner.slotId,
        placement: tournamentWinner.placement,
        prizeAmount: tournamentWinner.prizeAmount,
        declaredAt: tournamentWinner.declaredAt,
        userName: user.name,
        userGameName: user.gameName,
        userImage: user.image,
      })
      .from(tournamentWinner)
      .innerJoin(user, eq(tournamentWinner.userId, user.id))
      .where(eq(tournamentWinner.tournamentId, tournamentId)),
    db
      .select({ total: count() })
      .from(tournamentParticipant)
      .where(eq(tournamentParticipant.tournamentId, tournamentId)),
  ]);

  return {
    row,
    slots,
    participants,
    winners,
    participantCount,
  };
}

interface Props {
  params: Promise<{ dynamicSlug: string; tournamentId: string }>;
}

export default async function ManageTournamentPage({ params }: Props) {
  const { dynamicSlug, tournamentId } = await params;
  await requirePagePermission(dynamicSlug, "tournaments:view");

  const data = await getAdminTournamentDetailCached(tournamentId);

  if (!data) {
    notFound();
  }

  const { row, slots, participants, winners, participantCount } = data;

  const initialData = {
    id: row.id,
    name: row.name,
    type: row.type,
    joiningFee: row.joiningFee,
    prizePool: row.prizePool,
    gameMode: row.gameMode,
    teamFormat: row.teamFormat,
    maps: JSON.parse(row.maps || "[]") as string[],
    totalSlots: row.totalSlots,
    startTime: row.startTime.toISOString(),
    registrationDeadline: row.registrationDeadline.toISOString(),
    endTime: row.endTime ? row.endTime.toISOString() : null,
    descriptionHtml: row.descriptionHtml,
    rulesHtml: row.rulesHtml,
    status: row.status,
    roomId: row.roomId,
    roomPassword: row.roomPassword,
    slots: slots.map((s) => ({
      id: s.id,
      slotNumber: s.slotNumber,
      status: s.status,
      teamName: s.teamName,
      ignList: JSON.parse(s.ignList || "[]") as string[],
    })),
    participants: participants.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })),
    winners: winners.map((w) => ({
      ...w,
      declaredAt: w.declaredAt.toISOString(),
    })),
    participantCount,
  };

  return (
    <ManageTournamentClient
      id={tournamentId}
      initialData={initialData}
      dynamicSlug={dynamicSlug}
    />
  );
}
