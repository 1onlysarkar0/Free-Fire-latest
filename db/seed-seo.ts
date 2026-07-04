/**
 * Standalone SEO Seed Script
 *
 * Updates ONLY the seo_config and site_config.siteUrl rows.
 * Safe to re-run after domain migration — updates the base URL in all
 * canonical URLs, OG URLs, and JSON-LD @id fields without touching
 * any other data.
 *
 * Usage: npm run db:seed-seo
 *        npx tsx db/seed-seo.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { seoConfig, siteConfig } from "./schema";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ DATABASE_URL is not set in environment.");
  process.exit(1);
}

const isLocalDb =
  dbUrl.includes("helium") ||
  dbUrl.includes("localhost") ||
  dbUrl.includes("127.0.0.1") ||
  dbUrl.includes("sslmode=disable");

const client = postgres(dbUrl, {
  ssl: isLocalDb ? false : "require",
  max: 1,
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false,
});

const db = drizzle(client);

async function seedSiteUrl() {
  console.log("💾 Updating site_config.siteUrl...");
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.1onlysarkar.shop";
  const existing = await db.select().from(siteConfig).where(eq(siteConfig.id, "default")).limit(1);
  if (existing.length > 0) {
    await db.update(siteConfig).set({ siteUrl }).where(eq(siteConfig.id, "default"));
    console.log(`✅ site_config.siteUrl updated to: ${siteUrl}`);
  } else {
    await db.insert(siteConfig).values({ id: "default", siteUrl });
    console.log(`✅ site_config.siteUrl inserted as: ${siteUrl}`);
  }
}

async function seedSeoConfig() {
  console.log("💾 Seeding / updating seo_config...");

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.1onlysarkar.shop";
  const ogHome = "/assets/og-home.png";
  const ogSignin = "/assets/og-signin.png";
  const ogSignup = "/assets/og-signup.png";
  const ogTournaments = "/assets/og-tournaments.png";

  const pageMeta = (id: string, overrides: Partial<typeof seoConfig.$inferInsert>) => {
    const defaults: Partial<typeof seoConfig.$inferInsert> = {
      ogType: "website",
      twitterCard: "summary_large_image",
      twitterSite: "@1onlysarkar",
      robots: "index, follow",
      schemaType: "WebPage",
      ogImageDynamic: false,
    };
    return { ...defaults, ...overrides, id } as typeof seoConfig.$inferInsert;
  };

  const pages: (typeof seoConfig.$inferInsert)[] = [
    pageMeta("global", {
      metaTitle: "1OnlySarkar Free Fire Tournaments",
      metaDescription: "Join daily Free Fire tournaments on 1OnlySarkar — Solo, Duo & Squad. Low entry fees, real cash prize pools, and instant UPI withdrawal. Register free and start competing today!",
      metaKeywords: "gaming tournament, India, Free Fire, esports, 1onlysarkar, compete, leaderboard",
      ogTitle: "1OnlySarkar Free Fire Tournaments",
      ogDescription: "Join daily Free Fire tournaments on 1OnlySarkar — Solo, Duo & Squad. Low entry fees, real cash prize pools, and instant UPI withdrawal. Register free and start competing today!",
      ogImage: ogHome,
      twitterTitle: "1OnlySarkar Free Fire Tournaments",
      twitterDescription: "Join daily Free Fire tournaments on 1OnlySarkar — Solo, Duo & Squad. Low entry fees, real cash prize pools, and instant UPI withdrawal.",
      twitterImage: ogHome,
      canonicalUrl: siteUrl,
      schemaType: "WebSite",
      structuredDataJson: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": `${siteUrl}/#website`,
            "url": siteUrl,
            "name": "1OnlySarkar",
            "description": "Join daily Free Fire tournaments on 1OnlySarkar — Solo, Duo & Squad.",
            "publisher": { "@id": `${siteUrl}/#organization` },
            "inLanguage": "en-IN"
          },
          {
            "@type": "Organization",
            "@id": `${siteUrl}/#organization`,
            "name": "1OnlySarkar",
            "url": siteUrl,
            "logo": {
              "@type": "ImageObject",
              "url": `${siteUrl}/assets/logo.webp`
            },
            "sameAs": [
              "https://www.instagram.com/1onlysarkar"
            ]
          }
        ]
      }),
    }),

    pageMeta("home", {
      metaTitle: "1OnlySarkar Free Fire Tournaments — Play & Win Cash Prizes",
      metaDescription: "Join daily Free Fire tournaments on 1OnlySarkar — Solo, Duo & Squad. Low entry fees, real cash prize pools, and instant UPI withdrawal. Register free and start competing today!",
      metaKeywords: "free fire tournaments India, 1onlysarkar, esports gaming, play free fire earn money, free fire custom room, free fire khel kar paise kamaye",
      ogTitle: "1OnlySarkar Free Fire Tournaments — Play & Win Cash Prizes",
      ogDescription: "Join daily Free Fire tournaments on 1OnlySarkar — Solo, Duo & Squad. Low entry fees, real cash prize pools, and instant UPI withdrawal. Register free and start competing today!",
      ogImage: ogHome,
      twitterTitle: "1OnlySarkar — Play Free Fire Tournaments & Win Cash",
      twitterDescription: "Join daily Free Fire tournaments on 1OnlySarkar — Solo, Duo & Squad. Low entry fees, real cash prizes, and instant UPI withdrawal.",
      twitterImage: ogHome,
      canonicalUrl: `${siteUrl}/`,
    }),

    pageMeta("sign-in", {
      metaTitle: "Sign In | 1OnlySarkar — Free Fire Esports Tournaments",
      metaDescription: "Sign in to your 1OnlySarkar account to register for daily Free Fire tournaments, track your wallet transactions, and claim prizes.",
      metaKeywords: "1onlysarkar login, sign in, free fire login, tournament login, gaming portal login, 1onlysarkar sign in",
      ogTitle: "Sign In | 1OnlySarkar — Free Fire Esports Tournaments",
      ogDescription: "Sign in to your 1OnlySarkar account to register for daily Free Fire tournaments, track your wallet transactions, and claim prizes.",
      ogImage: ogSignin,
      twitterTitle: "Sign In | 1OnlySarkar",
      twitterDescription: "Sign in to your 1OnlySarkar account to register for daily Free Fire tournaments.",
      twitterImage: ogSignin,
      canonicalUrl: `${siteUrl}/sign-in`,
    }),

    pageMeta("sign-up", {
      metaTitle: "Sign Up & Register | 1OnlySarkar — Esports Tournaments",
      metaDescription: "Create a free account on 1OnlySarkar today. Play daily Free Fire solo, duo, and squad matches to win real cash prizes. Register now!",
      metaKeywords: "register 1onlysarkar, sign up gaming, free fire tournament register, play esports India, free fire account create",
      ogTitle: "Sign Up & Register | 1OnlySarkar — Esports Tournaments",
      ogDescription: "Create a free account on 1OnlySarkar today. Play daily Free Fire solo, duo, and squad matches to win real cash prizes. Register now!",
      ogImage: ogSignup,
      twitterTitle: "Sign Up | 1OnlySarkar",
      twitterDescription: "Create a free account on 1OnlySarkar. Play Free Fire tournaments and win real cash prizes.",
      twitterImage: ogSignup,
      canonicalUrl: `${siteUrl}/sign-up`,
    }),

    pageMeta("forgot-password", {
      metaTitle: "Reset Password | 1OnlySarkar",
      metaDescription: "Forgot your 1OnlySarkar password? Request a secure password reset link to get back into the game.",
      metaKeywords: "forgot password, reset password 1onlysarkar, recover account, gaming tournament password, forgot password free fire",
      ogTitle: "Reset Password | 1OnlySarkar",
      ogDescription: "Forgot your 1OnlySarkar password? Request a secure password reset link to get back into the game.",
      ogImage: ogSignin,
      twitterTitle: "Reset Password | 1OnlySarkar",
      twitterDescription: "Forgot your 1OnlySarkar password? Request a secure password reset link.",
      twitterImage: ogSignin,
      canonicalUrl: `${siteUrl}/forgot-password`,
      robots: "noindex, nofollow",
    }),

    pageMeta("reset-password", {
      metaTitle: "Set New Password | 1OnlySarkar",
      metaDescription: "Enter your new password to complete the account recovery process on 1OnlySarkar.",
      metaKeywords: "reset password, new password, 1onlysarkar password, account recovery",
      ogTitle: "Set New Password | 1OnlySarkar",
      ogDescription: "Enter your new password to complete the account recovery process on 1OnlySarkar.",
      ogImage: ogSignin,
      twitterTitle: "Set New Password | 1OnlySarkar",
      twitterDescription: "Enter your new password to complete the account recovery process.",
      twitterImage: ogSignin,
      canonicalUrl: `${siteUrl}/reset-password`,
      robots: "noindex, nofollow",
    }),

    pageMeta("two-factor", {
      metaTitle: "Two-Factor Authentication | 1OnlySarkar",
      metaDescription: "Secure your 1OnlySarkar account with two-factor authentication. Protect your tournaments, wallet, and personal information.",
      metaKeywords: "two factor authentication, 2fa, account security, 1onlysarkar security, verify login",
      ogTitle: "Two-Factor Authentication | 1OnlySarkar",
      ogDescription: "Secure your 1OnlySarkar account with two-factor authentication.",
      ogImage: ogSignin,
      twitterTitle: "Two-Factor Authentication | 1OnlySarkar",
      twitterDescription: "Secure your 1OnlySarkar account with two-factor authentication.",
      twitterImage: ogSignin,
      canonicalUrl: `${siteUrl}/two-factor`,
      robots: "noindex, nofollow",
    }),

    pageMeta("complete-profile", {
      metaTitle: "Complete Your Profile | 1OnlySarkar",
      metaDescription: "Set your Free Fire game name and UID to start joining tournaments on 1OnlySarkar. Complete your player profile now.",
      metaKeywords: "complete profile, free fire uid, game name, player profile, 1onlysarkar setup",
      ogTitle: "Complete Your Profile | 1OnlySarkar",
      ogDescription: "Set your Free Fire game name and UID to start joining tournaments on 1OnlySarkar.",
      ogImage: ogSignup,
      twitterTitle: "Complete Your Profile | 1OnlySarkar",
      twitterDescription: "Set your Free Fire game name and UID to start joining tournaments.",
      twitterImage: ogSignup,
      canonicalUrl: `${siteUrl}/complete-profile`,
      robots: "noindex, nofollow",
    }),

    pageMeta("tournaments", {
      metaTitle: "Free Fire Esports Tournaments | 1OnlySarkar",
      metaDescription: "Explore upcoming Free Fire tournaments on 1OnlySarkar. Join daily Solo, Duo, and Squad matches. Check entry fees, slot availability, and prize pools.",
      metaKeywords: "free fire tournaments, esports tournaments India, custom room match, win cash gaming, free fire solo duo squad, free fire tournament list",
      ogTitle: "Free Fire Esports Tournaments | 1OnlySarkar",
      ogDescription: "Explore upcoming Free Fire tournaments on 1OnlySarkar. Join daily Solo, Duo, and Squad matches. Check entry fees, slot availability, and prize pools.",
      ogImage: ogTournaments,
      twitterTitle: "Free Fire Tournaments | 1OnlySarkar",
      twitterDescription: "Explore upcoming Free Fire tournaments on 1OnlySarkar. Join daily Solo, Duo, and Squad matches.",
      twitterImage: ogTournaments,
      canonicalUrl: `${siteUrl}/tournaments`,
      schemaType: "CollectionPage",
    }),

    pageMeta("dashboard", {
      metaTitle: "Dashboard — 1OnlySarkar",
      metaDescription: "Your tournament dashboard. View stats, manage your profile, and track your performance.",
      metaKeywords: "dashboard, tournament dashboard, 1onlysarkar dashboard, my stats, gaming profile",
      ogTitle: "Dashboard — 1OnlySarkar",
      ogDescription: "Your tournament dashboard. View stats, manage your profile, and track your performance.",
      ogImage: ogHome,
      twitterTitle: "Dashboard — 1OnlySarkar",
      twitterDescription: "Your tournament dashboard. View stats, manage your profile, and track your performance.",
      twitterImage: ogHome,
      canonicalUrl: `${siteUrl}/dashboard`,
      robots: "noindex, nofollow",
    }),

    pageMeta("my-tournaments", {
      metaTitle: "My Tournaments — 1OnlySarkar",
      metaDescription: "Access joined matches, tournament custom room details, passwords, and player slots on 1OnlySarkar.",
      metaKeywords: "my tournaments, joined tournaments, custom room, room id, tournament password",
      ogTitle: "My Tournaments — 1OnlySarkar",
      ogDescription: "Access joined matches, tournament custom room details, passwords, and player slots.",
      ogImage: ogTournaments,
      twitterTitle: "My Tournaments — 1OnlySarkar",
      twitterDescription: "Access joined matches and tournament custom room details.",
      twitterImage: ogTournaments,
      canonicalUrl: `${siteUrl}/dashboard/my-tournaments`,
      robots: "noindex, nofollow",
    }),

    pageMeta("wallet", {
      metaTitle: "Wallet — 1OnlySarkar",
      metaDescription: "Manage UPI deposits, verify payment transactions, and submit instant withdrawal requests on 1OnlySarkar.",
      metaKeywords: "wallet, upi deposit, withdraw, payment, tournament fee, 1onlysarkar wallet, add money",
      ogTitle: "Wallet — 1OnlySarkar",
      ogDescription: "Manage UPI deposits, verify payment transactions, and submit instant withdrawal requests.",
      ogImage: ogHome,
      twitterTitle: "Wallet — 1OnlySarkar",
      twitterDescription: "Manage UPI deposits, verify payment transactions, and submit withdrawal requests.",
      twitterImage: ogHome,
      canonicalUrl: `${siteUrl}/dashboard/wallet`,
      robots: "noindex, nofollow",
    }),

    pageMeta("settings", {
      metaTitle: "Settings — 1OnlySarkar",
      metaDescription: "Configure user game handles, profile security settings, and personal credentials on 1OnlySarkar.",
      metaKeywords: "settings, profile settings, game name, free fire uid, account settings",
      ogTitle: "Settings — 1OnlySarkar",
      ogDescription: "Configure user game handles, profile security settings, and personal credentials.",
      ogImage: ogHome,
      twitterTitle: "Settings — 1OnlySarkar",
      twitterDescription: "Configure your game handles and profile security settings.",
      twitterImage: ogHome,
      canonicalUrl: `${siteUrl}/dashboard/settings`,
      robots: "noindex, nofollow",
    }),

    pageMeta("page-faq", {
      metaTitle: "Frequently Asked Questions — 1OnlySarkar",
      metaDescription: "Got questions about 1OnlySarkar? Find answers about tournament registration, wallet deposits, Room ID, withdrawals, results, and more in our FAQ.",
      metaKeywords: "1onlysarkar faq, free fire tournament questions india, how to join free fire tournament, tournament room id password, upi deposit free fire tournament, 1onlysarkar help",
      ogTitle: "Frequently Asked Questions — 1OnlySarkar",
      ogDescription: "Got questions about 1OnlySarkar? Find answers about tournament registration, wallet deposits, Room ID, withdrawals, results, and more.",
      ogImage: ogTournaments,
      twitterTitle: "FAQ — 1OnlySarkar",
      twitterDescription: "Find answers about tournament registration, wallet deposits, Room ID, withdrawals, and more.",
      twitterImage: ogTournaments,
      canonicalUrl: `${siteUrl}/faq`,
      schemaType: "FAQPage",
    }),

    pageMeta("page-contact", {
      metaTitle: "Contact Us — 1OnlySarkar",
      metaDescription: "Get in touch with 1OnlySarkar for tournament support, payment issues, or general questions. Reach us on Instagram or via email.",
      metaKeywords: "1onlysarkar contact, free fire tournament support india, 1onlysarkar instagram, contact 1onlysarkar, tournament help india",
      ogTitle: "Contact Us — 1OnlySarkar",
      ogDescription: "Get in touch with 1OnlySarkar for tournament support, payment issues, or general questions.",
      ogImage: ogHome,
      twitterTitle: "Contact Us — 1OnlySarkar",
      twitterDescription: "Get in touch with 1OnlySarkar for tournament support and payment issues.",
      twitterImage: ogHome,
      canonicalUrl: `${siteUrl}/contact`,
      schemaType: "ContactPage",
    }),

    pageMeta("page-how-to-join", {
      metaTitle: "How to Join a Tournament — 1OnlySarkar",
      metaDescription: "Step-by-step guide to joining Free Fire tournaments on 1OnlySarkar. Book your slot, get the Room ID, enter the custom room, and compete for real cash prizes.",
      metaKeywords: "how to join free fire tournament, 1onlysarkar tournament guide, free fire custom room india, solo duo squad free fire tournament, free fire tournament registration, tournament kaise khele",
      ogTitle: "How to Join a Tournament — 1OnlySarkar",
      ogDescription: "Step-by-step guide to joining Free Fire tournaments on 1OnlySarkar. Book your slot, get the Room ID, and compete for cash prizes.",
      ogImage: ogTournaments,
      twitterTitle: "How to Join | 1OnlySarkar",
      twitterDescription: "Step-by-step guide to joining Free Fire tournaments on 1OnlySarkar.",
      twitterImage: ogTournaments,
      canonicalUrl: `${siteUrl}/how-to-join`,
    }),

    pageMeta("page-rules", {
      metaTitle: "Tournament Rules & Fair Play — 1OnlySarkar",
      metaDescription: "Official rules and fair play guidelines for 1OnlySarkar Free Fire tournaments. Read before joining — violations result in an immediate permanent ban with no refund.",
      metaKeywords: "free fire tournament rules india, 1onlysarkar rules, fair play policy, no hack free fire tournament, anti cheat free fire, tournament conduct policy india",
      ogTitle: "Tournament Rules & Fair Play — 1OnlySarkar",
      ogDescription: "Official rules and fair play guidelines for 1OnlySarkar Free Fire tournaments. Read before joining.",
      ogImage: ogTournaments,
      twitterTitle: "Rules — 1OnlySarkar",
      twitterDescription: "Official rules and fair play guidelines for 1OnlySarkar Free Fire tournaments.",
      twitterImage: ogTournaments,
      canonicalUrl: `${siteUrl}/rules`,
    }),

    pageMeta("page-privacy", {
      metaTitle: "Privacy Policy — 1OnlySarkar",
      metaDescription: "Read 1OnlySarkar's Privacy Policy. Learn what data we collect, how we use it, and how your personal information is protected on our platform.",
      metaKeywords: "1onlysarkar privacy policy, free fire tournament data policy india, user data protection 1onlysarkar, 1onlysarkar personal information",
      ogTitle: "Privacy Policy — 1OnlySarkar",
      ogDescription: "Read 1OnlySarkar's Privacy Policy. Learn what data we collect and how it is protected.",
      ogImage: ogHome,
      twitterTitle: "Privacy Policy — 1OnlySarkar",
      twitterDescription: "Read 1OnlySarkar's Privacy Policy. Learn what data we collect and how it is protected.",
      twitterImage: ogHome,
      canonicalUrl: `${siteUrl}/privacy`,
    }),

    pageMeta("page-terms", {
      metaTitle: "Terms & Conditions — 1OnlySarkar",
      metaDescription: "Read the full Terms & Conditions for 1OnlySarkar. These govern your use of the platform, tournament participation, wallet transactions, and prize eligibility.",
      metaKeywords: "1onlysarkar terms and conditions, free fire tournament platform terms india, tournament participation agreement, 1onlysarkar user agreement, free fire esports platform terms",
      ogTitle: "Terms & Conditions — 1OnlySarkar",
      ogDescription: "Read the full Terms & Conditions for 1OnlySarkar governing platform use, tournament participation, and prize eligibility.",
      ogImage: ogHome,
      twitterTitle: "Terms & Conditions — 1OnlySarkar",
      twitterDescription: "Read the full Terms & Conditions for 1OnlySarkar governing platform use and tournament participation.",
      twitterImage: ogHome,
      canonicalUrl: `${siteUrl}/terms`,
    }),

    pageMeta("llms-txt", {
      metaTitle: "1OnlySarkar — AI/LLM Overview",
      metaDescription: "Indian Free Fire esports platform, offering structured tournament match slots and real money payouts.",
      robots: "index, follow",
      canonicalUrl: `${siteUrl}/llms.txt`,
      schemaType: "WebPage",
      structuredDataJson: JSON.stringify({
        entities: [
          { name: "1OnlySarkar", description: "Indian Free Fire esports platform, offering structured tournament match slots and real money payouts." },
          { name: "Free Fire", description: "Mobile battle royale game by Garena (package: com.dts.freefireth)." },
          { name: "Tournament Format", description: "SOLO (single player slot), DUO (team of 2 players), SQUAD (team of 4 players)." },
          { name: "Prize Pool", description: "Real money (INR) credited directly to player wallets, withdrawable instantly via registered UPI." }
        ],
        references: [
          `Organization: ${siteUrl}/#organization`,
          `WebSite: ${siteUrl}/#website`,
          "All tournaments feature custom SportsEvent schemas at their respective detail pages."
        ]
      }),
    }),
  ];

  for (const p of pages) {
    const existing = await db.select({ id: seoConfig.id }).from(seoConfig).where(eq(seoConfig.id, p.id)).limit(1);
    if (existing.length > 0) {
      await db.update(seoConfig).set(p).where(eq(seoConfig.id, p.id));
      console.log(`  ✅ Updated: ${p.id}`);
    } else {
      await db.insert(seoConfig).values(p);
      console.log(`  ✅ Inserted: ${p.id}`);
    }
  }

  console.log(`✅ seo_config seeded (${pages.length} entries).`);
}

async function main() {
  console.log("🚀 Starting SEO seed...\n");
  await seedSiteUrl();
  await seedSeoConfig();
  console.log("\n✅ SEO seed complete.");
  await client.end();
}

main().catch((err) => {
  console.error("❌ SEO seed failed:", err);
  process.exit(1);
});
