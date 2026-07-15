# 1onlysarkar — Gaming Tournament Platform

A full-stack gaming tournament platform built for Indian esports / Free Fire tournaments. Built with **Next.js 15**, **Better Auth**, **Drizzle ORM + PostgreSQL**, and **Tailwind CSS v4**. Every piece of content — navbar, footer, auth pages, hero section, email templates, SEO — is **100% database-driven** with a full admin panel.

Production: **https://1onlysarkar.shop**

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Framework | Next.js 16.2 (App Router, Server Components, Server Actions) |
| Language | TypeScript 6.0 |
| Authentication | Better Auth 1.6.22 (Email+Password, Google OAuth, TOTP 2FA) |
| Database | PostgreSQL (Supabase Pooler) |
| ORM | Drizzle ORM 0.45 + Drizzle Kit 0.31 |
| Styling | Tailwind CSS v4.3 + Radix UI + shadcn/ui (new-york style) |
| Forms | Zod 3.25 validation |
| Payment Gateway | Gmail IMAP UTR Scraper (`imapflow`, `mailparser`) |
| QR Code | `qrcode.react` (client-side SVG) |
| Deployment | Vercel (serverless) / Docker |
| Email Dispatch | Nodemailer 9.0 (SMTP credentials & multi-provider configs stored in DB) |
| Code Editor | Monaco Editor (VS Code engine React wrapper) |
| React Email | Standard templates compilation and static rendering (`react-dom/server`) |
| Analytics | Vercel Analytics |
| Instagram | Instagram Graph API v25.0 (business_discovery for avatar fetch) |
| Animation | Motion 12.42 (Consolidated animation engine) |
| AI Chatbot | Google Gemini API (streaming SSE, Gemini-only + custom endpoint) |
| OG Images | Server-side `@vercel/og` / `next/og` (Edge Runtime, 1200×630) |

---

## Architecture & Directory Structure

- `app/(public)/` — Public-facing pages (home, tournaments, faq)
- `app/(auth)/` — Authentication pages (sign-in, sign-up, 2FA, forgot-password)
- `app/(dashboard)/` — Authenticated user dashboard (wallet, settings, my tournaments)
- `app/[dynamicSlug]/` — Admin panel (role-based, slug from DB) + public custom pages
- `app/api/` — API routes (all admin routes protected by `requireAdminOrRole`)
- `emails/` — React Email templates and compiler registry
- `lib/` — Server-side helpers (auth, SEO, wallet, tournaments, notifications, mailing)
- `lib/og-image/` — OG image generation templates (tournament, homepage, custom-page, auth)
- `lib/schema/` — Schema.org generator helpers (breadcrumbs, etc.)
- `lib/seo/` — SEO audit engine (weighted scoring, A-F grading)
- `db/` — Drizzle schema + seed script

---

## ⭐ Using the Admin Panel

Everything in the platform is managed through the admin panel. The panel is accessed at any dynamic slug configured in `site_config.admin_slug` (default: `/admin`).

### 1. Branding & Config (`/{slug}/site-config`)

Configure:
- **Logo**: Upload logo image (`logoSrc`), set URL (`logoUrl`) and alt text (`logoAlt`)
- **Site Name**: `logoTitle` — used everywhere (meta titles, navbar, email footers)
- **Admin Slug**: The URL path for the admin panel
- **Auth Panel**: Custom color, copyright text
- **Hero**: Headline, subheadline, stats, features
- **Footer**: Contact email, descriptions, social links
- **Dashboard**: Welcome message text
- **Navbar**: Dashboard link text, user profile labels

### 2. Navigation Items (`/{slug}/navigation`)

Add/edit/delete navigation links for:
- **Header** — Main navbar links
- **Footer** — Footer navigation columns
- **Social** — Social media icon links (Instagram, YouTube, etc.)
- **Mobile Extra** — Additional links shown only on mobile menu

Each nav item has: `title`, `url`, `description` (used in `llms.txt`), `icon` (lucide-react name), and `order`.

### 3. SEO Configuration (`/{slug}/seo`)

Full SEO dashboard with:

