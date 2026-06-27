# 1onlysarkar — Gaming Tournament Platform

A full-stack gaming tournament platform built for Indian esports / Free Fire tournaments. Built with **Next.js 15**, **Better Auth**, **Drizzle ORM + PostgreSQL**, and **Tailwind CSS v4**. Every piece of content — navbar, footer, auth pages, hero section, email templates, SEO — is **100% database-driven** with a full admin panel.

Production: **https://1onlysarkar.shop**

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Framework | Next.js 15.5 (App Router, Server Components, Server Actions) |
| Language | TypeScript 5.9 |
| Authentication | Better Auth 1.6 (Email+Password, Google OAuth, TOTP 2FA) |
| Database | PostgreSQL (Supabase Pooler) |
| ORM | Drizzle ORM 0.43 + Drizzle Kit 0.31 |
| Styling | Tailwind CSS v4.3 + Radix UI + shadcn/ui (new-york style) |
| State Management | @tanstack/react-query 5.100 |
| Forms | react-hook-form 7.76 + Zod 3.25 validation |
| Payment Gateway | Gmail IMAP UTR Scraper (`node-imap`, `mailparser`) |
| QR Code | `qrcode.react` (client-side SVG) |
| Charts | Recharts 3.8 |
| Deployment | Vercel (serverless) / Docker |
| Email Dispatch | Nodemailer 8.0 (SMTP credentials stored in DB) |
| Analytics | Vercel Analytics |
| Instagram | Instagram Graph API v25.0 (business_discovery for avatar fetch) |
| Animation | Framer Motion 12.40 / Motion 12.40 |
| AI Chatbot | Google Gemini API (streaming SSE, Gemini-only + custom endpoint) |

---

## Architecture & Directory Structure

- `app/(public)/` — Public-facing pages (home, tournaments)
- `app/(auth)/` — Authentication pages (sign-in, sign-up, 2FA)
- `app/(dashboard)/` — Authenticated user dashboard (wallet, settings, my tournaments)
- `app/[dynamicSlug]/` — Admin panel (role-based, slug from DB) + public custom pages
- `app/api/` — API routes (all admin routes protected by `requireAdminOrRole`)
- `lib/` — Server-side helpers (auth, SEO, wallet, tournaments, notifications)
- `db/` — Drizzle schema + seed script

---

## Features

### Authentication
- Multi-step sign-in (email → password → optional 2FA)
- Multi-step sign-up (email → password → profile completion)
- Google OAuth with account linking
- TOTP Two-Factor Authentication with backup codes
- Password reset via email
- Profile completion for OAuth users (game name, UID, Instagram)

### Tournament System
- Create/manage tournaments (FREE/PAID types)
- Slot-based registration (Solo/Duo/Squad formats)
- Real-time slot availability tracking
- Room ID & Password reveal for participants
- Winner declaration with prize distribution
- Tournament cancellation with automatic refunds
- Entry fee deduction from wallet balance

### Wallet & Payments
- UPI QR code generation for deposits
- IMAP-based automatic UTR verification via Gmail
- Transaction history with status tracking
- Wallet debit/credit with idempotency and row locking
- Rate limiting on payment verification attempts
- **Withdrawal system**: User-submitted withdrawal requests to UPI
- Amount deducted immediately on request with admin processing
- Configurable min withdrawal amount, daily limit, and markdown description
- Admin can complete or cancel requests with optional refund on cancel

### Admin Panel (Dynamic Slug)
- Dashboard with real-time statistics
- User management (ban, role assignment, avatar sync)
- Tournament management (CRUD, room credentials, winners)
- Role-based access control (RBAC) with 47 permissions
- Site configuration (logo, hero, footer, contact)
- Navigation management (header, footer, social links)
- Email template editor with variable placeholders
- SMTP configuration with test connection
- SEO configuration (per-page meta, OG, Twitter cards)
- Custom page builder with markdown editor
- Instagram Graph API configuration
- Payment gateway configuration
- Auth page content customization
- Content templates (Description/Rules)
- **AI Chatbot** configuration (full 7-tab panel)

### AI Chatbot
- Google Gemini AI backend with live streaming (SSE, token-by-token)
- Custom OpenAI-compatible endpoint support
- Full admin panel: General, AI Provider, System Prompt, Knowledge Base, Rate Limiting, Conversations
- Session-based conversation history with configurable context window
- Knowledge base injection into system prompt (FAQ entries from DB)
- Rate limiting per user (logged in) or per IP (anonymous)
- Prompt injection protection and input moderation (max 300 words)
- Anonymous user blocking: unauthenticated users get clear sign-in message
- Full conversation logs viewable in admin panel with inline message thread
- Template variables in system prompt: `{{chatbot_name}}`, `{{knowledge_base}}`, `{{user_name}}`, etc.

