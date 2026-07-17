import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Trophy, Gamepad2, Sparkles, Compass, Ghost, Lightbulb, Swords } from "lucide-react";
import { LogoCloud } from "@/components/ui/logo-cloud-3";
import { H1, H2, P } from "@/components/ui/typography";
import { getHeroConfig } from "@/lib/content";
import { getTopPlayersForHomepage } from "@/lib/user-data";
import { getSeoData, buildMetadata } from "@/lib/seo";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { getSiteUrl } from "@/lib/site-url";
import { FeatureSteps } from "@/components/ui/feature-section";
import { CircularTestimonials } from "@/components/ui/circular-testimonials";
import { getHomepageFaqs } from "@/lib/content";
import { LandingFaq } from "@/components/homepage/landing-faq";
import { CtaSection } from "@/components/homepage/cta-section";
import { connection } from "next/server";

// Cache Components route opt-out
export const instant = false;

const onboardingFeatures = [
  {
    step: "Step 1",
    title: "Create Account & Login",
    content: "Create your player profile, add your Free Fire UID, and keep your tournament details tied to one verified account.",
    image: "/assets/Get-started.svg",
  },
  {
    step: "Step 2",
    title: "Join Tournaments",
    content: "Browse upcoming Free Fire Solo, Duo, and Squad rooms, compare entry fees and prize pools, then reserve an open slot.",
    image: "/assets/Tournament.svg",
  },
  {
    step: "Step 3",
    title: "Instant UPI Payouts",
    content: "Request a withdrawal from your dashboard and get your tournament winnings transferred directly and instantly to your UPI account.",
    image: "/assets/Withdraw.svg",
  },
];

const onboardingTestimonials = [
  {
    quote: "Create your profile once, add your Free Fire UID, and you are ready to book tournament slots.",
    name: "Create Account & Login",
    designation: "Step 1",
    src: "/assets/Get-started.svg",
  },
  {
    quote: "Filter live and upcoming rooms, review prize pools, and choose the Solo, Duo, or Squad slot that fits you.",
    name: "Join Tournaments",
    designation: "Step 2",
    src: "/assets/Tournament.svg",
  },
  {
    quote: "Submit a payout request to receive your hard-earned winnings directly into your UPI account in seconds.",
    name: "UPI Withdrawal",
    designation: "Step 3",
    src: "/assets/Withdraw.svg",
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
  await connection();
  const [config, dbUsers, seoData, homeFaqs] = await Promise.all([
    getHeroConfig(),
    getTopPlayersForHomepage(),
    getSeoData("home").catch(() => null),
    getHomepageFaqs(),
  ]);

  let structuredData = null;
  if (seoData?.structuredDataJson) {
    try {
      structuredData = JSON.parse(seoData.structuredDataJson);
    } catch { }
  }

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
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <div
        className="relative overflow-x-hidden flex-1 bg-background"
        style={{ minHeight: "100vh" }}
      >
        <section className="mx-auto w-full max-w-5xl px-6">
          <div className="relative flex flex-col items-center justify-center pt-32 pb-24 text-center">

            {config.heroBadgeText && config.heroBadgeUrl && (
              <div className="mb-6 md:mb-8">
                <Link href={config.heroBadgeUrl} prefetch={true} className="group inline-flex items-center">
                  <div className="relative inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold font-ibm text-foreground bg-accent/60 hover:bg-accent border border-border/50 hover:border-primary/40 shadow-xs transition-all duration-300 ease-out hover:shadow-md">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <Lightbulb className="h-3 w-3 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                    </span>
                    <span className="tracking-tight">{config.heroBadgeText}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-all duration-300 transform group-hover:translate-x-1" aria-hidden="true" />
                  </div>
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
                <Link
                  href={config.heroCtaSecondaryUrl}
                  prefetch={true}
                  className="group inline-flex items-center justify-center gap-2 text-sm font-semibold transition-colors duration-150 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-foreground/20 rounded-md px-5 py-2.5 shadow-xs font-ibm"
                >
                  <Ghost className="size-4 shrink-0 text-foreground" aria-hidden="true" />
                  <span>{config.heroCtaSecondaryText}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-transform duration-200 transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              )}
              {config.heroCtaPrimaryText && config.heroCtaPrimaryUrl && (
                <Link
                  href={config.heroCtaPrimaryUrl}
                  prefetch={true}
                  className="group inline-flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-300 bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/20 rounded-md px-5 py-2.5 shadow-xs font-ibm"
                >
                  <Swords className="size-4 shrink-0 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" aria-hidden="true" />
                  <span>{config.heroCtaPrimaryText}</span>
                </Link>
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

        <section className="relative pt-12 pb-2 w-full border-t border-border/10 bg-background/30">
          {/* Desktop Onboarding Layout */}
          <div className="hidden lg:block">
            <FeatureSteps
              features={onboardingFeatures}
              title="Your Journey Starts Here"
              autoPlayInterval={4000}
              imageHeight="h-[450px]"
            />
          </div>

          {/* Tablet & Mobile Carousel Layout */}
          <div className="block lg:hidden px-4 md:px-6">
            <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center font-lora text-foreground">
              Your Journey Starts Here
            </h2>
            <CircularTestimonials
              testimonials={onboardingTestimonials}
              autoplay={true}
              colors={{
                name: "hsl(var(--foreground))",
                designation: "hsl(var(--primary))",
                testimony: "hsl(var(--foreground))",
                arrowBackground: "hsl(var(--primary))",
                arrowForeground: "hsl(var(--primary-foreground))",
                arrowHoverBackground: "hsl(var(--primary) / 0.8)",
              }}
              fontSizes={{
                name: "24px",
                designation: "12px",
                quote: "16px",
              }}
            />
          </div>
        </section>

        <CtaSection
          imageSrc="/assets/cta-image.svg"
          imageAlt="Free Fire Tournament Arena CTA"
          title="Join the Arena"
          subtitle="Turn Your Free Fire Skills Into Real Cash Winnings"
          description="Enter daily solo, duo, and squad rooms. Dominate the battleground, build your leaderboard rank, and withdraw your cash prizes instantly via UPI."
          buttonText="Get Started"
          buttonUrl="/sign-in"
        />

        {homeFaqs && homeFaqs.length > 0 && (
          <LandingFaq items={homeFaqs} />
        )}
      </div>
    </>
  );
}