#### Per-Page SEO Config
Each page has its own config row in `seo_config`. Add new rows for any page ID:
- **Known pages**: `global` (fallback), `home`, `sign-in`, `sign-up`, `dashboard`, `forgot-password`
- **Tournaments**: `tournament-{nanoid}` — auto-created on tournament creation
- **Custom pages**: `page-{slug}` — auto-created on page publish
- **FAQ**: `page-faq` — seeded, describes the `/faq` page

Fields per config:
| Field | Purpose |
|-------|---------|
| Meta Title | Browser tab title, SERP title (30-60 chars recommended) |
| Meta Description | SERP description (120-160 chars recommended) |
| Meta Keywords | Comma-separated keywords |
| OG Title/Description/Image | Open Graph social preview card |
| Twitter Card/Title/Description/Image | Twitter/X card preview |
| Canonical URL | Preferred URL for search engines |
| Robots | `index, follow` or `noindex, nofollow` |
| Schema Type | WebPage, SportsEvent, FAQPage, HowTo, Organization, Article |
| Custom JSON-LD | Full custom schema markup (overrides auto-generated) |
| Dynamic OG | Toggle on/off — auto-generates OG images via `/api/og-image` |
| OG Template | Which visual template to use (homepage, tournament, custom-page, auth-page) |

#### Live SEO Audit
- **Real-time Checklist**: Shows pass/warning/critical checks as you fill the form
- **SERP Preview**: See how your page looks in Google Search results
- **Social Card Preview**: See how your page renders on social media
- **Score Badge**: A-F grading with percentage (A ≥90, B ≥80, C ≥70, D ≥50, F)
- **Audit Button**: Run a server-side audit that saves to `seo_audit_log` table
- **Bulk Audit**: Audit all pages at once
- **Bulk Tournament SEO**: Regenerate SEO configs for all tournaments with SportsEvent schema

#### Robots.txt Manager (`/{slug}/seo` → Robots.txt tab)
Configure crawler rules as a JSON array of objects:
```json
[
  { "userAgent": "*", "allow": ["/"], "disallow": ["/dashboard"] },
  { "userAgent": "GPTBot", "allow": ["/"] }
]
```
The sitemap URL and content signals are appended automatically.

> **Note**: Never add the admin panel slug (`/{slug}`) to `robots.txt` — the panel is security-through-obscurity. Only `/`, `/tournaments/` should be crawled.

### 4. Custom Pages (`/{slug}/pages`)

Create unlimited public pages at `/{slug}` using the visual editor:
1. Click "New Page"
2. Enter title, slug, and optional meta description
3. Choose editor mode: **Markdown** or **Visual** (rich text)
4. Write content using the Monaco Editor (with markdown toolbar)
5. Set SEO fields: meta title, description, keywords, robots, OG image
6. Save as **Draft** or **Publish**

Published pages get:
- SEO `page-{slug}` config auto-created
- Schema.org WebPage structured data
- Indexed appearance in `sitemap.xml` and `llms.txt`

**Examples**: Create pages like `/how-to-join`, `/rules`, `/about`, `/privacy-policy`

### 5. FAQ Manager (`/{slug}/faq`)

Manage the public `/faq` page content:
- Add/Edit/Delete FAQ entries (question + answer)
- Order by weight (lower = appears first)
- Real-time sorting by search query
- Auto-generates FAQPage Schema.org JSON-LD from DB entries
- Public FAQ page has animated accordion UI with search, highlights, spring animations

> **Security**: Same permission model as Custom Pages (`pages:view`, `pages:create`, `pages:edit`, `pages:delete`)

### 6. Auth Page Content (`/{slug}/auth-content`)

Customize the left-panel content for each auth page:
- Sign In
- Sign Up
- Forgot Password
- Reset Password
- Two-Factor Auth

Each page has a quote, subtext, and background color.

### 7. SMTP Config (`/{slug}/smtp`)

Configure email delivery:
- Multiple SMTP providers (Gmail, Resend, custom)
- Set default provider
- Test connection with a single click
- Bounce/fallback between providers

### 8. Email Templates (`/{slug}/email-templates`)