### Design System & Aesthetics
- Professional modern minimalist with subtle borders for structural separation
- Forced light creamy theme (no dark mode)
- Contrast-based elevation with soft shadows
- 59+ shadcn/ui components (new-york style)
- Custom utility classes: `card`, `card-coral`, `card-inset`, `input`, `btn`, `badge`
- Interactive hover buttons with sliding background animation
- Navigation uses `hover:bg-accent` / `data-[state=open]:bg-accent` for interactive states
- Navbar has `h-16` height with consistent `px-4 py-2` padding on all nav items

### Typography
- **Brand Logo**: Momo Trust Display (custom font-face)
- **Headings**: Inter (sans-serif)
- **Body**: IBM Plex Sans (readability)
- **Mono**: SF Mono (monospaced figures)

---

## Key Design Decisions

- **Fully DB-driven SEO**: All metadata (title, description, OG, JSON-LD) is stored in `seo_config` table and fetched at runtime — no hardcoded site names anywhere in the codebase.
- **Admin Panel Security**: The admin panel slug is stored in `site_config.admin_slug`. It is NEVER mentioned in `robots.txt` (allowlist approach — only `/` and `/tournaments/` are allowed, everything else disallowed with `Disallow: /`). The panel requires `isAdmin=true` on the user row.
- **RBAC**: All admin API routes use `requireAdminOrRole()` from `lib/admin-auth.ts`. Sub-admin roles have granular permissions stored as JSON in `admin_role.permissions`.
- **No Fallback Brand Strings**: The string "1onlysarkar" does not appear in any catch block, fallback value, or default content in production code. If the DB is empty, pages show no title rather than a hardcoded one.

---

## Database Schema (24 Tables)

### Better Auth Core
| Table | Purpose |
|-------|---------|
| `user` | Auth users + gaming fields + admin/ban flags |
| `session` | Auth sessions (cascade on user delete) |
| `account` | OAuth provider accounts |
| `verification` | Email/token verification records |
| `twoFactor` | TOTP secrets + backup codes |

### Site & Content
| Table | Purpose |
|-------|---------|
| `site_config` | Single row: logo, navbar, hero, footer, adminSlug |
| `navigation_item` | Header, footer, social, mobile-extra nav links |
| `auth_page_content` | Left-panel quote+subtext for each auth page |
| `smtp_config` | SMTP configuration (single row) |
| `email_template` | HTML templates with `{{variable}}` placeholders |
| `seo_config` | Per-page SEO; "global" row as site-wide fallback |
| `custom_page` | Rich-text pages served at `/[slug]` |
| `content_templates` | Reusable Description/Rules templates |

### Tournament
| Table | Purpose |
|-------|---------|
| `tournaments` | Tournament definitions (name, type, fee, prize, slots, status) |
| `tournament_slots` | Individual slots per tournament |
| `tournament_participants` | User registrations linking user to tournament and slot |
| `tournament_winners` | Declared winners with placement and prize |
| `tournament_cancellations` | Cancellation records |
| `cancellation_refunds` | Refund records for cancelled tournaments |

### Wallet & Payment
| Table | Purpose |
|-------|---------|
| `wallets` | User wallet (balance in coins) |
| `wallet_transactions` | Transaction log with idempotency |
| `payment_config` | UPI configurations (single row) |
| `payment_verification` | UTR verification logs |
| `withdraw_config` | Withdrawal rules config (single row) |
| `withdraw_requests` | User withdrawal requests with status |

### RBAC & Notifications
| Table | Purpose |
|-------|---------|
| `admin_role` | Named roles with JSON permissions array |
| `admin_user_role` | User-role junction (cascade) |
| `notifications` | User notifications (type, title, message, isRead) |

### AI Chatbot
| Table | Purpose |
|-------|---------|
| `chatbot_config` | Single row: AI provider, system prompt, rate limits, widget settings |
| `chatbot_knowledge` | FAQ entries injected into AI context (priority-ordered) |
| `chatbot_session` | Chat sessions (authenticated or anonymous) |
| `chatbot_message` | Immutable message log with token counts |

---

## API Routes (61 Routes)

### Auth Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...all]` | ALL | Better Auth catch-all |
| `/api/auth/check-email` | POST | Check email existence, password, 2FA status |

### User Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/user/complete-profile` | POST | Complete profile (game name, UID) |
| `/api/user/permissions` | GET | Get user permissions and roles |
| `/api/user/profile` | GET/PUT | Get/update user profile |
| `/api/user/set-password` | POST | Set password for OAuth users |

