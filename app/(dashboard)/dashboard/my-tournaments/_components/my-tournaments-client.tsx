"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowUpRight,
  CalendarClock,
  CreditCard,
  Swords,
  Trophy,
  Users2,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import { TOURNAMENT_STATUS_COLORS } from "@/lib/constants";
import type { UserTournamentItem } from "@/lib/user-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MyTournamentsClientProps {
  initialData: UserTournamentItem[];
}

function formatStatusLabel(value: string) {
  return value.replace(/_/g, " ");
}

function isUpcoming(date: string) {
  return new Date(date).getTime() > Date.now();
}

export default function MyTournamentsClient({
  initialData,
}: MyTournamentsClientProps) {
  const tournaments = initialData;

  const stats = useMemo(() => {
    const total = tournaments.length;
    const upcoming = tournaments.filter((t) => isUpcoming(t.startTime)).length;
    const paidEntries = tournaments.filter((t) => t.entryFeePaid > 0).length;

    return {
      total,
      upcoming,
      paidEntries,
    };
  }, [tournaments]);

  return (
    <div className="w-full min-w-0 space-y-5 pb-6 text-foreground font-ibm">
      {/* Metrics Banner */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card className="p-4 rounded-2xl border border-border/40 bg-card shadow-3xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Registered
            </p>
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground font-mono tabular-nums mt-1">
              {stats.total}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Trophy className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border border-border/40 bg-card shadow-3xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Upcoming Matches
            </p>
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground font-mono tabular-nums mt-1">
              {stats.upcoming}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <CalendarClock className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border border-border/40 bg-card shadow-3xs flex items-center justify-between sm:col-span-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Paid Entries
            </p>
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground font-mono tabular-nums mt-1">
              {stats.paidEntries}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CreditCard className="h-4 w-4" />
          </div>
        </Card>
      </div>

      {/* Main Registrations Feed */}
      {tournaments.length === 0 ? (
        <Card className="p-8 rounded-2xl border border-border/40 bg-card/60 text-center flex flex-col items-center justify-center">
          <Swords className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <h2 className="text-base font-bold font-lora text-foreground">No tournaments registered</h2>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-normal">
            You haven&apos;t joined any Free Fire tournaments yet. Browse upcoming matches and enter with your team or solo!
          </p>
          <Button asChild className="mt-4 text-xs h-9 px-4 rounded-xl font-semibold" size="sm">
            <Link href="/tournaments" prefetch={true}>
              Explore Events <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Your Registered Matches ({tournaments.length})
            </h2>
          </div>

          <div className="space-y-2.5">
            {tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                href={`/tournaments/${tournament.id}`}
                prefetch={true}
                className="group block"
              >
                <Card className="p-4 rounded-2xl border border-border/40 bg-card hover:border-primary/40 hover:shadow-3xs transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Left Details */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          TOURNAMENT_STATUS_COLORS[tournament.status] ?? "bg-muted text-muted-foreground"
                        }`}>
                          {formatStatusLabel(tournament.status)}
                        </span>

                        <Badge variant="outline" className="text-[10px] uppercase font-semibold px-2 py-0 h-4 border-border/60">
                          {tournament.gameMode.replace(/_/g, " ")}
                        </Badge>

                        <Badge variant="secondary" className="text-[10px] uppercase font-semibold px-2 py-0 h-4 bg-secondary">
                          {tournament.teamFormat}
                        </Badge>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-foreground font-lora group-hover:text-primary transition-colors line-clamp-1">
                        {tournament.name}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground/70" />
                          {format(new Date(tournament.startTime), "dd MMM yyyy, h:mm a")}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 font-mono text-foreground font-medium">
                          <Trophy className="h-3.5 w-3.5 text-amber-500" />
                          Prize: ₹{tournament.prizePool}
                        </span>
                        {tournament.entryFeePaid > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Paid ₹{tournament.entryFeePaid}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right Slot Indicator & CTA */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/30 shrink-0">
                      <div className="flex items-center gap-1.5 bg-secondary/50 px-2.5 py-1 rounded-xl text-xs">
                        <Users2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono font-bold text-foreground">{tournament.bookedSlots}/{tournament.totalSlots}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{tournament.teamFormat === "solo" ? "Slots" : "Teams"}</span>
                      </div>

                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all flex items-center justify-center">
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}