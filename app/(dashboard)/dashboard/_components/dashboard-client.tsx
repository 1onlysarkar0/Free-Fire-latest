"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useState } from "react";
import {
  Bell,
  Trophy,
  Swords,
  Sparkles,
  Wallet,
  ArrowUpRight,
  User,
  Gamepad2,
  Calendar,
  Settings,
  CreditCard,
  Play,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { UserTournamentItem } from "@/lib/user-data";

interface DashboardClientProps {
  user: {
    name: string;
    gameName: string | null;
    uid: string | null;
  };
  stats: {
    balance: number;
    joinedCount: number;
    winsCount: number;
    totalWinnings: number;
    unreadNotifications: number;
  };
  recentTournaments: UserTournamentItem[];
}

export default function DashboardClient({
  user,
  stats,
  recentTournaments,
}: DashboardClientProps) {
  const [copiedUid, setCopiedUid] = useState(false);

  const handleCopyUid = () => {
    if (!user.uid) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    toast.success("UID copied to clipboard");
    setTimeout(() => setCopiedUid(false), 2000);
  };

  return (
    <div className="w-full min-w-0 space-y-5 pb-6 text-foreground font-ibm">
      {/* Ultra-Compact User Header */}
      <Card className="p-4 sm:p-5 rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-3xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-sm shrink-0">
              {user.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate font-lora">
                  {user.name}
                </h1>
                <Badge variant="outline" className="text-[10px] font-mono px-2 py-0 h-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                  Active Player
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                <Gamepad2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                <span>IGN: <strong className="text-foreground font-medium">{user.gameName || "Not Set"}</strong></span>
              </p>
            </div>
          </div>

          {/* Micro UID Card & Quick Edit */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={handleCopyUid}
              disabled={!user.uid}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/50 bg-secondary/50 hover:bg-secondary text-xs font-mono transition-colors"
              title="Click to copy UID"
            >
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span>UID: {user.uid || "Not Set"}</span>
              {copiedUid ? (
                <Check className="w-3 h-3 text-emerald-500 ml-0.5" />
              ) : (
                <Copy className="w-3 h-3 text-muted-foreground/60 ml-0.5" />
              )}
            </button>
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-xl border border-border/40">
              <Link href="/dashboard/settings" title="Account Settings">
                <Settings className="w-4 h-4 text-muted-foreground" />
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* Bento Grid Metrics Overview */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {/* Wallet Balance Tile */}
        <Card className="p-4 rounded-2xl border border-border/40 bg-card hover:border-primary/30 transition-all shadow-3xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Balance
            </span>
            <Wallet className="h-4 w-4 text-primary shrink-0" />
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground font-mono tabular-nums">
              ₹{stats.balance}
            </p>
            <Link
              href="/dashboard/wallet"
              className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-0.5 mt-1"
            >
              Manage Wallet <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Total Winnings Tile */}
        <Card className="p-4 rounded-2xl border border-border/40 bg-card hover:border-amber-500/30 transition-all shadow-3xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Winnings
            </span>
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
              ₹{stats.totalWinnings}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              Tournament Prizes
            </p>
          </div>
        </Card>

        {/* Joined Tournaments Tile */}
        <Card className="p-4 rounded-2xl border border-border/40 bg-card hover:border-blue-500/30 transition-all shadow-3xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Matches Joined
            </span>
            <Swords className="h-4 w-4 text-blue-500 shrink-0" />
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
              {stats.joinedCount}
            </p>
            <Link
              href="/dashboard/my-tournaments"
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 mt-1"
            >
              View Activity <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Championship Wins Tile */}
        <Card className="p-4 rounded-2xl border border-border/40 bg-card hover:border-emerald-500/30 transition-all shadow-3xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Victories
            </span>
            <Trophy className="h-4 w-4 text-emerald-500 shrink-0" />
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {stats.winsCount}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              1st Place Trophies
            </p>
          </div>
        </Card>
      </div>

      {/* Quick Action Horizontal Strip */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-0.5">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Link href="/tournaments" prefetch={true} className="group">
            <Card className="p-3.5 bg-card border border-border/40 hover:border-primary/40 rounded-xl transition-all flex items-center gap-3 hover:shadow-3xs">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Play className="w-4 h-4 fill-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">Browse Matches</p>
                <p className="text-[10px] text-muted-foreground truncate">Explore Events</p>
              </div>
            </Card>
          </Link>

          <Link href="/dashboard/wallet" prefetch={true} className="group">
            <Card className="p-3.5 bg-card border border-border/40 hover:border-primary/40 rounded-xl transition-all flex items-center gap-3 hover:shadow-3xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">Deposit Funds</p>
                <p className="text-[10px] text-muted-foreground truncate">UPI & Top-up</p>
              </div>
            </Card>
          </Link>

          <Link href="/dashboard/notifications" prefetch={true} className="group">
            <Card className="relative p-3.5 bg-card border border-border/40 hover:border-primary/40 rounded-xl transition-all flex items-center gap-3 hover:shadow-3xs">
              {stats.unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {stats.unreadNotifications > 9 ? "9+" : stats.unreadNotifications}
                </span>
              )}
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">Notifications</p>
                <p className="text-[10px] text-muted-foreground truncate">Alerts Inbox</p>
              </div>
            </Card>
          </Link>

          <Link href="/dashboard/invite" prefetch={true} className="group">
            <Card className="p-3.5 bg-card border border-border/40 hover:border-primary/40 rounded-xl transition-all flex items-center gap-3 hover:shadow-3xs">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">Invite & Earn</p>
                <p className="text-[10px] text-muted-foreground truncate">Get Referral Bonus</p>
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Active & Recent Registrations Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Recent Registrations
          </h2>
          {recentTournaments.length > 0 && (
            <Link
              href="/dashboard/my-tournaments"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {recentTournaments.length === 0 ? (
          <Card className="bg-card/60 border border-border/40 p-6 rounded-2xl text-center flex flex-col items-center justify-center">
            <Swords className="h-7 w-7 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-bold font-lora text-foreground">No tournaments joined yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1 leading-normal">
              Explore upcoming matches and register using your wallet balance.
            </p>
            <Button asChild className="mt-3 text-xs h-8 px-4 rounded-xl" size="sm">
              <Link href="/tournaments" prefetch={true}>
                Find Events <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            {recentTournaments.map((t) => (
              <Card
                key={t.id}
                className="bg-card border border-border/40 hover:border-primary/30 rounded-2xl overflow-hidden flex flex-col justify-between group hover:shadow-3xs transition-all p-4 space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase px-2 py-0 h-4">
                      {t.gameMode.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t.teamFormat}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-foreground font-lora line-clamp-1 group-hover:text-primary transition-colors">
                    {t.name}
                  </p>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                      <span>{format(new Date(t.startTime), "PPp")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Pool: <strong className="text-foreground font-mono">₹{t.prizePool}</strong></span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/tournaments/${t.id}`}
                  className="pt-2 border-t border-border/30 flex items-center justify-between text-xs font-semibold text-primary hover:underline"
                >
                  <span>Match Details</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