### Tournament Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/tournaments` | GET | List tournaments |
| `/api/tournaments/[id]` | GET | Get tournament detail |
| `/api/tournaments/[id]/join` | POST | Join tournament |
| `/api/tournaments/[id]/slots` | GET | Get tournament slots |

### Wallet Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/wallet/me` | GET | Get current wallet balance |
| `/api/wallet/transactions` | GET | Get transaction history |
| `/api/wallet/verify-payment` | POST | Submit UTR for IMAP verification |
| `/api/wallet/withdraw/request` | POST | Submit withdrawal request (deducts wallet) |
| `/api/wallet/withdraw/requests` | GET | Get user's withdrawal request history |

### Admin Routes (16 groups)
All admin routes require `requireAdminOrRole(request, permission?)`.

| Route Group | Capabilities |
|-------------|-------------|
| `/api/admin/stats` | Dashboard statistics |
| `/api/admin/site-config` | Site configuration CRUD |
| `/api/admin/navigation` | Navigation items CRUD |
| `/api/admin/users` | User management + avatar sync |
| `/api/admin/roles` | Role management CRUD |
| `/api/admin/tournaments` | Tournament CRUD + room credentials, winners, cancel, participants, slots |
| `/api/admin/smtp` | SMTP configuration |
| `/api/admin/email-templates` | Email template CRUD |
| `/api/admin/auth-content` | Auth page content CRUD |
| `/api/admin/seo` | SEO configuration CRUD |
| `/api/admin/pages` | Custom page CRUD |
| `/api/admin/content-templates` | Content template CRUD |
| `/api/admin/payment-config` | Payment config + IMAP test |
| `/api/admin/payment-verifications` | Payment verification logs |
| `/api/admin/wallet/adjust` | Credit/debit user wallet |
| `/api/admin/withdraw/config` | GET/PUT | Get/update withdrawal configuration |
| `/api/admin/withdraw/requests` | GET | List all withdrawal requests |
| `/api/admin/withdraw/requests/[id]` | POST | Complete/cancel a withdrawal request |
| `/api/admin/chatbot-config` | Chatbot config GET/PUT + test-connection |
| `/api/admin/chatbot-knowledge` | Knowledge base CRUD |
| `/api/admin/chatbot-sessions` | Chat session list + detail + delete |

### Public Chatbot Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/chatbot/config` | GET | Public chatbot config (safe fields only) |
| `/api/chatbot/session` | POST | Start new chat session |
| `/api/chatbot/session/[token]` | GET | Get session message history |
| `/api/chatbot/session/[token]/end` | POST | End a session |
| `/api/chatbot/chat` | POST | Send message, get streaming SSE AI response |

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Create .env file (see .env.example for template)
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"
BETTER_AUTH_SECRET="your-32-char-minimum-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
PORT=3000

# 3. Push schema to database
npm run db:push

