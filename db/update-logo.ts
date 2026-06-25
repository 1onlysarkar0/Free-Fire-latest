import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { siteConfig } from "./schema";
import { eq } from "drizzle-orm";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ DATABASE_URL is not set in environment.");
  process.exit(1);
}

const client = postgres(dbUrl, { prepare: false });
const db = drizzle(client);

async function run() {
  console.log("🔄 Updating site_config logoSrc and authPanelImageUrl...");
  try {
    await db
      .update(siteConfig)
      .set({ 
        logoSrc: "/assets/logo.webp",
        authPanelImageUrl: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=85"
      })
      .where(eq(siteConfig.id, "default"));
    console.log("✅ Database site_config table updated successfully!");
  } catch (err) {
    console.error("❌ Error updating site_config:", err);
  } finally {
    await client.end();
  }
}

run();
