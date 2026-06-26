import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RocketIcon, ArrowRightIcon, Trophy, Gamepad2, Clock, Users2 } from "lucide-react";
import { LogoCloud } from "@/components/ui/logo-cloud-3";
import { H1, H2, P } from "@/components/ui/typography";
import { getUpcomingTournamentsForHomepage } from "@/lib/tournaments";
import { TOURNAMENT_STATUS_COLORS, TOURNAMENT_STATUS_LABELS } from "@/lib/constants";
import { getHeroConfig } from "@/lib/content";
import { getTopPlayersForHomepage } from "@/lib/user-data";
import { format } from "date-fns";

export default async function Home() {
  const [config, dbUsers, tournaments] = await Promise.all([
    getHeroConfig(),
    getTopPlayersForHomepage(),
    getUpcomingTournamentsForHomepage(),
  ]);

  let players = dbUsers.map((u) => ({
    src: u.image || null,
    alt: u.gameName || u.name || "Player",
    username: u.gameName || u.name || "Player",
  }));

  if (players.length > 0 && players.length < 8) {
    const original = [...players];
    while (players.length < 8) {
      players = [...players, ...original];
    }
    players = players.slice(0, 8);
  }

  return (
    <>
      <div
        className="relative overflow-x-hidden flex-1 bg-background"
        style={{ minHeight: "100vh" }}
      >
        <section className="mx-auto w-full max-w-5xl px-6">
          <div className="relative flex flex-col items-center justify-center pt-32 pb-24 text-center">

            {config.heroBadgeText && config.heroBadgeUrl && (
              <div className="mb-6 md:mb-8">
                <Link href={config.heroBadgeUrl} prefetch={true} className="group">
                  <Badge variant="secondary" className="rounded-full px-4 py-1.5 flex items-center gap-2 hover:bg-secondary/80 border border-border/60 font-ibm font-semibold">
                    <RocketIcon className="size-3 text-foreground" aria-hidden="true" />
                    <span>{config.heroBadgeText}</span>
                    <ArrowRightIcon className="size-3 text-foreground" aria-hidden="true" />
                  </Badge>
                </Link>
              </div>
            )}

            <div className="flex flex-col items-center gap-4 md:gap-5 max-w-3xl">
              <H1 className={cn(
                "text-balance text-center text-4xl tracking-tight font-lora font-medium text-foreground md:text-5xl lg:text-[64px] lg:leading-[64px] lg:tracking-[-0.06em]"
              )}>
                {config.heroHeadline}
              </H1>

              <P className="mx-auto max-w-2xl text-center text-base text-foreground/80 tracking-normal font-ibm leading-relaxed sm:text-lg md:text-[24px] md:leading-[36px] md:tracking-[-0.04em] mt-0">
                {config.heroSubheadline}
              </P>
            </div>

            <div className="flex flex-row flex-wrap items-center justify-center gap-3 mt-8 md:mt-10">
              {config.heroCtaSecondaryText && config.heroCtaSecondaryUrl && (
                <Button className="font-ibm font-medium" size="lg" variant="secondary" asChild>
                  <Link href={config.heroCtaSecondaryUrl} prefetch={true}>
                    <Trophy aria-hidden="true" data-icon="inline-start" className="size-4 mr-2 text-foreground" />
                    {config.heroCtaSecondaryText}
                  </Link>
                </Button>
              )}
              {config.heroCtaPrimaryText && config.heroCtaPrimaryUrl && (
                <Button className="font-ibm font-medium group" size="lg" variant="default" asChild>
                  <Link href={config.heroCtaPrimaryUrl} prefetch={true}>
                    <Gamepad2 aria-hidden="true" data-icon="inline-start" className="size-4 mr-2" />
                    {config.heroCtaPrimaryText}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        {players.length > 0 && (
          <section className="relative pt-8 pb-16 w-full flex flex-col items-center">
            <H2 className="text-center font-medium text-xs uppercase tracking-widest text-muted-foreground/80 font-ibm mb-6 border-none pb-0 mt-0">
              Top Players
            </H2>
            <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10 w-full">
              <LogoCloud logos={players} />
            </div>
          </section>
        )}

        {tournaments.length > 0 && (
          <section className="w-full pt-8 pb-24">
            <div className="max-w-5xl mx-auto px-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <H2 className="font-medium text-2xl font-lora border-none pb-0 mt-0">
                    Upcoming Tournaments
                  </H2>
                </div>
                <Link
                  href="/tournaments"
                  prefetch={true}
                  className="text-sm font-semibold text-primary hover:text-primary/90 flex items-center gap-1 transition-colors"
                >
                  View all <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {tournaments.map((t) => {
                  const maps = t.maps;
                  return (
                    <Link
                      key={t.id}
                      href={`/tournaments/${t.id}`}
                      prefetch={true}
                      className="group bg-card rounded-2xl border border-border/60 hover:border-primary/40 hover:-translate-y-1 hover:shadow-md active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-out overflow-hidden flex flex-col h-full"
                    >
                      <div className="p-5 flex flex-col justify-between flex-1">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${TOURNAMENT_STATUS_COLORS[t.status] ?? "bg-muted text-muted-foreground"}`}>
                              {TOURNAMENT_STATUS_LABELS[t.status] ?? t.status}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${t.type === "FREE" ? "bg-success/15 text-success border-success/20" : "bg-primary/10 text-primary border-primary/20"}`}>
                              {t.type === "FREE" ? "FREE" : `₹${t.joiningFee} ENTRY`}
                            </span>
                          </div>

                          <h3 className="font-bold text-foreground text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                            {t.name}
                          </h3>

                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="capitalize font-medium">{t.gameMode.replace(/_/g, " ")}</span>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="capitalize font-medium">{t.teamFormat}</span>
                            {maps.length > 0 && (
                              <>
                                <span className="text-muted-foreground/30">·</span>
                                <span className="font-medium">{maps[0]}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" aria-hidden="true" />
                            <span suppressHydrationWarning>Starts {format(new Date(t.startTime), "dd MMM, h:mm a")}</span>
                          </div>

                          <div className="mt-2 pt-3 border-t border-border/40 space-y-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Users2 className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
                                <span>Registration</span>
                              </span>
                              <span className="font-semibold text-foreground">
                                {t.teamFormat === "solo" && `${t.bookedSlots} / ${t.totalSlots} Slots`}
                                {t.teamFormat === "duo" && `${t.bookedSlots} / ${t.totalSlots} Teams (${t.bookedSlots * 2} / ${t.totalSlots * 2} slots)`}
                                {t.teamFormat === "squad" && `${t.bookedSlots} / ${t.totalSlots} Teams (${t.bookedSlots * 4} / ${t.totalSlots * 4} slots)`}
                              </span>
                            </div>
                            {t.prizePool > 0 && (
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  <Trophy className="h-3.5 w-3.5 text-primary/70" aria-hidden="true" />
                                  <span>Winning Price</span>
                                </span>
                                <span className="font-bold text-primary">
                                  ₹{t.prizePool}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
