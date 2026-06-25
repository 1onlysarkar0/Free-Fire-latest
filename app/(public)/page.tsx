import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RocketIcon, ArrowRightIcon, Trophy, Gamepad2, Clock, Users, Zap } from "lucide-react";
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
          <div className="relative flex flex-col items-center justify-center gap-5 pt-32 pb-24">

            {config.heroBadgeText && config.heroBadgeUrl && (
              <Link href={config.heroBadgeUrl} prefetch={true} className="group">
                <Badge variant="secondary" className="rounded-full px-4 py-1.5 flex items-center gap-2 hover:bg-secondary/80 border border-border/60 font-ibm font-semibold">
                  <RocketIcon className="size-3 text-foreground" />
                  <span>{config.heroBadgeText}</span>
                  <ArrowRightIcon className="size-3 text-foreground" />
                </Badge>
              </Link>
            )}

            <H1 className={cn(
              "text-balance text-center text-4xl tracking-tight font-lora font-medium text-foreground md:text-5xl lg:text-[64px] lg:leading-[64px] lg:tracking-[-0.06em]"
            )}>
              {config.heroHeadline}
            </H1>

            <P className="mx-auto max-w-xl text-center text-base text-foreground/80 tracking-normal font-ibm leading-relaxed sm:text-lg md:text-[24px] md:leading-[36px] md:tracking-[-0.04em] mt-0">
              {config.heroSubheadline}
            </P>

            <div className="flex flex-row flex-wrap items-center justify-center gap-3 pt-2">
              {config.heroCtaSecondaryText && config.heroCtaSecondaryUrl && (
                <Button className="font-ibm font-medium" size="lg" variant="secondary" asChild>
                  <Link href={config.heroCtaSecondaryUrl} prefetch={true}>
                    <Trophy data-icon="inline-start" className="size-4 mr-2 text-foreground" />
                    {config.heroCtaSecondaryText}
                  </Link>
                </Button>
              )}
              {config.heroCtaPrimaryText && config.heroCtaPrimaryUrl && (
                <Button className="font-ibm font-medium group" size="lg" variant="default" asChild>
                  <Link href={config.heroCtaPrimaryUrl} prefetch={true}>
                    <Gamepad2 data-icon="inline-start" className="size-4 mr-2" />
                    {config.heroCtaPrimaryText}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        {players.length > 0 && (
          <section className="relative space-y-4 pt-4 pb-14 w-full">
            <H2 className="text-center font-normal text-lg text-muted-foreground tracking-tight md:text-xl font-lora border-none pb-0 mt-0">
              Top Players
            </H2>
            <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10">
              <LogoCloud logos={players} />
            </div>
          </section>
        )}

        {tournaments.length > 0 && (
          <section className="w-full pb-20">
            <div className="max-w-5xl mx-auto px-6">
              <div className="flex items-center justify-between mb-6">
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
                  View all <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tournaments.map((t) => {
                  const maps = t.maps;
                  return (
                    <Link
                      key={t.id}
                      href={`/tournaments/${t.id}`}
                      prefetch={true}
                      className="group bg-card rounded-2xl border border-border/60 hover:border-primary/40 hover:-translate-y-1 hover:shadow-md active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-out overflow-hidden"
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${TOURNAMENT_STATUS_COLORS[t.status] ?? "bg-muted text-muted-foreground"}`}>
                            {TOURNAMENT_STATUS_LABELS[t.status] ?? t.status}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.type === "FREE" ? "bg-success/20 text-success" : "bg-primary/20 text-primary/90"}`}>
                            {t.type === "FREE" ? "FREE" : `₹${t.joiningFee}`}
                          </span>
                        </div>

                        <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors line-clamp-2 mb-2">
                          {t.name}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                          <span className="capitalize">{t.gameMode.replace(/_/g, " ")}</span>
                          <span>·</span>
                          <span className="capitalize">{t.teamFormat}</span>
                          {maps.length > 0 && (
                            <>
                              <span>·</span>
                              <span>{maps[0]}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-secondary rounded-lg px-3 py-2 mb-3">
                          <Clock className="h-3.5 w-3.5 text-foreground shrink-0" />
                          <span suppressHydrationWarning>Starts {format(new Date(t.startTime), "dd MMM, h:mm a")}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {t.totalSlots} slots
                          </span>
                          {t.prizePool > 0 && (
                            <span className="flex items-center gap-1 font-semibold text-primary">
                              <Trophy className="h-3.5 w-3.5" />
                              ₹{t.prizePool}
                            </span>
                          )}
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