All transactional emails are DB-driven HTML templates:
- Categories: Welcome, Tournament, Wallet, Auth, System, Marketing
- Monaco HTML editor with live preview (side-by-side iframe)
- Variable system: use `{{variableName}}` in templates
- Built-in variables: `siteName`, `userName`, `tournamentName`, `prizePool`, etc.
- Duplicate templates, test-send to any email with variable overrides
- Variables schema validator per template

### 9. Tournaments (`/{slug}/tournaments`)

Create/manage tournaments with full CRUD:
- **Create**: Set name, type (FREE/PAID), fee, prize, mode (CLASSIC/RANKED), format (SOLO/DUO/SQUAD), maps, slots, dates
- **Edit**: Update any field (SEO auto-syncs with new name/fee/prize)
- **Room Credentials**: Set room ID + password (auto-notifies booked participants)
- **Status Flow**: UPCOMING → ACTIVE → ROOM_REVEALED → LIVE → COMPLETED (or CANCELLED)
- **Winners**: Declare by placement, prize auto-distributed to winner wallets
- **Participants**: View all participants, remove if needed
- **Cancellation**: Cancel with automatic refunds to all participants
- **Auto SEO**: On creation, SportsEvent schema + dynamic OG image auto-generated

### 10. Content Templates (`/{slug}/content-templates`)

Reusable Markdown/HTML templates for tournament descriptions and rules. Use these to quickly populate tournament details rather than writing from scratch each time.

### 11. Payment Gateway (`/{slug}/payment`)

Configure UPI payment settings:
- UPI ID, UPI name, QR code image
- IMAP connection settings (Gmail for UTR verification)
- Trusted email senders for auto-verification
- Test IMAP connection

### 12. Withdrawals (`/{slug}/withdraw`)

Manage user withdrawal requests:
- View all requests with user details
- Approve (mark as completed)
- Cancel (with optional refund to wallet)
- Configure: min amount, daily limit, description text

### 13. AI Chatbot (`/{slug}/chatbot`)

Full chatbot management system with 7 tabs:
1. **General** — Chatbot name, welcome message, display mode, colors
2. **AI Provider** — Google Gemini API key + model selection or custom endpoint
3. **System Prompt** — Editor with variable injection (`{{chatbot_name}}`, `{{knowledge_base}}`)
4. **Knowledge Base** — FAQ entries injected into AI context (priority-ordered)
5. **Rate Limiting** — Messages per window, per-user limits, cooldown
6. **Conversations** — Admin view of all chat sessions with message threads
7. **Widget** — Position, animation, trigger button customization

### 14. Users (`/{slug}/users`)

Manage platform users:
- View all users with wallet balance, game name, UID
- Edit profile fields
- Toggle top-player status
- Adjust wallet balance (credit/debit with reason)
- Assign roles
- Ban/unban users

### 15. Roles & Permissions (`/{slug}/roles`)

Granular Role-Based Access Control:
- Pre-seeded "Super Manager" role with all permissions
- Create custom roles with specific permissions
- Permissions groups: `site_config`, `navigation`, `auth_content`, `smtp`, `email_templates`, `seo`, `users`, `roles`, `pages`, `tournaments`, `wallet`, `content_templates`, `payment`, `chatbot`, `withdraw`, `cheater_reports`, `payment_help`
- Each group has: `view`, `create`, `edit`, `delete` (varies by group)
- Assign roles to users from the User edit page

### 16. Cheater Reports (`/{slug}/cheater-reports`)

Review and manage user reports of cheaters:
- View reporter name, game name, reported player's Free Fire UID, incident date/time, and linked tournament.
- Update report status (`PENDING` | `REVIEWED` | `RESOLVED` | `DISMISSED`) and add admin response notes.
- Submitting updates automatically triggers a user-facing notification.

### 17. Payment Help (`/{slug}/payment-help`)

Review and manage user-submitted payment dispute/help requests:
- View requester details, amount (₹), UTR number/transaction ID, and clear issue description.
- Update request status and add admin notes.
- Submitting updates automatically triggers a user-facing notification.

---

