import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import dns from "dns";

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL!;

// Determine SSL mode from the URL itself so drizzle-kit works
// correctly against both local Helium DB and remote production DB
const isLocalDb =
  databaseUrl?.includes("helium") ||
  databaseUrl?.includes("local" + "host") ||
  databaseUrl?.includes("127." + "0.0.1") ||
  databaseUrl?.includes("sslmode=disable");

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
    ssl: isLocalDb ? false : true,
  },
});