# 4. Seed all tables (idempotent, safe to rerun)
npm run db:seed

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts
| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript check (must pass with 0 errors) |
| `npm run check` | Run typecheck, lint, and tests |
| `npm run test` | Run tests with native Node test runner |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed database (idempotent) |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run vercel-build` | Full Vercel build pipeline |

### Docker
```bash
docker build -t 1onlysarkar .
docker run -p 3000:3000 --env-file .env 1onlysarkar
```

### Admin Panel Access
Set `is_admin = true` on your user in the database, then visit the admin route (default slug stored in `site_config.adminSlug`).

---

## Key Library Files

| File | Purpose |
|------|---------|
| `lib/auth.ts` | Better Auth server config (Email+Password, Google OAuth, TOTP) |
| `lib/auth-client.ts` | Better Auth client config |
| `lib/admin-auth.ts` | Admin auth helpers (getAdminUser, requireAdminOrRole) |
| `lib/admin-permissions.ts` | Permission groups, hasPermission, canAccessSection |
| `lib/chatbot.ts` | Chatbot core: Gemini streaming, session management, knowledge base, moderation |
| `lib/navigation.ts` | DB-cached navbar/footer config |
| `lib/content.ts` | DB-cached auth page text, dashboard config, hero config |
| `lib/wallet.ts` | Wallet helpers (idempotency, row locking) |
| `lib/payment.ts` | IMAP UTR payment verification |
| `lib/mailer.ts` | Nodemailer email sending |
| `lib/notifications.ts` | Notification creation and retrieval |
| `lib/seo.ts` | SEO data fetching and metadata building |
| `lib/tournaments.ts` | Tournament CRUD helpers |
| `lib/user-data.ts` | User profile, wallet, permissions, top players |
| `lib/schemas/admin.ts` | Zod validation schemas |
| `db/schema.ts` | Drizzle schema (24 tables) |
| `db/seed-db.ts` | Idempotent seed script |
| `db/drizzle.ts` | Database connection (postgres.js driver) |
| `middleware.ts` | Auth route protection |

---

## Design System & UI Consistency Guidelines

To ensure that all pages (including the Admin Panel, Dashboards, and public views) share a unified look and feel rather than looking mismatched, developers must strictly adhere to the following design system tokens and component layout rules.

### 1. Global Page Layout & Padding
* **Page Wrapper Padding**: Page wrappers must NOT define duplicate paddings. Padding is handled globally by parent layouts (e.g., `layout.tsx` defines `p-4 md:p-6 lg:p-8 w-full min-w-0 bg-background` for the `<main>` container).
* **Inner Page Containers**: Pages or client components should start with a clean layout class:
  ```tsx
  return (
    <div className="w-full min-w-0 space-y-6 animate-in fade-in duration-200">
      {/* Page Content */}
    </div>
  );
  ```

### 2. Standard Header Components
All page headers must follow a uniform style:
* **Icon container**: A `rounded-xl bg-primary/10 p-2.5` container with a `h-5 w-5` brand-colored icon.
* **Title size**: `text-xl font-bold tracking-tight text-foreground`.
* **Description spacing**: `text-sm text-muted-foreground mt-0.5`.
* **Header bottom divider**: `border-b border-border/10 pb-6`.
* **Action buttons**: Positioned on the right side using a flex row with `flex items-center gap-2`.

```tsx
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/10 pb-6">
  <div className="flex items-center gap-4">
    <div className="rounded-xl bg-primary/10 p-2.5">
      <Trophy className="h-5 w-5 text-primary" />
    </div>
    <div>
      <h1 className="text-xl font-bold tracking-tight text-foreground">Page Title</h1>
      <p className="text-sm text-muted-foreground mt-0.5">Description text.</p>
    </div>
  </div>
</div>
```

### 3. Card Types & Design Tokens
Cards are the primary structural block of the UI and have three specific use cases:

| Card Role | CSS Styling classes | Typical Use Case |
| :--- | :--- | :--- |
| **Listings & Grids** | `rounded-2xl bg-accent/40 border border-border/20 shadow-sm overflow-hidden` | Tables, user lists, tournament schedules, search filters. |
| **Settings & Inputs** | `rounded-2xl bg-accent/60 border border-border/20 shadow-sm overflow-hidden` | Configuration panels (e.g., SMTP Config, Wallet settings). |
| **Grid Items / Widgets** | `rounded-2xl bg-accent/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-0` | Dashboard statistics, quick access cards, roles. |

### 4. Tables & Lists
To maintain consistency in data representations:
* **Table Header**: Use `<thead className="bg-accent/40 border-b border-border/10">`.
* **Table Dividers**: Use `<tbody className="divide-y divide-border/10">`.
* **Row Hover States**: Apply `<tr className="hover:bg-accent/15 transition-colors">` to list rows.
* **Pills & Badges**: Use `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border` for state indicators.

### 5. Color Tokens (CSS Variables)
| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `hsl(14, 100%, 50%)` | Brand orange (#FF5A1F) |
| `--background` | `hsl(36, 33%, 97%)` | Warm cream background |
| `--card` | `hsl(0, 0%, 100%)` | White card surfaces |
| `--accent` | `hsl(36, 22%, 93%)` | Subtle warm tint |
| `--muted` | `hsl(42, 12%, 90%)` | Muted backgrounds |
| `--destructive` | `hsl(4, 76%, 49%)` | Error/danger |
| `--success` | `hsl(142, 71%, 36%)` | Success states |
| `--warning` | `hsl(38, 92%, 50%)` | Warning states |
| `--info` | `hsl(211, 100%, 57%)` | Information |

### 6. Shadows
| Token | Value |
|-------|-------|
| `--shadow-xs` | `0 1px 2px hsl(225 5% 22% / 0.06)` |
| `--shadow-sm` | `0 1px 3px hsl(225 5% 22% / 0.08)` |
| `--shadow-md` | `0 4px 12px hsl(225 5% 22% / 0.1)` |
| `--shadow-lg` | `0 12px 28px hsl(225 5% 22% / 0.12)` |

---

## User Preferences & Constraints

- **IDE**: VS Code
- **Social**: Instagram `@1onlysarkar`
- **Branding**: No hardcoded brand defaults or strings (e.g. "1onlysarkar") anywhere in the catch blocks, fallback values, or default content. All text/SEO content must come dynamically from the database.
