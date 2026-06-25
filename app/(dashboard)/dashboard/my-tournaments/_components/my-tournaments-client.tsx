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
} from "lucide-react";

import { TOURNAMENT_STATUS_COLORS } from "@/lib/constants";
import type { UserTournamentItem } from "@/lib/user-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { H4, Muted } from "@/components/ui/typography";

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
    <div className="w-full min-w-0 p-4 md:p-6">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Card className="rounded-2xl bg-accent/60 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Registered
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {stats.total}
                </p>
              </div>
              <Trophy className="h-4 w-4 shrink-0 text-foreground" />
            </div>
            <Muted className="mt-3 text-xs leading-5">
              Total tournaments currently linked to your account.
            </Muted>
          </Card>

          <Card className="rounded-2xl bg-accent/60 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Upcoming
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {stats.upcoming}
                </p>
              </div>
              <CalendarClock className="h-4 w-4 shrink-0 text-foreground" />
            </div>
            <Muted className="mt-3 text-xs leading-5">
              Joined tournaments that are scheduled to start later.
            </Muted>
          </Card>

          <Card className="rounded-2xl bg-accent/60 p-4 shadow-sm sm:col-span-2 xl:col-span-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Paid entries
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {stats.paidEntries}
                </p>
              </div>
              <CreditCard className="h-4 w-4 shrink-0 text-foreground" />
            </div>
            <Muted className="mt-3 text-xs leading-5">
              Registrations with a recorded entry payment.
            </Muted>
          </Card>
        </div>

        {tournaments.length === 0 ? (
          <div className="flex min-h-[340px] flex-col items-center justify-center bg-background px-6 py-10 text-center">
            <Trophy className="mb-4 h-6 w-6 text-foreground" />

            <H4 className="mt-0">No tournaments joined yet</H4>

            <Muted className="mt-2 max-w-md text-sm leading-6">
              Start with an upcoming event to see your registrations, match
              timing, and slot details collected here in one place.
            </Muted>

            <Button asChild className="mt-6">
              <Link href="/tournaments" prefetch>
                Explore tournaments
                <ArrowUpRight className="h-4 w-4 text-foreground" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3 px-1">
              <div className="space-y-1">
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Tournament activity
                </h2>
                <p className="text-sm text-muted-foreground">
                  Open any tournament to review details, participation status,
                  and upcoming timing.
                </p>
              </div>
            </div>

            {tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                href={`/tournaments/${tournament.id}`}
                prefetch
                className="group block"
              >
                <Card className="rounded-2xl bg-accent/40 p-4 shadow-sm transition-all duration-200 hover:bg-accent/70 hover:shadow-md">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-start gap-3">
                        <Swords className="h-5 w-5 shrink-0 text-foreground" />

                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                                  {tournament.name}
                                </p>

                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.05em] ${TOURNAMENT_STATUS_COLORS[tournament.status] ??
                                    "bg-muted text-muted-foreground"
                                    }`}
                                >
                                  {formatStatusLabel(tournament.status)}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="inline-flex items-center rounded-full bg-background/80 px-2.5 py-1 capitalize">
                                  {tournament.gameMode.replace(/_/g, " ")}
                                </span>
                                <span className="inline-flex items-center rounded-full bg-background/80 px-2.5 py-1">
                                  {tournament.teamFormat}
                                </span>
                              </div>
                            </div>

                            <div className="hidden xl:flex xl:shrink-0 xl:items-center xl:gap-2 xl:rounded-xl xl:bg-background/80 xl:px-3 xl:py-2">
                              <Users2 className="h-4 w-4 text-foreground" />
                              <div className="text-right">
                                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                                  Slots
                                </p>
                                <p className="text-sm font-semibold text-foreground">
                                  {tournament.bookedSlots}/
                                  {tournament.totalSlots}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1">
                                <CalendarClock className="h-3.5 w-3.5 text-foreground" />
                                <span>
                                  {format(
                                    new Date(tournament.startTime),
                                    "dd MMM yyyy, h:mm a"
                                  )}
                                </span>
                              </div>

                              {tournament.entryFeePaid > 0 ? (
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1">
                                  <CreditCard className="h-3.5 w-3.5 text-foreground" />
                                  <span className="font-medium text-foreground">
                                    Entry paid: ₹{tournament.entryFeePaid}
                                  </span>
                                </div>
                              ) : null}
                            </div>

                            <div className="flex items-center justify-between gap-3 xl:hidden">
                              <div className="inline-flex items-center gap-2 rounded-xl bg-background/80 px-3 py-2">
                                <Users2 className="h-4 w-4 text-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  Slots
                                </span>
                                <span className="text-sm font-semibold text-foreground">
                                  {tournament.bookedSlots}/
                                  {tournament.totalSlots}
                                </span>
                              </div>

                              <ArrowUpRight className="h-4 w-4 text-foreground transition-colors group-hover:text-primary" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="hidden xl:flex xl:shrink-0 xl:items-center">
                      <ArrowUpRight className="h-4 w-4 text-foreground transition-colors group-hover:text-primary" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}