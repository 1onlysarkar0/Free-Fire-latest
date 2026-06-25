# 1onlysarkar — Gaming Tournament Platform

## Project Overview
India's premier Free Fire esports tournament platform. Players join tournaments, pay entry fees via UPI, and win real cash prizes credited directly to their wallet.

## Stack
- **Framework**: Next.js 15.5 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4 + Radix UI / shadcn components
- **Database**: PostgreSQL via Supabase (Drizzle ORM)
- **Auth**: Better Auth 1.6 (Email, Google OAuth, TOTP 2FA)
- **Payments**: UPI wallet system (deposit + withdrawal)
- **AI**: Gemini-powered support chatbot
- **IDE**: VS Code

## Architecture
- `app/(public)/` — Public-facing pages (home, tournaments)
- `app/(auth)/` — Authentication pages (sign-in, sign-up, 2FA)
- `app/(dashboard)/` — Authenticated user dashboard (wallet, settings, my tournaments)
- `app/[dynamicSlug]/` — Admin panel (role-based, slug from DB) + public custom pages
- `app/api/` — API routes (all admin routes protected by `requireAdminOrRole`)
- `lib/` — Server-side helpers (auth, SEO, wallet, tournaments, notifications)
- `db/` — Drizzle schema + seed script

## Design System
- Primary: coral/orange `hsl(14 100% 50%)`
- Background: cream `hsl(36 33% 97%)`
- Fonts: IBM Plex Sans (body), Inter (headings), Momo Trust Display (display)
- All icons/colors use `text-foreground` (never `text-black`) for theme compatibility

## Database Tables (key)
| Table | Purpose |
|---|---|
| `site_config` | Brand name, logo, admin slug, contact info |
| `seo_config` | Per-page SEO (meta title, description, OG, Twitter, structured data JSON) |
| `navigation_item` | Header nav, footer nav, social links |
| `tournament` | All tournament data |
| `admin_role` / `admin_user_role` | RBAC roles and permissions |
| `wallet_transaction` | All wallet credits/debits |
| `withdraw_request` | User withdrawal requests |
| `chatbot_config` / `chatbot_knowledge` | AI chatbot configuration |

## Key Design Decisions
- **Fully DB-driven SEO**: All metadata (title, description, OG, JSON-LD) is stored in `seo_config` table and fetched at runtime — no hardcoded site names anywhere in the codebase.
- **Admin panel security**: The admin panel slug is stored in `site_config.admin_slug`. It is NEVER mentioned in `robots.txt` (allowlist approach — only `/` and `/tournaments/` are allowed, everything else disallowed with `Disallow: /`). The panel requires `isAdmin=true` on the user row.
- **RBAC**: All admin API routes use `requireAdminOrRole()` from `lib/admin-auth.ts`. Sub-admin roles have granular permissions stored as JSON in `admin_role.permissions`.
- **No fallback brand strings**: The string "1onlysarkar" does not appear in any catch block, fallback value, or default content in production code. If the DB is empty, pages show no title rather than a hardcoded one.

## Running the App
```bash
npm run dev          # Development server
npm run db:push      # Push schema to DB
npm run db:seed      # Seed initial data
npm run typecheck    # TypeScript check (must pass with 0 errors)
npm run build        # Production build
```

## Environment Variables Required
- `DATABASE_URL` — Supabase PostgreSQL connection string
- `NEXT_PUBLIC_APP_URL` — Public URL (e.g. https://1onlysarkar.com)
- `BETTER_AUTH_SECRET` — 32+ char random secret (MUST change from placeholder before production)
- `GEMINI_API_KEY` — Google Gemini API key for chatbot

## User Preferences
- IDE: VS Code
- Social: Instagram @1onlysarkar
- No hardcoded brand defaults anywhere in code
- All text/SEO content must come from the database
