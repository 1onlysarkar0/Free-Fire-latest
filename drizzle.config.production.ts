import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import dns from "dns";

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

config({ path: ".env.production" });

const databaseUrl = process.env.DATABASE_URL!;

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
    ssl: false,
  },
});
