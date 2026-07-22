"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  CalendarClock,
  Swords,
  Trophy,
  Users2,
  Calendar,
  ChevronRight,
  CheckCircle2,
  CreditCard,
} from "lucide-react";

import { TOURNAMENT_STATUS_COLORS } from "@/lib/constants";
import type { UserTournamentItem } from "@/lib/user-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MyTournamentsClientProps {
  initialData: UserTournamentItem[];
}

function isUpcoming(date: string) {
  return new Date(date).getTime() > Date.now();
}

export default function MyTournamentsClient({
  initialData,
}: MyTournamentsClientProps) {
  const tournaments = initialData;
  const [filter, setFilter] = useState<"ALL" | "UPCOMING" | "COMPLETED">("ALL");

  const stats = useMemo(() => {
    const total = tournaments.length;
    const upcoming = tournaments.filter((t) => isUpcoming(t.startTime)).length;
    const completed = total - upcoming;

    return {
      total,
      upcoming,
      completed,
    };
  }, [tournaments]);

  const filteredTournaments = useMemo(() => {
    if (filter === "UPCOMING") {
      return tournaments.filter((t) => isUpcoming(t.startTime));
    }
    if (filter === "COMPLETED") {
      return tournaments.filter((t) => !isUpcoming(t.startTime));
    }
    return tournaments;
  }, [tournaments, filter]);

  return (
    <div className="w-full min-w-0 space-y-5 pb-6">
      
      {/* 3-Column Compact Stats Header */}
      <div className="grid gap-3 grid-cols-3">
        <Card className="p-3.5 bg-card border-border/60 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Matches
            </span>
            <Trophy className="h-4 w-4 text-primary shrink-0" />
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-foreground tabular-nums">
            {stats.total}
          </div>
        </Card>

        <Card className="p-3.5 bg-card border-border/60 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Upcoming
            </span>
            <CalendarClock className="h-4 w-4 text-blue-500 shrink-0" />
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 tabular-nums">
            {stats.upcoming}
          </div>
        </Card>

        <Card className="p-3.5 bg-card border-border/60 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Completed
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {stats.completed}
          </div>
        </Card>
      </div>

      {/* Controls & Filter Strip */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <h2 className="text-sm font-semibold tracking-tight text-foreground font-lora">
          Registered Tournaments
        </h2>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60 text-xs">
          <button
            onClick={() => setFilter("ALL")}
            className={cn(
              "px-2.5 py-1 rounded-md font-medium transition-all text-xs",
              filter === "ALL"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter("UPCOMING")}
            className={cn(
              "px-2.5 py-1 rounded-md font-medium transition-all text-xs",
              filter === "UPCOMING"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Upcoming ({stats.upcoming})
          </button>
          <button
            onClick={() => setFilter("COMPLETED")}
            className={cn(
              "px-2.5 py-1 rounded-md font-medium transition-all text-xs",
              filter === "COMPLETED"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Completed ({stats.completed})
          </button>
        </div>
      </div>

      {/* Match Cards List */}
      {filteredTournaments.length === 0 ? (
        <Card className="p-8 bg-card/60 border border-dashed border-border/80 rounded-xl text-center flex flex-col items-center justify-center">
          <Swords className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-xs font-semibold text-foreground">No tournaments found</p>
          <p className="text-[11px] text-muted-foreground max-w-xs mt-1 leading-relaxed">
            {filter === "UPCOMING"
              ? "You don't have any upcoming tournament matches scheduled."
              : "No match registrations found for this filter."}
          </p>
          <Button asChild className="mt-4 text-xs h-8 px-3 rounded-lg" size="sm">
            <Link href="/tournaments">Browse All Tournaments</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredTournaments.map((t) => {
            const upcoming = isUpcoming(t.startTime);
            return (
              <Card
                key={t.id}
                className="p-4 bg-card border-border/60 hover:border-primary/40 rounded-xl flex flex-col justify-between shadow-2xs group transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-semibold uppercase px-1.5 py-0 rounded-md border",
                        upcoming
                          ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {upcoming ? "Upcoming" : "Finished"}
                    </Badge>
                    <span className="text-[10px] font-mono font-semibold uppercase text-muted-foreground">
                      {t.teamFormat} • {t.gameMode.replace(/_/g, " ")}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground font-sans line-clamp-1 group-hover:text-primary transition-colors">
                    {t.name}
                  </h3>

                  <div className="space-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border/40">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                        {format(new Date(t.startTime), "PPp")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div className="bg-muted/40 p-2 rounded-lg border border-border/40">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                          Prize Pool
                        </span>
                        <span className="font-mono font-bold text-foreground">₹{t.prizePool}</span>
                      </div>
                      <div className="bg-muted/40 p-2 rounded-lg border border-border/40">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                          Entry Paid
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          {t.entryFeePaid > 0 ? `₹${t.entryFeePaid}` : "FREE"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/tournaments/${t.id}`}
                  className="mt-3.5 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <span>View Match & Room Info</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
}