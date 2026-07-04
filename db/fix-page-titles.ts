/**
 * Fix Script: Set custom_page.title = slug for all existing rows.
 * Run after deploying the "remove page title" changes.
 * Usage: npx tsx db/fix-page-titles.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { drizzle } from "drizzle-orm/postgres-js";
import { eq, ne } from "drizzle-orm";
import postgres from "postgres";
import { customPage } from "./schema";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const isLocalDb =
  dbUrl.includes("helium") ||
  dbUrl.includes("localhost") ||
  dbUrl.includes("127.0.0.1") ||
  dbUrl.includes("sslmode=disable");

const client = postgres(dbUrl, { ssl: isLocalDb ? false : "require", max: 1 });
const db = drizzle(client);

async function main() {
  console.log("Fixing custom_page titles...");
  const rows = await db.select({ id: customPage.id, slug: customPage.slug, title: customPage.title }).from(customPage).where(ne(customPage.title, ""));
  let count = 0;
  for (const row of rows) {
    if (row.title !== row.slug) {
      await db.update(customPage).set({ title: row.slug, updatedAt: new Date() }).where(eq(customPage.id, row.id));
      console.log(`  ${row.id}: "${row.title}" → "${row.slug}"`);
      count++;
    }
  }
  console.log(`Done. ${count} rows updated.`);
  await client.end();
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