## Database Schema (36 Tables)

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
| `smtp_config` | Legacy single-row SMTP settings (deprecated but preserved for backwards compat) |
| `smtp_providers` | Multi-provider SMTP configurations (label, type, credentials, default, active flags) |
| `email_template` | Extended templates with categories, Monaco HTML source code, template key, variables schema, and active flags |
| `seo_config` | Per-page SEO; "global" row as site-wide fallback |
| `robots_config` | Single-row JSON rules for robots.txt generation |
| `seo_audit_log` | SEO audit history (score, grade, checks, critical issues) |
| `faq` | FAQ entries (question, answer, order) for public `/faq` page |
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

### Support & Disputes
| Table | Purpose |
|-------|---------|
| `cheater_report` | User-submitted reports against other players with UID, incident date, and description |
| `payment_help_request` | User-submitted payment issues containing amounts, UTR numbers, and description |

### AI Chatbot
| Table | Purpose |
|-------|---------|
| `chatbot_config` | Single row: AI provider, system prompt, rate limits, widget settings |
| `chatbot_knowledge` | FAQ entries injected into AI context (priority-ordered) |
| `chatbot_session` | Chat sessions (authenticated or anonymous) |
| `chatbot_message` | Immutable message log with token counts |

---

## SEO System Architecture

### DB-Driven Content Model

Every page's SEO metadata lives in `seo_config`:
- **Global Fallback** (`id: "global"`) — values inherited by all pages
- **Page-specific** — overrides global for that page only
- **Null inheritance** — any null field on a page row inherits from global

### Dynamic OG Image Generation

OG images are rendered server-side via `@vercel/og` at `/api/og-image`:

| Parameter | Example | Description |
|-----------|---------|-------------|
| `?tournament=id` | `?tournament=abc123` | Tournament detail OG (name, prize, fee, date, status) |
| `?template=homepage` | `?template=homepage` | Homepage OG (reads site name from DB) |
| `?template=custom-page&slug=x` | `?template=custom-page&slug=how-to-join` | Custom page OG (reads seo_config from DB) |
| `?template=auth&page=sign-in` | `?template=auth&page=sign-in` | Auth page OG (reads seo_config from DB) |

Each image is 1200×630 with `Cache-Control: public, max-age=31536000, immutable`.

### Schema.org Structured Data

| Page Type | Schema Type | Generated |
|-----------|-------------|-----------|
| Homepage | WebSite | Auto from global seo_config |
| Tournament | SportsEvent | Auto on tournament create/edit |
| FAQ page | FAQPage | Auto from FAQ DB entries |
| How-to page | HowTo | Auto for `/how-to-join` slug |
| Custom pages | WebPage | Auto on page publish |
| All pages | BreadcrumbList | Client-side from URL path |

### Robots.txt

Generated dynamically at `/robots.txt`:
- Rules from `robots_config` table (editable via admin panel)
- If empty, sensible defaults: all user-agents allowed
- Sitemap URL + Content-Signal header auto-appended
- AI crawler references to `/llms.txt`

### llms.txt (AI Content Discovery)

Available at `/llms.txt`:
- Lists all public routes with descriptions from `seo_config`
- Shows active tournaments with their metadata
- Entity definitions and structured data references from `llms-txt` seo_config
- Designed for AI/LLM crawlers (GPTBot, Claude, etc.)

### SEO Audit Engine (`lib/seo/audit.ts`)

Weighted scoring system (0-100, A-F grade):

| Check | Weight | What it validates |
|-------|--------|-------------------|
| Meta Title Present | 15 pts | Not empty |
| Meta Title Length | 10 pts | Between 30-60 chars |
| Meta Description Present | 15 pts | Not empty |
| Meta Description Length | 10 pts | Between 120-160 chars |
| OG Title Present | 10 pts | Not empty |
| OG Description Present | 10 pts | Not empty |
| OG Image Set | 15 pts | URL configured or dynamic OG enabled |
| Canonical URL Valid | 10 pts | Absolute URL set |
| Robots Directive Set | 5 pts | Not empty |
| Structured Data Valid | 10 pts | Valid JSON-LD |

Grades: A ≥90, B ≥80, C ≥70, D ≥50, F <50

---

## API Routes

### Auth Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...all]` | ALL | Better Auth catch-all |
| `/api/auth/check-email` | POST | Check email existence, password, 2FA status |

