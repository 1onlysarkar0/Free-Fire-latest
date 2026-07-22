"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  Bell,
  Coins,
  Trophy,
  Swords,
  Sparkles,
  Wallet,
  ArrowRight,
  User,
  Gamepad2,
  Calendar,
  Settings,
  CreditCard,
  Play,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  return (
    <div className="w-full min-w-0 space-y-4 pb-6">
      
      {/* Compact User Header & Credentials Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-card border border-border/60 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-foreground font-lora tracking-tight leading-none truncate">
                {user.name}
              </h1>
              <Badge variant="outline" className="text-[9px] font-mono font-semibold px-1.5 py-0 border-primary/30 bg-primary/5 text-primary shrink-0">
                PRO PLAYER
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-sans truncate">
              Overview of your tournament stats & wallet
            </p>
          </div>
        </div>

        {/* Credentials Pill Tags */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1 sm:pt-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border/60 text-muted-foreground text-[11px]">
            <Gamepad2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[10px] uppercase font-semibold text-muted-foreground/80">IGN:</span>
            <span className="font-semibold text-foreground font-sans">{user.gameName || "Not Set"}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border/60 text-muted-foreground text-[11px]">
            <User className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[10px] uppercase font-semibold text-muted-foreground/80">UID:</span>
            <span className="font-mono font-semibold text-foreground">{user.uid || "Not Set"}</span>
          </div>
        </div>
      </div>

      {/* High-Density 4-Metric Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        
        {/* Balance Card */}
        <Card className="p-3.5 bg-card border-border/60 hover:border-primary/40 transition-all rounded-xl shadow-2xs flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Wallet Balance
            </span>
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500 group-hover:scale-105 transition-transform">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground tabular-nums">
              ₹{stats.balance}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px]">
              <Link href="/dashboard/wallet" prefetch={true} className="font-medium text-primary hover:underline flex items-center gap-0.5">
                Manage Wallet <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </Card>

        {/* Total Winnings */}
        <Card className="p-3.5 bg-card border-border/60 hover:border-amber-500/40 transition-all rounded-xl shadow-2xs flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Winnings
            </span>
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
              ₹{stats.totalWinnings}
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground truncate">
              Total prize credits
            </p>
          </div>
        </Card>

        {/* Tournaments Joined */}
        <Card className="p-3.5 bg-card border-border/60 hover:border-blue-500/40 transition-all rounded-xl shadow-2xs flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Joined Matches
            </span>
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500 group-hover:scale-105 transition-transform">
              <Swords className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground tabular-nums">
              {stats.joinedCount}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px]">
              <Link href="/dashboard/my-tournaments" prefetch={true} className="font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
                View Matches <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </Card>

        {/* Victories */}
        <Card className="p-3.5 bg-card border-border/60 hover:border-purple-500/40 transition-all rounded-xl shadow-2xs flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Victories
            </span>
            <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500 group-hover:scale-105 transition-transform">
              <Trophy className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground tabular-nums">
              {stats.winsCount}
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground truncate">
              1st place finishes
            </p>
          </div>
        </Card>

      </div>

      {/* Quick Action Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Link href="/tournaments" prefetch={true} className="group">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border/60 hover:border-primary/50 transition-all shadow-2xs">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform shrink-0">
              <Play className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">Browse Events</div>
              <div className="text-[10px] text-muted-foreground truncate">Join live matches</div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/wallet" prefetch={true} className="group">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border/60 hover:border-primary/50 transition-all shadow-2xs">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:scale-105 transition-transform shrink-0">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">Add Coins</div>
              <div className="text-[10px] text-muted-foreground truncate">Instant UPI Deposit</div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/notifications" prefetch={true} className="group">
          <div className="relative flex items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border/60 hover:border-primary/50 transition-all shadow-2xs">
            {stats.unreadNotifications > 0 && (
              <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
            )}
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:scale-105 transition-transform shrink-0">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">Notifications</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {stats.unreadNotifications > 0 ? `${stats.unreadNotifications} unread` : "Room & Alerts"}
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/settings" prefetch={true} className="group">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border/60 hover:border-primary/50 transition-all shadow-2xs">
            <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:scale-105 transition-transform shrink-0">
              <Settings className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">Settings</div>
              <div className="text-[10px] text-muted-foreground truncate">Edit IGN & Profile</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Active Registrations Section */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">
            Recent Tournament Registrations
          </h2>
          {recentTournaments.length > 0 && (
            <Link href="/dashboard/my-tournaments" prefetch={true} className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {recentTournaments.length === 0 ? (
          <Card className="p-6 bg-card/60 border border-dashed border-border/80 rounded-xl text-center flex flex-col items-center justify-center">
            <Swords className="h-6 w-6 text-muted-foreground/30 mb-2" />
            <p className="text-xs font-semibold text-foreground">No tournaments joined yet</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mt-1 leading-relaxed">
              Explore upcoming matches and register with your wallet coins to start competing.
            </p>
            <Button asChild className="mt-3 text-xs h-7 px-3 rounded-md" size="sm">
              <Link href="/tournaments" prefetch={true}>
                Find Tournaments <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {recentTournaments.map((t) => (
              <Card 
                key={t.id} 
                className="p-3.5 bg-card border-border/60 hover:border-primary/40 rounded-xl flex flex-col justify-between shadow-2xs group transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[9px] font-mono font-semibold uppercase px-1.5 py-0">
                      {t.gameMode.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-[9px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                      {t.teamFormat}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-foreground font-sans line-clamp-1 group-hover:text-primary transition-colors">
                    {t.name}
                  </h3>

                  <div className="space-y-1 text-[11px] text-muted-foreground pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                      <span>{format(new Date(t.startTime), "PPp")}</span>
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-muted-foreground text-[10px]">Prize Pool:</span>
                      <span className="font-mono font-bold text-foreground tabular-nums text-xs">₹{t.prizePool}</span>
                    </div>
                  </div>
                </div>

                <Link 
                  href={`/tournaments/${t.id}`}
                  prefetch={true}
                  className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs font-medium text-primary hover:text-primary/80 transition-colors"
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
