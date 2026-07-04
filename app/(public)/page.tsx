import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RocketIcon, ArrowRightIcon, Trophy, Gamepad2 } from "lucide-react";
import { LogoCloud } from "@/components/ui/logo-cloud-3";
import { H1, H2, P } from "@/components/ui/typography";
import { getHeroConfig } from "@/lib/content";
import { getTopPlayersForHomepage } from "@/lib/user-data";
import { getSeoData, buildMetadata } from "@/lib/seo";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { getSiteUrl } from "@/lib/site-url";
import { FeatureSteps } from "@/components/ui/feature-section";

const onboardingFeatures = [
  {
    step: "Step 1",
    title: "Create Account & Login",
    content: "Sign up instantly using your email or Google account. Complete your gamer profile by setting your unique Free Fire Game Name and UID.",
    image: "/assets/Get-started.png",
  },
  {
    step: "Step 2",
    title: "Join Tournaments",
    content: "Browse through available Solo, Duo, or Squad formats. Book your slot directly using your wallet coins and prepare for the custom match room reveal.",
    image: "/assets/Tournament.png",
  },
  {
    step: "Step 3",
    title: "UPI Withdrawal",
    content: "Prizes are distributed immediately upon victory. Request lightning-fast withdrawals to your UPI account directly from your dashboard.",
    image: "/assets/Withdraw.png",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [seo, config, siteUrl] = await Promise.all([
      getSeoData("home"),
      getAdminSiteConfigCached(),
      getSiteUrl(),
    ]);
    return buildMetadata(
      seo,
      siteUrl || undefined,
      config?.logoTitle ?? undefined,
      config?.logoSrc ?? undefined,
      undefined,
      "/"
    );
  } catch {
    return {};
  }
}

export default async function Home() {
  const [config, dbUsers] = await Promise.all([
    getHeroConfig(),
    getTopPlayersForHomepage(),
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

        <section className="relative py-12 w-full border-t border-border/10 bg-background/30">
          <FeatureSteps
            features={onboardingFeatures}
            title="Your Journey Start Here"
            autoPlayInterval={4000}
            imageHeight="h-[250px] md:h-[350px] lg:h-[450px]"
          />
        </section>
      </div>
    </>
  );
}
