import "server-only";
import { db } from "@/db/drizzle";
import { tournament, tournamentSlot, tournamentWinner, user } from "@/db/schema";
import { eq, desc, inArray, and, count, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, tournamentCacheTag } from "@/lib/cache";
import { cache } from "react";

// Safe JSON parse helper
function safeJson<T>(s: string | null | undefined, fallback: T): T {
  try { return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}

export interface TournamentListItem {
  id: string; name: string; type: string; joiningFee: number; prizePool: number;
  gameMode: string; teamFormat: string; maps: string[]; totalSlots: number;
  bookedSlots: number; availableSlots: number; startTime: string;
  registrationDeadline: string; status: string;
}

export interface SlotItem {
  id: string; slotNumber: number; status: string;
  teamName?: string | null; ignList: string[];
}

export interface TournamentDetail {
  id: string; name: string; type: string; joiningFee: number; prizePool: number;
  gameMode: string; teamFormat: string; maps: string[]; totalSlots: number;
  bookedSlots: number; availableSlots: number; startTime: string;
  registrationDeadline: string; status: string; descriptionHtml?: string | null;
  descriptionMarkdown?: string | null; rulesHtml?: string | null; rulesMarkdown?: string | null;
  slots: SlotItem[];
  winners: { id: string; userId: string; placement: string; prizeAmount: number; userName: string; userImage?: string | null; userGameName?: string | null }[];
}

// ─── Internal fetch functions ────────────────────────────────────────────────

async function _fetchTournamentDetail(id: string): Promise<TournamentDetail | null> {
  const [row] = await db.select().from(tournament).where(eq(tournament.id, id)).limit(1);
  if (!row) return null;

  const [slots, winners] = await Promise.all([
    db.select().from(tournamentSlot).where(eq(tournamentSlot.tournamentId, id))
      .orderBy(tournamentSlot.slotNumber),
    db.select({
      id: tournamentWinner.id, userId: tournamentWinner.userId,
      placement: tournamentWinner.placement, prizeAmount: tournamentWinner.prizeAmount,
      userName: user.name, userImage: user.image, userGameName: user.gameName,
    }).from(tournamentWinner)
      .innerJoin(user, eq(tournamentWinner.userId, user.id))
      .where(eq(tournamentWinner.tournamentId, id)),
  ]);

  const bookedCount = slots.filter(s => s.status === "BOOKED").length;

  return {
    id: row.id, name: row.name, type: row.type,
    joiningFee: row.joiningFee, prizePool: row.prizePool,
    gameMode: row.gameMode, teamFormat: row.teamFormat,
    maps: safeJson<string[]>(row.maps, []),
    totalSlots: row.totalSlots, bookedSlots: bookedCount,
    availableSlots: row.totalSlots - bookedCount,
    startTime: row.startTime.toISOString(),
    registrationDeadline: row.registrationDeadline.toISOString(),
    status: row.status,
    descriptionHtml: row.descriptionHtml,
    descriptionMarkdown: row.descriptionMarkdown,
    rulesHtml: row.rulesHtml,
    rulesMarkdown: row.rulesMarkdown,
    slots: slots.map((s) => ({
      id: s.id, slotNumber: s.slotNumber, status: s.status,
      teamName: s.teamName, ignList: safeJson<string[]>(s.ignList, []),
    })),
    winners: winners.map((w) => ({
      id: w.id, userId: w.userId, placement: w.placement,
      prizeAmount: w.prizeAmount, userName: w.userName,
      userImage: w.userImage, userGameName: w.userGameName,
    })),
  };
}

async function _fetchTournamentsPaginated(
  status: string | null,
  gameMode: string | null,
  teamFormat: string | null,
  type: string | null,
  page: number,
  limit: number
) {
  const offset = (page - 1) * limit;

  const conditions = [];
  if (status && status !== "ALL") {
    const statuses = status.split(",").map((s) => s.trim().toUpperCase());
    conditions.push(inArray(tournament.status, statuses));
  }
  if (gameMode) conditions.push(eq(tournament.gameMode, gameMode));
  if (teamFormat) conditions.push(eq(tournament.teamFormat, teamFormat));
  if (type) conditions.push(eq(tournament.type, type.toUpperCase()));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [tournaments, [{ total }]] = await Promise.all([
    db
      .select({
        id: tournament.id,
        name: tournament.name,
        type: tournament.type,
        joiningFee: tournament.joiningFee,
        prizePool: tournament.prizePool,
        gameMode: tournament.gameMode,
        teamFormat: tournament.teamFormat,
        maps: tournament.maps,
        totalSlots: tournament.totalSlots,
        startTime: tournament.startTime,
        registrationDeadline: tournament.registrationDeadline,
        status: tournament.status,
        createdAt: tournament.createdAt,
        bookedSlots: sql<number>`(SELECT count(*) FROM ${tournamentSlot} WHERE ${tournamentSlot.tournamentId} = ${tournament.id} AND ${tournamentSlot.status} = 'BOOKED')::int`,
      })
      .from(tournament)
      .where(where)
      .orderBy(desc(tournament.startTime))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(tournament).where(where),
  ]);

  const result = tournaments.map((t) => ({
    ...t,
    maps: safeJson<string[]>(t.maps, []),
    bookedSlots: t.bookedSlots,
    availableSlots: t.totalSlots - t.bookedSlots,
    startTime: t.startTime.toISOString(),
    registrationDeadline: t.registrationDeadline.toISOString(),
    createdAt: t.createdAt?.toISOString() ?? null,
  }));

  return {
    data: result,
    total,
  };
}

async function _fetchTournamentPublicData(id: string) {
  const [row] = await db.select().from(tournament).where(eq(tournament.id, id)).limit(1);
  if (!row) return null;

  const slots = await db
    .select({
      id: tournamentSlot.id,
      slotNumber: tournamentSlot.slotNumber,
      status: tournamentSlot.status,
      teamName: tournamentSlot.teamName,
      ignList: tournamentSlot.ignList,
      bookedAt: tournamentSlot.bookedAt,
      userId: tournamentSlot.userId,
    })
    .from(tournamentSlot)
    .where(eq(tournamentSlot.tournamentId, id))
    .orderBy(tournamentSlot.slotNumber);

  const [{ bookedSlots }] = await db
    .select({ bookedSlots: count() })
    .from(tournamentSlot)
    .where(and(eq(tournamentSlot.tournamentId, id), eq(tournamentSlot.status, "BOOKED")));

  const winners = await db
    .select({
      id: tournamentWinner.id,
      userId: tournamentWinner.userId,
      placement: tournamentWinner.placement,
      prizeAmount: tournamentWinner.prizeAmount,
      userName: user.name,
      userImage: user.image,
      userGameName: user.gameName,
    })
    .from(tournamentWinner)
    .innerJoin(user, eq(tournamentWinner.userId, user.id))
    .where(eq(tournamentWinner.tournamentId, id));

  // Strip room credentials from public row — these are served via the room-credentials endpoint only
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { roomId: _roomId, roomPassword: _roomPassword, ...publicRow } = row;
  return {
    row: {
      ...publicRow,
      maps: JSON.parse(row.maps || "[]"),
      startTime: row.startTime.toISOString(),
      registrationDeadline: row.registrationDeadline.toISOString(),
      createdAt: row.createdAt?.toISOString() ?? null,
    },
    slots: slots.map((s) => ({
      ...s,
      ignList: JSON.parse(s.ignList || "[]"),
      bookedAt: s.bookedAt?.toISOString() ?? null,
    })),
    bookedSlots,
    winners,
  };
}

// ─── Direct exports (uncached) ────────────────────────────────────────────────

async function _fetchUpcomingTournamentsForHomepage() {
  const rows = await db
    .select({
      id: tournament.id,
      name: tournament.name,
      type: tournament.type,
      joiningFee: tournament.joiningFee,
      prizePool: tournament.prizePool,
      status: tournament.status,
      startTime: tournament.startTime,
      totalSlots: tournament.totalSlots,
      gameMode: tournament.gameMode,
      teamFormat: tournament.teamFormat,
      maps: tournament.maps,
      bookedSlots: sql<number>`(SELECT count(*) FROM ${tournamentSlot} WHERE ${tournamentSlot.tournamentId} = ${tournament.id} AND ${tournamentSlot.status} = 'BOOKED')::int`,
    })
    .from(tournament)
    .where(inArray(tournament.status, ["UPCOMING", "ACTIVE", "ROOM_REVEALED", "LIVE"]))
    .orderBy(tournament.startTime)
    .limit(6);

  return rows.map((t) => ({
    ...t,
    maps: safeJson<string[]>(t.maps, []),
    startTime: t.startTime.toISOString(),
  }));
}

export const getUpcomingTournamentsForHomepage = cache(
  unstable_cache(
    _fetchUpcomingTournamentsForHomepage,
    ["homepage-tournaments"],
    { tags: [CACHE_TAGS.tournaments], revalidate: 300 }
  )
);

export const getTournamentDetail = cache((id: string) => {
  return unstable_cache(
    () => _fetchTournamentDetail(id),
    ["tournament-detail", id],
    { tags: [CACHE_TAGS.tournaments, tournamentCacheTag(id)], revalidate: 300 }
  )();
});

export const getCachedTournamentsPaginated = cache((
  status: string | null,
  gameMode: string | null,
  teamFormat: string | null,
  type: string | null,
  page: number,
  limit: number
) => {
  const cacheKey = [
    "tournaments-paginated",
    status ?? "all",
    gameMode ?? "all",
    teamFormat ?? "all",
    type ?? "all",
    page.toString(),
    limit.toString(),
  ];
  return unstable_cache(
    () => _fetchTournamentsPaginated(status, gameMode, teamFormat, type, page, limit),
    cacheKey,
    { tags: [CACHE_TAGS.tournaments], revalidate: 300 }
  )();
});

export const getCachedTournamentPublicData = cache((id: string) => {
  return unstable_cache(
    () => _fetchTournamentPublicData(id),
    ["tournament-public-data", id],
    { tags: [CACHE_TAGS.tournaments, tournamentCacheTag(id)], revalidate: 120 }
  )();
});
