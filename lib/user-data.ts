import "server-only";
import { db } from "@/db/drizzle";
import {
  user,
  wallet,
  walletTransaction,
  siteConfig,
  adminUserRole,
  adminRole,
  tournament,
  tournamentSlot,
  tournamentParticipant,
  withdrawConfig,
  invitationConfig,
} from "@/db/schema";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";
import { cache } from "react";



async function _fetchUserProfile(userId: string) {
  const [profile] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return profile || null;
}

export const getUserProfileCached = cache((userId: string) => _fetchUserProfile(userId));

async function _fetchUserWallet(userId: string) {
  const [walletRow] = await db
    .select()
    .from(wallet)
    .where(eq(wallet.userId, userId))
    .limit(1);
  return walletRow || null;
}

export const getUserWalletCached = cache((userId: string) => _fetchUserWallet(userId));

async function _fetchUserTransactions(userId: string) {
  return db
    .select()
    .from(walletTransaction)
    .where(eq(walletTransaction.userId, userId))
    .orderBy(desc(walletTransaction.createdAt))
    .limit(20);
}

export const getUserTransactionsCached = cache((userId: string) => _fetchUserTransactions(userId));

async function _fetchUserPermissions(userId: string) {
  const [dbUser] = await db.select({ isAdmin: user.isAdmin }).from(user).where(eq(user.id, userId)).limit(1);
  if (!dbUser) return { isAdmin: false, permissions: [], roles: [], adminSlug: null };

  if (dbUser.isAdmin) {
    const [config] = await db
      .select({ adminSlug: siteConfig.adminSlug })
      .from(siteConfig)
      .where(eq(siteConfig.id, "default"))
      .limit(1);
    return {
      isAdmin: true,
      permissions: [],
      roles: [],
      adminSlug: config?.adminSlug ?? "admin",
    };
  }

  const userRoles = await db
    .select({
      roleId: adminRole.id,
      roleName: adminRole.name,
      permissions: adminRole.permissions,
      assignedAt: adminUserRole.assignedAt,
    })
    .from(adminUserRole)
    .innerJoin(adminRole, eq(adminUserRole.roleId, adminRole.id))
    .where(eq(adminUserRole.userId, userId));

  const permissions = new Set<string>();
  for (const ur of userRoles) {
    const perms: string[] = JSON.parse(ur.permissions || "[]");
    for (const p of perms) permissions.add(p);
  }

  return {
    isAdmin: false,
    permissions: Array.from(permissions),
    roles: userRoles.map(r => ({ id: r.roleId, name: r.roleName, assignedAt: r.assignedAt?.toISOString() ?? null })),
    adminSlug: null,
  };
}

export const getUserPermissionsCached = cache((userId: string) => _fetchUserPermissions(userId));

async function _fetchTopPlayersForHomepage() {
  return db
    .select({ id: user.id, name: user.name, gameName: user.gameName, image: user.image })
    .from(user)
    .where(eq(user.topPlayer, true))
    .orderBy(desc(user.createdAt))
    .limit(12);
}

export async function getTopPlayersForHomepage() {
  "use cache";
  cacheLife("minutes");
  cacheTag(CACHE_TAGS.topPlayers, "top-players-homepage");
  return _fetchTopPlayersForHomepage();
}

// ─────────────────────────────────────────────────────────────────────────────
// USER TOURNAMENTS (joined by the user)
// Fetches only the tournaments the specific user has registered for.
// ─────────────────────────────────────────────────────────────────────────────

export type UserTournamentItem = {
  id: string;
  name: string;
  type: string;
  joiningFee: number;
  prizePool: number;
  gameMode: string;
  teamFormat: string;
  maps: string[];
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
  startTime: string;
  registrationDeadline: string;
  status: string;
  entryFeePaid: number;
  joinedAt: string | null;
};

async function _fetchUserTournaments(userId: string): Promise<UserTournamentItem[]> {
  const participations = await db
    .select({
      tournamentId: tournamentParticipant.tournamentId,
      entryFeePaid: tournamentParticipant.entryFeePaid,
      joinedAt: tournamentParticipant.createdAt,
    })
    .from(tournamentParticipant)
    .where(eq(tournamentParticipant.userId, userId))
    .orderBy(desc(tournamentParticipant.createdAt))
    .limit(50);

  if (participations.length === 0) return [];

  const tournamentIds = participations.map((p) => p.tournamentId);
  const joinedAtMap = new Map(
    participations.map((p) => [
      p.tournamentId,
      { entryFeePaid: p.entryFeePaid, joinedAt: p.joinedAt },
    ])
  );

  const rows = await db
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
      bookedSlots:
        sql<number>`(SELECT count(*)::int FROM "tournament_slots" WHERE "tournament_slots"."tournament_id" = "tournaments"."id" AND "tournament_slots"."status" = 'BOOKED')`,
    })
    .from(tournament)
    .where(inArray(tournament.id, tournamentIds))
    .orderBy(desc(tournament.startTime));

  return rows.map((t) => {
    const meta = joinedAtMap.get(t.id);
    let maps: string[] = [];
    try {
      maps = JSON.parse(t.maps || "[]") as string[];
    } catch {
      maps = [];
    }
    return {
      ...t,
      maps,
      bookedSlots: t.bookedSlots ?? 0,
      availableSlots: t.totalSlots - (t.bookedSlots ?? 0),
      startTime: t.startTime.toISOString(),
      registrationDeadline: t.registrationDeadline.toISOString(),
      entryFeePaid: meta?.entryFeePaid ?? 0,
      joinedAt: meta?.joinedAt?.toISOString() ?? null,
    };
  });
}

export const getUserTournamentsForDashboard = cache((userId: string) => _fetchUserTournaments(userId));

async function _fetchWithdrawConfig() {
  const [config] = await db
    .select()
    .from(withdrawConfig)
    .where(eq(withdrawConfig.id, "default"))
    .limit(1);
  return config || null;
}

export const getWithdrawConfig = cache(() => _fetchWithdrawConfig());

async function _fetchInvitationConfig() {
  const [config] = await db
    .select()
    .from(invitationConfig)
    .where(eq(invitationConfig.id, "default"))
    .limit(1);
  return config || null;
}

export const getInvitationConfig = cache(() => _fetchInvitationConfig());
