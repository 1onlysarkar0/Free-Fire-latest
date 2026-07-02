/**
 * Data Migration: Add missing seo_config entries
 *
 * Inserts the 5 new seo_config rows that were added to seed-db.ts
 * but are not yet in the running database:
 *   - my-tournaments
 *   - wallet
 *   - settings
 *   - reset-password
 *   - llms-txt
 *
 * Safe to re-run: uses ON CONFLICT DO NOTHING.
 * Usage: npx tsx db/data-migration-add-seo-entries.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { seoConfig } from "./schema";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ DATABASE_URL is not set in environment.");
  process.exit(1);
}

const client = postgres(dbUrl, { ssl: "require", prepare: false });
const db = drizzle(client);

async function main() {
  console.log("🚀 Adding missing seo_config entries...\n");

  const entries = [
    {
      id: "my-tournaments",
      metaTitle: "My Tournaments — 1onlysarkar",
      metaDescription: "Access joined matches, tournament custom room details, passwords, and player slots.",
      robots: "noindex, nofollow",
    },
    {
      id: "wallet",
      metaTitle: "Wallet — 1onlysarkar",
      metaDescription: "Manage UPI deposits, verify payment transactions, and submit instant withdrawal requests.",
      robots: "noindex, nofollow",
    },
    {
      id: "settings",
      metaTitle: "Settings — 1onlysarkar",
      metaDescription: "Configure user game handles, profile security settings, and personal credentials.",
      robots: "noindex, nofollow",
    },
    {
      id: "reset-password",
      metaTitle: "Reset Password | 1onlysarkar",
      metaDescription: "Enter your new password to complete the account recovery process.",
      robots: "noindex, nofollow",
    },
    {
      id: "llms-txt",
      metaTitle: "1OnlySarkar — AI/LLM Overview",
      metaDescription: "Indian Free Fire esports platform, offering structured tournament match slots and real money payouts.",
      robots: "index, follow",
      structuredDataJson: JSON.stringify({
        entities: [
          { name: "1OnlySarkar", description: "Indian Free Fire esports platform, offering structured tournament match slots and real money payouts." },
          { name: "Free Fire", description: "Mobile battle royale game by Garena (package: com.dts.freefireth)." },
          { name: "Tournament Format", description: "SOLO (single player slot), DUO (team of 2 players), SQUAD (team of 4 players)." },
          { name: "Prize Pool", description: "Real money (INR) credited directly to player wallets, withdrawable instantly via registered UPI." },
        ],
        references: [
          `Organization: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/#organization`,
          `WebSite: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/#website`,
          "All tournaments feature custom SportsEvent schemas at their respective detail pages.",
        ],
      }),
    },
  ];

  let inserted = 0;
  for (const entry of entries) {
    try {
      await db.insert(seoConfig).values(entry).onConflictDoNothing();
      console.log(`  ✅ ${entry.id}`);
      inserted++;
    } catch (err) {
      console.error(`  ❌ ${entry.id}:`, err);
    }
  }

  console.log(`\n✅ Done. ${inserted}/${entries.length} entries inserted (skipped if already exist).`);

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
