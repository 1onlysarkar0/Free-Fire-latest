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
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { H3, H4, Muted } from "@/components/ui/typography";
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
    <div className="w-full min-w-0 space-y-8 pb-8">
      
      {/* Immersive Greeting Card */}
      <Card className="relative overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-6 rounded-2xl shadow-sm">
        <div className="absolute top-0 right-0 h-40 w-40 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Player Profile
              </span>
            </div>
            
            <H3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-lora border-none pb-0 mt-0">
              Welcome back, {user.name}!
            </H3>
            
            <p className="text-sm text-muted-foreground max-w-xl font-ibm leading-relaxed">
              Track your wallet, view credentials for upcoming matches, and join new tournaments.
            </p>
          </div>

          {/* Game Credentials Display */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="bg-card border border-border px-4 py-3 rounded-xl flex items-center gap-3 shadow-3xs">
              <Gamepad2 className="w-5 h-5 text-foreground shrink-0" />
              <div>
                <Muted className="text-[10px] uppercase font-bold tracking-wider">In-Game Name</Muted>
                <p className="text-xs font-bold text-foreground font-ibm">{user.gameName || "Not Set"}</p>
              </div>
            </div>

            <div className="bg-card border border-border px-4 py-3 rounded-xl flex items-center gap-3 shadow-3xs">
              <User className="w-5 h-5 text-foreground shrink-0" />
              <div>
                <Muted className="text-[10px] uppercase font-bold tracking-wider">Free Fire UID</Muted>
                <p className="text-xs font-bold text-foreground font-mono">{user.uid || "Not Set"}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Bento Grid Stats Section */}
      <div className="space-y-3">
        <h3 className="text-base font-bold font-lora tracking-tight text-foreground">Account Stats Overview</h3>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Wallet Balance Card */}
          <Card className="card-widget p-5 flex flex-col justify-between group hover:border-primary/20 transition-all duration-300 bg-card">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Wallet Balance
                </p>
                <p className="text-3xl font-extrabold tracking-tight text-foreground font-ibm flex items-baseline gap-1">
                  {stats.balance} <span className="text-xs font-normal text-muted-foreground">Coins</span>
                </p>
              </div>
              <Wallet className="h-5 w-5 text-foreground shrink-0" />
            </div>
            <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
              <Link 
                href="/dashboard/wallet" 
                className="text-xs font-bold text-primary hover:text-primary/90 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
              >
                Deposit / Withdraw <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Card>

          {/* Total Winnings Card */}
          <Card className="card-widget p-5 flex flex-col justify-between hover:border-yellow-500/20 transition-all duration-300 bg-card">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Total Winnings
                </p>
                <p className="text-3xl font-extrabold tracking-tight text-yellow-600 font-ibm flex items-baseline gap-1">
                  {stats.totalWinnings} <span className="text-xs font-normal text-muted-foreground">Coins</span>
                </p>
              </div>
              <Sparkles className="h-5 w-5 text-foreground shrink-0" />
            </div>
            <div className="mt-4 pt-4 border-t border-border/40">
              <Muted className="text-[10px] leading-relaxed">
                Accumulated rewards credited from tournaments won.
              </Muted>
            </div>
          </Card>

          {/* Tournaments Joined Card */}
          <Card className="card-widget p-5 flex flex-col justify-between hover:border-blue-500/20 transition-all duration-300 bg-card">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Tournaments
                </p>
                <p className="text-3xl font-extrabold tracking-tight text-blue-600 font-ibm">
                  {stats.joinedCount}
                </p>
              </div>
              <Swords className="h-5 w-5 text-foreground shrink-0" />
            </div>
            <div className="mt-4 pt-4 border-t border-border/40">
              <Link 
                href="/dashboard/my-tournaments" 
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View Registered <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Card>

          {/* Championship Wins Card */}
          <Card className="card-widget p-5 flex flex-col justify-between hover:border-emerald-500/20 transition-all duration-300 bg-card">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Championships
                </p>
                <p className="text-3xl font-extrabold tracking-tight text-emerald-600 font-ibm">
                  {stats.winsCount}
                </p>
              </div>
              <Trophy className="h-5 w-5 text-foreground shrink-0" />
            </div>
            <div className="mt-4 pt-4 border-t border-border/40">
              <Muted className="text-[10px] leading-relaxed">
                Ranked 1st place victories in completed match lists.
              </Muted>
            </div>
          </Card>

        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="space-y-3">
        <h3 className="text-base font-bold font-lora tracking-tight text-foreground">Quick Action Panel</h3>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          
          <Link href="/tournaments" prefetch={true} className="group">
            <Card className="p-4 bg-card border border-border rounded-xl transition-all duration-300 hover:shadow-md hover:border-primary/20 flex flex-col items-center justify-center text-center gap-2 h-28">
              <Play className="w-5 h-5 text-foreground group-hover:scale-105 transition-transform shrink-0" />
              <span className="text-xs font-bold text-foreground font-ibm">Browse Events</span>
            </Card>
          </Link>

          <Link href="/dashboard/wallet" prefetch={true} className="group">
            <Card className="p-4 bg-card border border-border rounded-xl transition-all duration-300 hover:shadow-md hover:border-primary/20 flex flex-col items-center justify-center text-center gap-2 h-28">
              <CreditCard className="w-5 h-5 text-foreground group-hover:scale-105 transition-transform shrink-0" />
              <span className="text-xs font-bold text-foreground font-ibm">Deposit Coins</span>
            </Card>
          </Link>

          <Link href="/dashboard/notifications" prefetch={true} className="group">
            <Card className="relative p-4 bg-card border border-border rounded-xl transition-all duration-300 hover:shadow-md hover:border-primary/20 flex flex-col items-center justify-center text-center gap-2 h-28">
              {stats.unreadNotifications > 0 && (
                <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-card">
                  {stats.unreadNotifications > 9 ? "9+" : stats.unreadNotifications}
                </span>
              )}
              <Bell className="w-5 h-5 text-foreground group-hover:scale-105 transition-transform shrink-0" />
              <span className="text-xs font-bold text-foreground font-ibm">Alerts Inbox</span>
            </Card>
          </Link>

          <Link href="/dashboard/settings" prefetch={true} className="group">
            <Card className="p-4 bg-card border border-border rounded-xl transition-all duration-300 hover:shadow-md hover:border-primary/20 flex flex-col items-center justify-center text-center gap-2 h-28">
              <Settings className="w-5 h-5 text-foreground group-hover:scale-105 transition-transform shrink-0" />
              <span className="text-xs font-bold text-foreground font-ibm">Edit Settings</span>
            </Card>
          </Link>

        </div>
      </div>

      {/* Active & Recent Registrations Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-base font-bold font-lora tracking-tight text-foreground">Recent Registrations</h3>
          {recentTournaments.length > 0 && (
            <Link href="/dashboard/my-tournaments" className="text-xs font-bold text-primary hover:underline">
              View all
            </Link>
          )}
        </div>

        {recentTournaments.length === 0 ? (
          <Card className="bg-card/40 border border-border/40 p-8 rounded-2xl text-center flex flex-col items-center justify-center">
            <Swords className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-bold font-lora text-foreground">No tournaments joined yet</p>
            <Muted className="text-xs max-w-sm mt-1 leading-5">
              Get started by exploring upcoming live matches and registering with your coins.
            </Muted>
            <Button asChild className="mt-4 text-xs h-9" size="sm">
              <Link href="/tournaments" prefetch={true}>
                Find Tournaments <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {recentTournaments.map((t) => (
              <Card 
                key={t.id} 
                className="bg-card border border-border hover:border-primary/25 rounded-2xl overflow-hidden flex flex-col justify-between group hover:shadow-md transition-all duration-300"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 text-[10px] font-bold uppercase shrink-0">
                      {t.gameMode.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                      {t.teamFormat}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-foreground font-lora line-clamp-1 group-hover:text-primary transition-colors">
                    {t.name}
                  </p>

                  <div className="space-y-1.5 pt-1 text-xs text-muted-foreground font-ibm">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground/75 shrink-0" />
                      <span>{format(new Date(t.startTime), "PPp")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-muted-foreground/75 shrink-0" />
                      <span>Pool: <strong className="text-foreground">{t.prizePool} Coins</strong></span>
                    </div>
                  </div>
                </div>

                <Link 
                  href={`/tournaments/${t.id}`}
                  className="bg-muted/30 border-t border-border/30 px-4 py-3 flex items-center justify-between text-xs font-semibold text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors"
                >
                  <span>Match Details</span>
                  <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// Simple internal icon component since ChevronRight is used in index UI
function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