### Public Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/tournaments` | GET | List tournaments |
| `/api/tournaments/[id]` | GET | Get tournament detail |
| `/api/tournaments/[id]/join` | POST | Join tournament |
| `/api/tournaments/[id]/slots` | GET | Get tournament slots |
| `/api/chatbot/config` | GET | Public chatbot config |
| `/api/chatbot/chat` | POST | Send message, get SSE streaming |
| `/api/chatbot/session` | POST | Start new chat session |
| `/api/og-image` | GET | Dynamic OG image generation |

### User Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/user/complete-profile` | POST | Complete profile |
| `/api/user/permissions` | GET | Get user permissions |
| `/api/user/profile` | GET/PUT | Get/update profile |
| `/api/user/set-password` | POST | Set password for OAuth users |

### Wallet Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/wallet/me` | GET | Wallet balance |
| `/api/wallet/transactions` | GET | Transaction history |
| `/api/wallet/verify-payment` | POST | Submit UTR |
| `/api/wallet/withdraw/request` | POST | Submit withdrawal |
| `/api/wallet/withdraw/requests` | GET | Withdrawal history |

### Admin Routes
All require `requireAdminOrRole(request, permission?)`.

| Route Group | Capabilities |
|-------------|-------------|
| `/api/admin/stats` | Dashboard statistics |
| `/api/admin/site-config` | Site configuration CRUD |
| `/api/admin/navigation` | Navigation items CRUD |
| `/api/admin/users` | User management |
| `/api/admin/roles` | Role management CRUD |
| `/api/admin/tournaments` | Tournament CRUD + room, winners, cancel |
| `/api/admin/smtp-providers` | SMTP CRUD, default, test |
| `/api/admin/email-templates` | Templates CRUD, render, test |
| `/api/admin/auth-content` | Auth page content CRUD |
| `/api/admin/seo` | SEO config CRUD + audit |
| `/api/admin/seo/audit` | Run SEO audit on a page |
| `/api/admin/seo/bulk-regenerate` | Regenerate all tournament SEO |
| `/api/admin/seo/robots` | Get/update robots.txt rules |
| `/api/admin/faqs` | FAQ CRUD |
| `/api/admin/pages` | Custom page CRUD |
| `/api/admin/content-templates` | Content template CRUD |
| `/api/admin/payment-config` | Payment config + IMAP test |
| `/api/admin/payment-verifications` | Payment verification logs |
| `/api/admin/wallet/adjust` | Credit/debit user wallet |
| `/api/admin/withdraw/config` | Withdrawal config |
| `/api/admin/withdraw/requests` | List, complete, cancel |
| `/api/admin/chatbot-config` | Chatbot config |
| `/api/admin/chatbot-knowledge` | Knowledge base CRUD |
| `/api/admin/chatbot-sessions` | Chat sessions |

### Special Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/robots.txt` | GET | Dynamic robots.txt |
| `/llms.txt` | GET | AI content overview |
| `/sitemap.xml` | GET | Dynamic sitemap |

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

### AI Chatbot
- Google Gemini AI backend with live streaming (SSE, token-by-token)
- Custom OpenAI-compatible endpoint support
- Full admin panel: General, AI Provider, System Prompt, Knowledge Base, Rate Limiting, Conversations
- Session-based conversation history with configurable context window
- Knowledge base injection into system prompt (FAQ entries from DB)
- Rate limiting per user (logged in) or per IP (anonymous)
- Prompt injection protection and input moderation (max 300 words)
- Anonymous user blocking: unauthenticated users get clear sign-in message
- Template variables in system prompt: `{{chatbot_name}}`, `{{knowledge_base}}`, `{{user_name}}`, etc.

### Design System & Aesthetics
- Professional modern minimalist with subtle borders for structural separation
- Forced light creamy theme (no dark mode)
- Contrast-based elevation with soft shadows
- 59+ shadcn/ui components (new-york style)
- Custom utility classes: `card-list`, `card-settings`, `card-widget`
- Interactive hover buttons with sliding background animation

### Typography
- **Brand Logo**: Momo Trust Display (custom font-face)
- **Headings**: Inter (sans-serif)
- **Body**: IBM Plex Sans (readability)
- **Mono**: SF Mono (monospaced figures)

