import "server-only";
import { db } from "@/db/drizzle";
import { account, session, user, verification, twoFactor } from "@/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor as twoFactorPlugin } from "better-auth/plugins";

const appUrl = (process.env.APP_URL || process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
const extraOrigins = process.env.TRUSTED_ORIGINS
  ? process.env.TRUSTED_ORIGINS.split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean)
  : [];
const devOrigins =
  process.env.NODE_ENV === "development"
    ? ["http://localhost:5000", "http://localhost:3000"]
    : [];

const trustedOrigins: string[] = Array.from(
  new Set([
    ...(appUrl ? [appUrl] : []),
    ...extraOrigins,
    ...devOrigins,
  ])
).filter(Boolean);

export const auth = betterAuth({
  baseURL: appUrl || undefined,
  trustedOrigins,
  cookieCache: {
    enabled: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
      twoFactor,
    },
  }),
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  user: {
    additionalFields: {
      gameName: {
        type: "string",
        required: false,
        defaultValue: null,
        input: true,
      },
      uid: {
        type: "string",
        required: false,
        defaultValue: null,
        input: true,
      },
      twoFactorEnabled: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user: u, url }) => {
      try {
        const { sendEmail } = await import("@/lib/mailer");
        // Fetch siteName from DB at send time — avoid hardcoding
        const { siteConfig } = await import("@/db/schema");
        const { eq } = await import("drizzle-orm");
        const rows = await db
          .select({ logoTitle: siteConfig.logoTitle })
          .from(siteConfig)
          .where(eq(siteConfig.id, "default"))
          .limit(1);
        const siteName = rows[0]?.logoTitle ?? "";

        await sendEmail({
          to: u.email,
          templateName: "password_reset",
          variables: {
            userName: u.name || u.email,
            resetUrl: url,
            siteName,
          },
        });
      } catch (err) {
        // Log but don't crash auth — SMTP may not be configured yet
        console.error("Failed to send password reset email:", err);
      }
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          return {
            data: {
              ...user,
              emailVerified: true,
            },
          };
        },
      },
    },
  },
  plugins: [
    twoFactorPlugin({
      issuer: "1onlysarkar", // TOTP issuer shown in authenticator apps — intentionally static
      twoFactorRedirectUrl: "/two-factor",
    }),
    nextCookies(),
  ],
});

