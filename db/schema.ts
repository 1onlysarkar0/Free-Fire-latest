import {
  boolean,
  index,
  uniqueIndex,
  integer,
  pgTable,
  text,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// BETTER AUTH CORE TABLES
// Required by better-auth. Do not rename or remove.
// ─────────────────────────────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  // Gaming-specific custom fields
  gameName: text("gameName"),
  uid: text("uid"),
  twoFactorEnabled: boolean("twoFactorEnabled").default(false),
  // Required by better-auth twoFactor plugin (v1.6+): tracks failed attempts & lockout
  failedVerificationCount: integer("failedVerificationCount").default(0),
  lockedUntil: timestamp("lockedUntil"),
  topPlayer: boolean("top_player").default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  // Ban system
  isBanned: boolean("is_banned").notNull().default(false),
  banReason: text("ban_reason"),
}, (t) => [
  index("user_top_player_idx").on(t.topPlayer),
  index("user_is_admin_idx").on(t.isAdmin),
  index("user_is_banned_idx").on(t.isBanned),
]);

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
}, (t) => [
  index("session_user_id_idx").on(t.userId),
  index("session_token_idx").on(t.token),
]);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
}, (t) => [
  index("account_user_id_idx").on(t.userId),
]);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const twoFactor = pgTable("twoFactor", {
  id: text("id").primaryKey(),
  secret: text("secret").notNull(),
  backupCodes: text("backupCodes").notNull(),
  verified: boolean("verified").notNull().default(false),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  failedVerificationCount: integer("failedVerificationCount").default(0),
}, (t) => [
  index("two_factor_user_id_idx").on(t.userId),
]);

// ─────────────────────────────────────────────────────────────────────────────
// SITE CONFIGURATION
// Single row (id = "default"). Controls branding, auth pages, hero, dashboard.
// ─────────────────────────────────────────────────────────────────────────────

export const siteConfig = pgTable("site_config", {
  id: text("id").primaryKey(),
  deletedTournamentsCount: integer("deleted_tournaments_count").notNull().default(0),

  // ── Brand / Logo ──────────────────────────────────────────────────────────
  siteUrl: text("site_url"),
  logoUrl: text("logo_url").notNull().default("/"),
  logoSrc: text("logo_src").notNull().default("/assets/logo.svg"),
  logoAlt: text("logo_alt").notNull().default("logo"),
  logoTitle: text("logo_title").notNull().default("1onlysarkar"),

  // ── Navbar Auth Buttons ───────────────────────────────────────────────────
  authLoginText: text("auth_login_text").notNull().default("Log in"),
  authLoginUrl: text("auth_login_url").notNull().default("/sign-in"),
  authSignupText: text("auth_signup_text").notNull().default("Create account"),
  authSignupUrl: text("auth_signup_url").notNull().default("/sign-up"),

  // ── Auth Pages — Left Panel ───────────────────────────────────────────────
  authPanelImageUrl: text("auth_panel_image_url"),
  authPanelColor: text("auth_panel_color").default("#FF5A1F"),

  // ── Footer / Copyright ────────────────────────────────────────────────────
  copyrightText: text("copyright_text"),

  // ── Homepage Hero ─────────────────────────────────────────────────────────
  heroHeadline: text("hero_headline"),
  heroSubheadline: text("hero_subheadline"),
  heroCtaPrimaryText: text("hero_cta_primary_text"),
  heroCtaPrimaryUrl: text("hero_cta_primary_url"),
  heroCtaSecondaryText: text("hero_cta_secondary_text"),
  heroCtaSecondaryUrl: text("hero_cta_secondary_url"),
  heroBadgeText: text("hero_badge_text"),
  heroBadgeUrl: text("hero_badge_url"),


  // ── UI Strings & Theme ────────────────────────────────────────────────────
  navbarDashboardText: text("navbar_dashboard_text").default("Dashboard"),
  userProfileMyAccountText: text("user_profile_my_account_text").default("My Account"),
  userProfileLogOutText: text("user_profile_log_out_text").default("Log out"),

  // ── Contact Info (footer, emails) ─────────────────────────────────────────
  contactEmail: text("contact_email"),
  companyAddress: text("company_address"),
  jurisdictionName: text("jurisdiction_name"),

  // ── Admin Panel Access ────────────────────────────────────────────────────
  adminSlug: text("admin_slug").default("admin"),

  // ── Global Cache Version Token ────────────────────────────────────────────
  // Bumped by admin "Purge Cache" action. Clients compare against localStorage
  // and hard-reload once when mismatched, clearing all browser caches.
  cacheVersion: text("cache_version").notNull().default("1"),
});

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION ITEMS
// ─────────────────────────────────────────────────────────────────────────────