---

## Key Design Decisions

- **Fully DB-driven SEO**: All metadata (title, description, OG, Twitter, JSON-LD) is stored in `seo_config` table and fetched at runtime — no hardcoded site names anywhere in the codebase.
- **No Hardcoded Content**: Every text string visible to users comes from the database. Defaults exist only in `db/seed-db.ts`. Code files never contain fallback text.
- **Admin Panel Security**: The admin panel slug is stored in `site_config.admin_slug`. It is NEVER mentioned in `robots.txt` (allowlist approach). The panel requires `isAdmin=true` on the user row.
- **RBAC**: All admin API routes use `requireAdminOrRole()`. Sub-admin roles have granular permissions.
- **Dynamic OG Images**: Tournament, auth, and custom page OG images are rendered server-side — no need to upload static images per-page.
- **Self-Auditing SEO**: The admin panel includes live SEO auditing with real-time scoring (A-F) and actionable recommendations.

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

### Docker & Production Deployment

The project supports dual deployment on **Vercel** (serverless) and **Docker** (containerized with standalone Node server):

```bash
# 1. Build Docker image with multi-stage BuildKit caching
docker build -t 1onlysarkar/freefire:latest .

# 2. Run container locally with production env vars
docker run -p 3000:3000 --env-file .env 1onlysarkar/freefire:latest
```

#### Automated Dockploy / Registry Deployment
Push image to Docker Hub and trigger automatic Dockploy container rebuild:
```bash
# Windows (PowerShell)
npm run deploy

# Linux / macOS (Bash)
./deploy.sh
```

> **Important**: Set `APP_URL=https://yourdomain.com` (or `NEXT_PUBLIC_APP_URL`) in your production server environment variables so Better Auth validates requests and origins dynamically at runtime.

### Admin Panel Access
Set `is_admin = true` on your user in the database, then visit the admin route (default slug stored in `site_config.admin_slug`).

---

## Key Library Files

| File | Purpose |
|------|---------|
| `lib/auth.ts` | Better Auth server config |
| `lib/auth-client.ts` | Better Auth client config |
| `lib/admin-auth.ts` | Admin auth helpers |
| `lib/admin-permissions.ts` | Permission groups, hasPermission |
| `lib/chatbot.ts` | Chatbot core: Gemini streaming |
| `lib/navigation.ts` | DB-cached navbar/footer config |
| `lib/content.ts` | DB-cached auth page, dashboard, hero config |
| `lib/wallet.ts` | Wallet helpers (idempotency, row locking) |
| `lib/payment.ts` | IMAP UTR payment verification |
| `lib/mailer.ts` | Nodemailer email sending |
| `lib/notifications.ts` | Notification creation |
| `lib/seo.ts` | SEO data fetching and metadata building |
| `lib/seo/audit.ts` | SEO audit engine (0-100 scoring) |
| `lib/schema/breadcrumbs.ts` | BreadcrumbList schema generator |
| `lib/og-image/index.ts` | OG image types |
| `lib/og-image/templates/` | OG image visual templates (4 variants) |
| `lib/tournaments.ts` | Tournament CRUD helpers |
| `lib/user-data.ts` | User profile, wallet, permissions |
| `lib/schemas/admin.ts` | Zod validation schemas |
| `db/schema.ts` | Drizzle schema (36 tables) |
| `db/seed-db.ts` | Idempotent seed script |
| `db/drizzle.ts` | Database connection |
| `middleware.ts` | Auth route protection |

---

## Design System & UI Consistency Guidelines

### 1. Global Page Layout & Padding
- Page wrappers must NOT define duplicate paddings. Padding is handled globally by parent layouts.

### 2. Standard Header Components
All page headers must follow a uniform style using the `.header-admin` utility class.

### 3. Card Types
| Utility Class | Use Case |
| :--- | :--- |
| `card-list` | Listings, tables, data lists (overflow: hidden) |
| `card-settings` | Settings panels, forms (overflow: visible) |
| `card-widget` | Dashboard stat cards, info blocks |

