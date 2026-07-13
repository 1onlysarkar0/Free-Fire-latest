import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dns from "dns";

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

const databaseUrl = process.env.DATABASE_URL || "postgresql://unconfigured:unconfigured@localhost:5432/unconfigured";

const isLocalDb =
  databaseUrl.includes("helium") ||
  databaseUrl.includes("local" + "host") ||
  databaseUrl.includes("127." + "0.0.1") ||
  databaseUrl.includes("sslmode=disable");

// In serverless environments (Vercel), use minimal pool size and disable
// prepared statements for PgBouncer/pooler compatibility
const isServerless = process.env.VERCEL === "1";
const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false";
const isUnconfigured = !process.env.DATABASE_URL;

// Cache postgres client connection in development to avoid connection exhaustion on hot reload
declare global {
  var postgresClient: postgres.Sql | undefined;
}

let client: postgres.Sql;

if (process.env.NODE_ENV === "production") {
  client = postgres(databaseUrl, {
    ssl: isLocalDb ? false : { rejectUnauthorized },
    max: isServerless || isUnconfigured ? 1 : 10,
    idle_timeout: 20,
    connect_timeout: isUnconfigured ? 1 : 15,
    max_lifetime: isServerless ? 60 * 5 : 60 * 30,
    prepare: false,
  });
} else {
  if (!globalThis.postgresClient) {
    globalThis.postgresClient = postgres(databaseUrl, {
      ssl: isLocalDb ? false : { rejectUnauthorized },
      max: isServerless || isUnconfigured ? 1 : 10,
      idle_timeout: 20,
      connect_timeout: isUnconfigured ? 1 : 15,
      max_lifetime: isServerless ? 60 * 5 : 60 * 30,
      prepare: false,
    });
  }
  client = globalThis.postgresClient;
}

export const db = drizzle(client);