export const navigationItem = pgTable("navigation_item", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull().default("#"),
  description: text("description"),
  icon: text("icon"),
  parentId: text("parent_id"),
  order: integer("order").notNull().default(0),
  isMobileExtra: boolean("is_mobile_extra").notNull().default(false),
  isFooter: boolean("is_footer").notNull().default(false),
  isSocial: boolean("is_social").notNull().default(false),
}, (t) => [
  index("nav_item_footer_idx").on(t.isFooter),
  index("nav_item_social_idx").on(t.isSocial),
  index("nav_item_order_idx").on(t.order),
]);

// ─────────────────────────────────────────────────────────────────────────────
// AUTH PAGE CONTENT
// ─────────────────────────────────────────────────────────────────────────────

export const authPageContent = pgTable("auth_page_content", {
  id: text("id").primaryKey(),
  quote: text("quote").notNull(),
  subtext: text("subtext").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// SMTP CONFIGURATION (legacy single-row — kept for backwards compat)
// ─────────────────────────────────────────────────────────────────────────────

export const smtpConfig = pgTable("smtp_config", {
  id: text("id").primaryKey(),
  host: text("host").notNull(),
  port: integer("port").notNull().default(587),
  username: text("username").notNull(),
  password: text("password").notNull(),
  fromName: text("from_name").notNull(),
  fromEmail: text("from_email").notNull(),
  secure: boolean("secure").notNull().default(false),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// SMTP PROVIDERS (multi-provider, replaces smtp_config for new logic)
// providerType: 'gmail_smtp' | 'resend_smtp'
// Only one row can have isDefault = true at a time (enforced in API layer).
// ─────────────────────────────────────────────────────────────────────────────

export const smtpProviders = pgTable("smtp_providers", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  providerType: text("provider_type").notNull().default("gmail_smtp"),
  host: text("host").notNull(),
  port: integer("port").notNull().default(587),
  secure: boolean("secure").notNull().default(false),
  username: text("username").notNull(),
  password: text("password").notNull(),
  fromName: text("from_name").notNull(),
  fromEmail: text("from_email").notNull(),
  replyTo: text("reply_to"),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATES
// editorType: 'html' | 'visual' | 'react_email'
// category: 'auth' | 'wallet' | 'tournaments' | 'notifications' | 'marketing' | 'system'
// designJson: Unlayer visual editor JSON payload (for editorType='visual')
// templateKey: maps to React Email registry (for editorType='react_email')
// variablesSchema: JSON string of variable definitions
// ─────────────────────────────────────────────────────────────────────────────

export const emailTemplate = pgTable("email_template", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  subject: text("subject").notNull(),
  previewText: text("preview_text"),
  bodyHtml: text("body_html").notNull(),
  designJson: text("design_json"),
  templateKey: text("template_key"),
  variables: text("variables"),
  variablesSchema: text("variables_schema"),
  description: text("description"),
  category: text("category").notNull().default("system"),
  editorType: text("editor_type").notNull().default("html"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});


// ─────────────────────────────────────────────────────────────────────────────
// SEO CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const seoConfig = pgTable("seo_config", {
  id: text("id").primaryKey(),

  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),

  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  ogImage: text("og_image"),
  ogType: text("og_type").default("website"),

  twitterCard: text("twitter_card").default("summary_large_image"),
  twitterSite: text("twitter_site"),
  twitterTitle: text("twitter_title"),
  twitterDescription: text("twitter_description"),
  twitterImage: text("twitter_image"),

  canonicalUrl: text("canonical_url"),
  robots: text("robots").default("index, follow"),
  structuredDataJson: text("structured_data_json"),

  schemaType: text("schema_type").default("WebPage"),
  schemaData: jsonb("schema_data"),
  ogImageDynamic: boolean("og_image_dynamic").default(false),
  ogImageTemplate: text("og_image_template"),
  iconName: text("icon_name").default("Globe"),
  seoScore: integer("seo_score"),
  lastAudited: timestamp("last_audited"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// ROBOTS CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const robotsConfig = pgTable("robots_config", {
  id: text("id").primaryKey().default("default"),
  rules: jsonb("rules").notNull().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// SEO AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────

export const seoAuditLog = pgTable("seo_audit_log", {
  id: text("id").primaryKey(),
  pageId: text("page_id").notNull(),
  score: integer("score").notNull(),
  grade: text("grade").notNull(),
  checks: jsonb("checks").notNull().default([]),
  criticalIssues: jsonb("critical_issues").default([]),
  warnings: jsonb("warnings").default([]),
  suggestions: jsonb("suggestions").default([]),
  checkedAt: timestamp("checked_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROLES
// ─────────────────────────────────────────────────────────────────────────────

export const adminRole = pgTable("admin_role", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: text("permissions").notNull().default("[]"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN USER ROLES
// ─────────────────────────────────────────────────────────────────────────────

export const adminUserRole = pgTable("admin_user_role", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  roleId: text("role_id")
    .notNull()
    .references(() => adminRole.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
}, (t) => [
  index("admin_user_role_user_idx").on(t.userId),
  index("admin_user_role_role_idx").on(t.roleId),
]);

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM PAGES
// ─────────────────────────────────────────────────────────────────────────────

export const customPage = pgTable("custom_page", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  status: text("status").notNull().default("draft"), // 'published' | 'draft'

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("custom_page_status_idx").on(t.status),
]);

// ─────────────────────────────────────────────────────────────────────────────
// TOURNAMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const tournament = pgTable("tournaments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("FREE"), // FREE | PAID
  joiningFee: integer("joining_fee").notNull().default(0), // in coins
  prizePool: integer("prize_pool").notNull().default(0), // in coins
  gameMode: text("game_mode").notNull(), // battle_royale | clash_squad | lone_wolf
  teamFormat: text("team_format").notNull(), // solo | duo | squad
  maps: text("maps").notNull().default("[]"), // JSON array of map names
  totalSlots: integer("total_slots").notNull().default(12),
  startTime: timestamp("start_time").notNull(),
  registrationDeadline: timestamp("registration_deadline").notNull(),
  endTime: timestamp("end_time"),
  descriptionHtml: text("description_html"),
  descriptionMarkdown: text("description_markdown"),
  rulesHtml: text("rules_html"),
  rulesMarkdown: text("rules_markdown"),
  // UPCOMING | ACTIVE | ROOM_REVEALED | LIVE | FINISHED | COMPLETED | CANCELLED
  status: text("status").notNull().default("UPCOMING"),
  roomId: text("room_id"),
  roomPassword: text("room_password"),
  createdByAdminId: text("created_by_admin_id").references(() => user.id),
  seoConfigId: text("seo_config_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("tournament_status_idx").on(t.status),
  index("tournament_start_time_idx").on(t.startTime),
  index("tournament_type_idx").on(t.type),
  index("tournament_game_mode_idx").on(t.gameMode),
]);

// ─────────────────────────────────────────────────────────────────────────────
// TOURNAMENT SLOTS
// ─────────────────────────────────────────────────────────────────────────────

export const tournamentSlot = pgTable("tournament_slots", {
  id: text("id").primaryKey(),
  tournamentId: text("tournament_id")
    .notNull()
    .references(() => tournament.id, { onDelete: "cascade" }),
  slotNumber: integer("slot_number").notNull(),
  status: text("status").notNull().default("AVAILABLE"), // AVAILABLE | BOOKED
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  teamName: text("team_name"),
  ignList: text("ign_list").notNull().default("[]"), // JSON array of IGNs
  bookedAt: timestamp("booked_at"),
}, (t) => [
  index("slot_tournament_idx").on(t.tournamentId),
  index("slot_user_idx").on(t.userId),
  index("slot_status_idx").on(t.status),
]);

// ─────────────────────────────────────────────────────────────────────────────
// TOURNAMENT PARTICIPANTS
// ─────────────────────────────────────────────────────────────────────────────

export const tournamentParticipant = pgTable("tournament_participants", {
  id: text("id").primaryKey(),
  tournamentId: text("tournament_id")
    .notNull()
    .references(() => tournament.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  slotId: text("slot_id")
    .notNull()
    .references(() => tournamentSlot.id),
  entryFeePaid: integer("entry_fee_paid").notNull().default(0),
  joinTransactionId: text("join_transaction_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("participant_tournament_idx").on(t.tournamentId),
  index("participant_user_idx").on(t.userId),
  uniqueIndex("participant_tournament_user_unique_idx").on(t.tournamentId, t.userId),
]);

// ─────────────────────────────────────────────────────────────────────────────
// TOURNAMENT WINNERS
// ─────────────────────────────────────────────────────────────────────────────

export const tournamentWinner = pgTable("tournament_winners", {
  id: text("id").primaryKey(),
  tournamentId: text("tournament_id")
    .notNull()
    .references(() => tournament.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  slotId: text("slot_id").references(() => tournamentSlot.id),
  placement: text("placement").notNull().default("1st"), // 1st | 2nd | 3rd | custom
  prizeAmount: integer("prize_amount").notNull().default(0),
  creditTransactionId: text("credit_transaction_id"),
  declaredAt: timestamp("declared_at").notNull().defaultNow(),
}, (t) => [
  index("winner_tournament_idx").on(t.tournamentId),
  index("winner_user_idx").on(t.userId),
  uniqueIndex("winner_tournament_user_unique_idx").on(t.tournamentId, t.userId),
]);

// ─────────────────────────────────────────────────────────────────────────────
// TOURNAMENT CANCELLATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const tournamentCancellation = pgTable("tournament_cancellations", {
  id: text("id").primaryKey(),
  tournamentId: text("tournament_id")
    .notNull()
    .references(() => tournament.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  cancelledByAdminId: text("cancelled_by_admin_id").references(() => user.id),
  cancelledAt: timestamp("cancelled_at").notNull().defaultNow(),
}, (t) => [
  index("cancellation_tournament_idx").on(t.tournamentId),
]);

// ─────────────────────────────────────────────────────────────────────────────
// CANCELLATION REFUNDS
// ─────────────────────────────────────────────────────────────────────────────

export const cancellationRefund = pgTable("cancellation_refunds", {
  id: text("id").primaryKey(),
  cancellationId: text("cancellation_id")
    .notNull()
    .references(() => tournamentCancellation.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  refundAmount: integer("refund_amount").notNull().default(0),
  refundTransactionId: text("refund_transaction_id"),
  status: text("status").notNull().default("PENDING"), // PENDING | COMPLETED | FAILED
}, (t) => [
  index("refund_cancellation_idx").on(t.cancellationId),
  index("refund_user_idx").on(t.userId),
]);

// ─────────────────────────────────────────────────────────────────────────────
// WALLETS
// One wallet per user; balance in coins (integer).
// ─────────────────────────────────────────────────────────────────────────────

export const wallet = pgTable("wallets", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0), // in coins
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("wallet_user_idx").on(t.userId),
]);

// ─────────────────────────────────────────────────────────────────────────────
// WALLET TRANSACTIONS
// Immutable audit log — never DELETE or UPDATE these records.
// ─────────────────────────────────────────────────────────────────────────────

export const walletTransaction = pgTable("wallet_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  // JOIN_FEE | REFUND | PRIZE_CREDIT | ADMIN_CREDIT | ADMIN_DEBIT | WITHDRAWAL_REQUEST
  type: text("type").notNull(),
  amount: integer("amount").notNull(), // always positive; type determines credit/debit
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  referenceId: text("reference_id"), // tournament ID or admin action ID
  description: text("description"),
  status: text("status").notNull().default("COMPLETED"), // PENDING | COMPLETED | FAILED
  idempotencyKey: text("idempotency_key").unique(),
  performedByAdminId: text("performed_by_admin_id").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("txn_user_idx").on(t.userId),
  index("txn_type_idx").on(t.type),
  index("txn_reference_idx").on(t.referenceId),
  index("txn_created_at_idx").on(t.createdAt),
]);

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT TEMPLATES (Description & Rules)
// ─────────────────────────────────────────────────────────────────────────────

export const contentTemplate = pgTable("content_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // DESCRIPTION | RULES
  contentHtml: text("content_html").notNull().default(""),
  contentMarkdown: text("content_markdown").notNull().default(""),
  createdByAdminId: text("created_by_admin_id").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("content_template_type_idx").on(t.type),
]);


// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT GATEWAY CONFIG
// Single row (id = "default"). Gmail IMAP credentials + UPI details.
// ─────────────────────────────────────────────────────────────────────────────

export const paymentConfig = pgTable("payment_config", {
  id: text("id").primaryKey().default("default"),
  gmailEmail: text("gmail_email").notNull().default(""),
  gmailAppPassword: text("gmail_app_password").notNull().default(""),
  trustedSenders: text("trusted_senders").notNull().default("[]"),
  checkDays: integer("check_days").notNull().default(1),
  upiId: text("upi_id").notNull().default(""),
  upiName: text("upi_name").notNull().default("1onlysarkar"),
  pageContent: text("page_content").notNull().default(""),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastSyncAt: timestamp("last_sync_at"),
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT VERIFICATION LOG
// Immutable audit log of all UTR verification attempts.
// ─────────────────────────────────────────────────────────────────────────────

export const paymentVerification = pgTable("payment_verification", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  claimedAmount: integer("claimed_amount").notNull(),
  verifiedAmount: integer("verified_amount"),
  utrNumber: text("utr_number").notNull(), // Stores AES-256-GCM encrypted UTR string
  utrHash: text("utr_hash"), // HMAC hash of UTR for O(1) duplicate checks
  status: text("status").notNull().default("pending"),
  emailMessageId: text("email_message_id"),
  emailSender: text("email_sender"),
  ipAddress: text("ip_address"),
  failReason: text("fail_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  verifiedAt: timestamp("verified_at"),
}, (t) => [
  index("pv_user_created_idx").on(t.userId, t.createdAt),
  index("pv_utr_idx").on(t.utrNumber),
  index("pv_utr_hash_idx").on(t.utrHash),
  uniqueIndex("pv_utr_verified_unique_idx").on(t.utrHash).where(sql`status = 'verified'`),
  index("pv_status_idx").on(t.status),
]);

// ─────────────────────────────────────────────────────────────────────────────
// PRE-PARSED PAYMENT EMAIL INBOX
// Stores encrypted payment emails for instant 50ms user verification.
// utrHash is an HMAC-SHA256 hash for O(1) indexed database query without raw UTR exposure.
// encryptedData contains AES-256-GCM encrypted UTR, amount, and sender details.
// ─────────────────────────────────────────────────────────────────────────────

export const paymentEmailInbox = pgTable("payment_email_inbox", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  utrHash: text("utr_hash").notNull().unique(),
  amount: integer("amount").notNull(),
  encryptedData: text("encrypted_data").notNull(),
  emailMessageId: text("email_message_id"),
  isClaimed: boolean("is_claimed").notNull().default(false),
  claimedByUserId: text("claimed_by_user_id").references(() => user.id, { onDelete: "set null" }),
  claimedAt: timestamp("claimed_at"),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
}, (t) => [
  index("pei_utr_hash_idx").on(t.utrHash),
  index("pei_claimed_idx").on(t.isClaimed),
  index("pei_received_idx").on(t.receivedAt),
]);



// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const notification = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  // ROOM_REVEALED | TOURNAMENT_CANCELLED | PRIZE_CREDITED | REFUND_CREDITED | GENERAL
  type: text("type").notNull(),
  referenceId: text("reference_id"), // tournament ID
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("notification_user_idx").on(t.userId),
  index("notification_read_idx").on(t.isRead),
  index("notification_created_idx").on(t.createdAt),
]);

// ─────────────────────────────────────────────────────────────────────────────
// CHATBOT CONFIG
// Single row (id = "default"). Controls AI provider settings, rate limits, widget.
// Provider is locked to "gemini" | "custom" (OpenAI-compatible endpoint).
// ─────────────────────────────────────────────────────────────────────────────

export const chatbot_config = pgTable("chatbot_config", {
  id: text("id").primaryKey().default("default"),

  // ── General ────────────────────────────────────────────────────────────────
  enabled: boolean("enabled").notNull().default(false),
  chatbotName: text("chatbot_name").notNull().default("Nemu"),
  welcomeMessage: text("welcome_message").notNull().default(
    "Hi there! I'm Nemu, your support assistant for 1onlysarkar. I can help you with tournaments, wallet, account settings, and more. How can I help you today?"
  ),
  // Visible description in admin panel only
  description: text("description").notNull().default(
    "1onlysarkar's official AI support assistant — tournament registration, wallet & payment help, account setup, and platform navigation."
  ),

  // ── AI Provider ─────────────────────────────────────────────────────────────
  // "gemini" | "custom" (OpenAI-compatible endpoint)
  aiProvider: text("ai_provider").notNull().default("gemini"),
  // API key — stored in DB, never in env
  apiKey: text("api_key").notNull().default(""),
  // For custom OpenAI-compatible providers only
  customEndpoint: text("custom_endpoint"),
  // Model name e.g. "gemini-2.0-flash-exp", "gemini-1.5-pro"
  model: text("model").notNull().default("gemini-2.0-flash-exp"),
  // 0.0 to 2.0 — stored as text, parsed as float in lib
  temperature: text("temperature").notNull().default("0.7"),
  // Max tokens in response
  maxResponseTokens: integer("max_response_tokens").notNull().default(500),
  // How many past messages to include as context (1–20)
  contextWindow: integer("context_window").notNull().default(10),

  // ── System Prompt ───────────────────────────────────────────────────────────
  // Full customizable system prompt. Supports template variables:
  // {{chatbot_name}}, {{platform_name}}, {{platform_url}},
  // {{current_date}}, {{user_name}}, {{knowledge_base}}
  systemPrompt: text("system_prompt").notNull().default(""),

  // ── Streaming ───────────────────────────────────────────────────────────────
  // Stream AI responses token-by-token via SSE
  streamingEnabled: boolean("streaming_enabled").notNull().default(true),

  // ── Rate Limiting ────────────────────────────────────────────────────────────
  rateLimitEnabled: boolean("rate_limit_enabled").notNull().default(true),
  // Max messages per user/IP per hour
  rateLimitPerHour: integer("rate_limit_per_hour").notNull().default(30),
  // Allow users who are NOT logged in to chat
  allowAnonymous: boolean("allow_anonymous").notNull().default(false),

  inputPlaceholder: text("input_placeholder").notNull().default(
    "Type your question here... (max 300 words)"
  ),

  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// CHATBOT KNOWLEDGE BASE
// FAQ / platform-specific Q&A entries injected into the AI system prompt.
// ─────────────────────────────────────────────────────────────────────────────

export const chatbot_knowledge = pgTable("chatbot_knowledge", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // Short title shown in admin panel list
  title: text("title").notNull(),
  // The actual Q&A or information content injected into context
  content: text("content").notNull(),
  // Optional grouping for admin UI
  category: text("category").notNull().default("General"),
  // Controls whether this entry is injected into AI context
  isEnabled: boolean("is_enabled").notNull().default(true),
  // Lower number = injected first (most important at top)
  priority: integer("priority").notNull().default(100),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// CHATBOT SESSIONS
// One session per chat conversation. Authenticated or anonymous.
// ─────────────────────────────────────────────────────────────────────────────

export const chatbot_session = pgTable("chatbot_session", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // null for anonymous users
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  // UUID token sent to client to identify session
  sessionToken: text("session_token").notNull().unique().$defaultFn(() => crypto.randomUUID()),
  // User's display name at time of chat (snapshot)
  userName: text("user_name"),
  // For rate limiting anonymous users
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  messageCount: integer("message_count").notNull().default(0),
  // "active" | "ended" | "rate_limited"
  status: text("status").notNull().default("active"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
  // Last known page context details (JSON string)
  lastPageContext: text("last_page_context"),
}, (t) => [
  index("chatbot_session_user_idx").on(t.userId),
  index("chatbot_session_token_idx").on(t.sessionToken),
]);

// ─────────────────────────────────────────────────────────────────────────────
// CHATBOT MESSAGES
// Immutable log of all messages in a session.
// ─────────────────────────────────────────────────────────────────────────────

export const chatbot_message = pgTable("chatbot_message", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id")
    .notNull()
    .references(() => chatbot_session.id, { onDelete: "cascade" }),
  // "user" | "assistant" | "system"
  role: text("role").notNull(),
  content: text("content").notNull(),
  // Token counts for cost tracking (null if provider doesn't return them)
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  // "success" | "error" | "rate_limited" | "moderated"
  status: text("status").notNull().default("success"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("chatbot_message_session_idx").on(t.sessionId, t.createdAt),
]);

// ─────────────────────────────────────────────────────────────────────────────
// WITHDRAW CONFIG
// Single-row config for withdrawal settings.
// ─────────────────────────────────────────────────────────────────────────────

export const withdrawConfig = pgTable("withdraw_config", {
  id: text("id").primaryKey().default("default"),
  minWithdrawAmount: integer("min_withdraw_amount").notNull().default(50),
  dailyWithdrawLimit: integer("daily_withdraw_limit").notNull().default(3),
  description: text("description").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// WITHDRAW REQUESTS
// User withdrawal requests — money deducted immediately on request.
// ─────────────────────────────────────────────────────────────────────────────

export const withdrawRequest = pgTable("withdraw_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  upiId: text("upi_id").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING | COMPLETED | CANCELLED
  adminNote: text("admin_note"),
  refundedOnCancel: boolean("refunded_on_cancel").notNull().default(false),
  transactionId: text("transaction_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  processedByAdminId: text("processed_by_admin_id").references(() => user.id),
}, (t) => [
  index("withdraw_user_idx").on(t.userId),
  index("withdraw_status_idx").on(t.status),
  index("withdraw_created_at_idx").on(t.createdAt),
]);

// ─────────────────────────────────────────────────────────────────────────────
// FAQ TABLE
// ─────────────────────────────────────────────────────────────────────────────

export const faq = pgTable("faqs", {
  id: text("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("faq_order_idx").on(t.order),
]);

// ─────────────────────────────────────────────────────────────────────────────
// CHEATER REPORTS
// User-submitted reports of cheaters in tournaments.
// status: PENDING | REVIEWED | RESOLVED | DISMISSED
// ─────────────────────────────────────────────────────────────────────────────

export const cheaterReport = pgTable("cheater_report", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // The in-game UID of the reported player
  reportedUid: text("reported_uid").notNull(),
  // Date/time of the incident
  reportedAt: timestamp("reported_at").notNull(),
  // Optional: linked tournament
  tournamentId: text("tournament_id").references(() => tournament.id, { onDelete: "set null" }),
  // Clear description of what happened
  description: text("description").notNull(),
  // PENDING | REVIEWED | RESOLVED | DISMISSED
  status: text("status").notNull().default("PENDING"),
  // Admin's response note
  adminNote: text("admin_note"),
  reviewedByAdminId: text("reviewed_by_admin_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("cheater_report_user_idx").on(t.userId),
  index("cheater_report_status_idx").on(t.status),
  index("cheater_report_tournament_idx").on(t.tournamentId),
  index("cheater_report_created_idx").on(t.createdAt),
]);

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT HELP REQUESTS
// User-submitted requests for payment issues (UTR / transaction disputes).
// status: PENDING | REVIEWED | RESOLVED | DISMISSED
// ─────────────────────────────────────────────────────────────────────────────

export const paymentHelpRequest = pgTable("payment_help_request", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // Amount in rupees (₹)
  amount: integer("amount").notNull(),
  // UTR number / transaction ID
  utrNumber: text("utr_number").notNull(),
  // Clear description of the issue
  description: text("description").notNull(),
  // PENDING | REVIEWED | RESOLVED | DISMISSED
  status: text("status").notNull().default("PENDING"),
  // Admin's response note
  adminNote: text("admin_note"),
  reviewedByAdminId: text("reviewed_by_admin_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("payment_help_user_idx").on(t.userId),
  index("payment_help_status_idx").on(t.status),
  index("payment_help_created_idx").on(t.createdAt),
]);
// -----------------------------------------------------------------------------
// INDEXING API CONFIGURATION
// -----------------------------------------------------------------------------

export const indexingApiConfig = pgTable("indexing_api_config", {
  id: text("id").primaryKey().default("default"),
  googleServiceAccountJson: text("google_service_account_json"),
  indexNowKey: text("indexnow_key"),
  autoSubmitGoogle: boolean("auto_submit_google").notNull().default(false),
  autoSubmitIndexNow: boolean("auto_submit_indexnow").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// -----------------------------------------------------------------------------
// INDEXING LOGS
// -----------------------------------------------------------------------------

export const indexingLog = pgTable("indexing_log", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  api: text("api").notNull(),
  status: text("status").notNull(),
  response: text("response"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("indexing_log_url_idx").on(t.url),
  index("indexing_log_api_idx").on(t.api),
  index("indexing_log_status_idx").on(t.status),
  index("indexing_log_created_idx").on(t.createdAt),
]);

// ─────────────────────────────────────────────────────────────────────────────
// INVITATION / REFERRAL SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * invitation_config — Single-row global config (id = "default").
 * Admin controls whether the feature is enabled and the bonus amounts.
 */
export const invitationConfig = pgTable("invitation_config", {
  id: text("id").primaryKey().default("default"),
  enabled: boolean("enabled").notNull().default(false),
  // Coins credited to the person who invited (the referrer)
  inviterBonus: integer("inviter_bonus").notNull().default(50),
  // Coins credited to the new user who signed up via invite link
  inviteeBonus: integer("invitee_bonus").notNull().default(25),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * invitation — One row per user who has activated an invite link.
 * code is a unique short token (nanoid) used in share URLs.
 */
export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  totalInvites: integer("total_invites").notNull().default(0),
  totalEarned: integer("total_earned").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("invitation_user_idx").on(t.userId),
  index("invitation_code_idx").on(t.code),
  index("invitation_active_idx").on(t.isActive),
]);

/**
 * invitation_use — Immutable audit log of each signup via invite link.
 * inviteeUserId is unique — prevents double-crediting one user.
 */
export const invitationUse = pgTable("invitation_use", {
  id: text("id").primaryKey(),
  invitationId: text("invitation_id")
    .notNull()
    .references(() => invitation.id, { onDelete: "cascade" }),
  // The user who owns the invite link
  inviterUserId: text("inviter_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // The newly registered user — unique prevents double-crediting
  inviteeUserId: text("invitee_user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  // How the invitee signed up: 'email' | 'google'
  signupMethod: text("signup_method").notNull().default("email"),
  inviterBonusAmount: integer("inviter_bonus_amount").notNull().default(0),
  inviteeBonusAmount: integer("invitee_bonus_amount").notNull().default(0),
  inviterTransactionId: text("inviter_transaction_id"),
  inviteeTransactionId: text("invitee_transaction_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("inv_use_invitation_idx").on(t.invitationId),
  index("inv_use_inviter_idx").on(t.inviterUserId),
  index("inv_use_invitee_idx").on(t.inviteeUserId),
  index("inv_use_created_idx").on(t.createdAt),
]);

export const userRelations = relations(user, ({ one, many }) => ({
  wallet: one(wallet, {
    fields: [user.id],
    references: [wallet.userId],
  }),
  notifications: many(notification),
  adminUserRoles: many(adminUserRole),
  invitation: one(invitation, {
    fields: [user.id],
    references: [invitation.userId],
  }),
}));

export const tournamentRelations = relations(tournament, ({ many }) => ({
  slots: many(tournamentSlot),
  participants: many(tournamentParticipant),
  winners: many(tournamentWinner),
}));

export const tournamentSlotRelations = relations(tournamentSlot, ({ one }) => ({
  tournament: one(tournament, {
    fields: [tournamentSlot.tournamentId],
    references: [tournament.id],
  }),
}));

export const tournamentParticipantRelations = relations(tournamentParticipant, ({ one }) => ({
  tournament: one(tournament, {
    fields: [tournamentParticipant.tournamentId],
    references: [tournament.id],
  }),
  user: one(user, {
    fields: [tournamentParticipant.userId],
    references: [user.id],
  }),
}));

export const tournamentWinnerRelations = relations(tournamentWinner, ({ one }) => ({
  tournament: one(tournament, {
    fields: [tournamentWinner.tournamentId],
    references: [tournament.id],
  }),
  user: one(user, {
    fields: [tournamentWinner.userId],
    references: [user.id],
  }),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
}));

export const adminUserRoleRelations = relations(adminUserRole, ({ one }) => ({
  user: one(user, {
    fields: [adminUserRole.userId],
    references: [user.id],
  }),
  role: one(adminRole, {
    fields: [adminUserRole.roleId],
    references: [adminRole.id],
  }),
}));

export const invitationRelations = relations(invitation, ({ one, many }) => ({
  user: one(user, {
    fields: [invitation.userId],
    references: [user.id],
  }),
  uses: many(invitationUse),
}));

export const invitationUseRelations = relations(invitationUse, ({ one }) => ({
  invitation: one(invitation, {
    fields: [invitationUse.invitationId],
    references: [invitation.id],
  }),
  inviter: one(user, {
    fields: [invitationUse.inviterUserId],
    references: [user.id],
  }),
  invitee: one(user, {
    fields: [invitationUse.inviteeUserId],
    references: [user.id],
  }),
}));
