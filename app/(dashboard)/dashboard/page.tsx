import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { 
  user, 
  wallet, 
  tournamentParticipant, 
  tournamentWinner, 
  notification 
} from "@/db/schema";
import { eq, and, sum, count } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getUserProfileCached, getUserTournamentsForDashboard } from "@/lib/user-data";
import DashboardClient from "./_components/dashboard-client";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// Dashboard reads live session data — never cache at page level
// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await connection();
  const sessionResult = await auth.api.getSession({ headers: await headers() });

  if (!sessionResult?.user?.id) {
    redirect("/sign-in");
  }

  const userId = sessionResult.user.id;

  // Run stats queries in parallel to ensure optimal server rendering times
  const [
    dbUser,
    walletRow,
    joinedCountRow,
    winsCountRow,
    winningsSumRow,
    unreadNotificationsRow,
    joinedTournaments,
  ] = await Promise.all([
    getUserProfileCached(userId),
    db.select({ balance: wallet.balance }).from(wallet).where(eq(wallet.userId, userId)).limit(1),
    db.select({ count: count() }).from(tournamentParticipant).where(eq(tournamentParticipant.userId, userId)),
    db.select({ count: count() }).from(tournamentWinner).where(and(eq(tournamentWinner.userId, userId), eq(tournamentWinner.placement, "1st"))),
    db.select({ total: sum(tournamentWinner.prizeAmount) }).from(tournamentWinner).where(eq(tournamentWinner.userId, userId)),
    db.select({ count: count() }).from(notification).where(and(eq(notification.userId, userId), eq(notification.isRead, false))),
    getUserTournamentsForDashboard(userId),
  ]);

  if (!dbUser) {
    redirect("/sign-in");
  }

  // Parse values safely
  const balance = walletRow[0]?.balance ?? 0;
  const joinedCount = joinedCountRow[0]?.count ?? 0;
  const winsCount = winsCountRow[0]?.count ?? 0;
  const totalWinnings = winningsSumRow[0]?.total ? parseInt(winningsSumRow[0].total) : 0;
  const unreadNotifications = unreadNotificationsRow[0]?.count ?? 0;

  // Only pass the top 3 most recent registered tournaments to the client
  const recentTournaments = joinedTournaments.slice(0, 3);

  const userData = {
    name: dbUser.name,
    gameName: dbUser.gameName,
    uid: dbUser.uid,
  };

  const stats = {
    balance,
    joinedCount,
    winsCount,
    totalWinnings,
    unreadNotifications,
  };

  return (
    <DashboardClient 
      user={userData} 
      stats={stats} 
      recentTournaments={recentTournaments} 
    />
  );
}