### 4. Color Tokens (CSS Variables)
| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `hsl(14, 100%, 50%)` | Brand orange (#FF5A1F) |
| `--background` | `hsl(36, 33%, 97%)` | Warm cream |
| `--card` | `hsl(0, 0%, 100%)` | White card surfaces |
| `--accent` | `hsl(36, 22%, 93%)` | Subtle warm tint |
| `--muted` | `hsl(42, 12%, 90%)` | Muted backgrounds |
| `--destructive` | `hsl(4, 76%, 49%)` | Error/danger |
| `--success` | `hsl(142, 71%, 36%)` | Success states |
| `--warning` | `hsl(38, 92%, 50%)` | Warning states |
| `--info` | `hsl(211, 100%, 57%)` | Information |

---

## AI Coding Guidance & Development Guardrails

1. **MANDATORY Discovery Phase** — Before writing any code or proposing modifications, you MUST read the database `schema.ts`, the seed file `seed-db.ts`, global stylesheet/theme tokens, and any related core files/pages to understand existing conventions and reuse utilities.
2. **Forced Light Theme** — Never add `dark:` utility classes or dark mode triggers.
3. **No Hardcoded Brand Fallbacks** — All site branding, meta tags, titles must resolve from the database. The string "1onlysarkar" does not appear in fallback catch blocks or default content.
4. **Database-Driven SEO** — Do not override page titles manually. Let `lib/seo.ts` generate metadata from `seo_config`.
5. **Database Transaction Concurrency** — Wallet adjustments must be wrapped in `db.transaction()` with row-level locking.
6. **Preserving Slot Booking Attributes** — Do not clear `teamName` or `ignList` of adjacent slots when a single user books.
7. **Clean Up & Count Tracking** — Deleted tournaments increment `site_config.deleted_tournaments_count`.
8. **No Hardcoded Fallbacks** — All defaults must be in `db/seed-db.ts`. Code files must not contain `|| "fallback text"` for content/metadata. Empty DB values should show nothing rather than a hardcoded string.

---

## 🛠️ Page Creation Guidelines

Follow these step-by-step patterns whenever introducing new pages:

### 1. Adding a Public (User-Facing) Page
1. **Directory Location**: Place under `app/(public)/[page-slug]/`.
2. **Server Component (`page.tsx`)**:
   - Verify user authentication session if required using `auth.api.getSession({ headers })`.
   - Implement `generateMetadata()` by fetching page-specific data with `getSeoData("[page-slug]")` and returning `buildMetadata(...)` combined with geo metadata `buildGeoMetadata()`.
   - Render a client component wrapper passing necessary session or DB properties.
3. **Client Component (`_components/[page-name]-client.tsx`)**:
   - Use Lucide icons, Next.js `<Link>` for navigation, and Shadcn UI components.
   - For multi-step forms, wrap steps using the animatable `<MultiStepForm>` component from `@/components/ui/multi-step-form`.
   - Enforce client-side validation using standard custom triggers or schema validation libraries.
4. **SEO Config Entry**: Add the page meta definition inside `pages` array in `db/seed-db.ts` using `pageMeta("[page-slug]", { ... })`, and run `npm run db:seed` to register it.

### 2. Adding an Admin Panel Page
1. **Directory Location**: Place under `app/[dynamicSlug]/[page-slug]/`.
2. **Server Component (`page.tsx`)**:
   - Protect access with page-level permissions by calling `await requirePagePermission(dynamicSlug, "[permission_key]:view")`.
   - Render the admin client component wrapper.
3. **Admin Client Component (`_components/[page-name]-admin-client.tsx`)**:
   - Use standard admin header markup styled with `.header-admin`.
   - Render data list tables or config forms inside cards utilizing `.card-list` or `.card-settings` utility classes.
   - Implement filters, sorting, and dialog boxes for details or status updates.
   - Ensure all status modifications trigger user notification calls via `createNotification` in the API handler.
4. **RBAC & Sidebar Registry**:
   - Register the permission keys under the correct group in `lib/admin-permissions.ts`.
   - Add permission values to the default roles inside `seedAdminRoles()` in `db/seed-db.ts`.
   - Add navigation links to the sidebar hierarchy inside `getSections` within `app/[dynamicSlug]/_components/sidebar.tsx` using the corresponding `sectionKey` matching the DB permission.

