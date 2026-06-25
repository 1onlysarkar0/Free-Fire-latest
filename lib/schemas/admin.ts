import { z } from "zod";

export const tournamentSchema = z.object({
  name: z.string().trim().min(1, "Tournament name is required"),
  type: z.enum(["FREE", "PAID"]).default("FREE"),
  joiningFee: z.number().int().nonnegative().default(0),
  prizePool: z.number().int().nonnegative().default(0),
  gameMode: z.string().min(1, "Game mode is required"),
  teamFormat: z.string().min(1, "Team format is required"),
  maps: z.array(z.string()).default([]),
  totalSlots: z.number().int().min(2).max(500).default(12),
  startTime: z.string().min(1, "Start time is required"),
  registrationDeadline: z.string().min(1, "Registration deadline is required"),
  endTime: z.string().optional().nullable(),
  descriptionHtml: z.string().optional().nullable(),
  descriptionMarkdown: z.string().optional().nullable(),
  rulesHtml: z.string().optional().nullable(),
  rulesMarkdown: z.string().optional().nullable(),
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  email: z.string().trim().email("Invalid email address").optional(),
  gameName: z.string().optional().nullable(),
  uid: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  emailVerified: z.boolean().optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters").optional().nullable(),
  isBanned: z.boolean().optional(),
  banReason: z.string().optional().nullable(),
  roleId: z.string().optional().nullable(),
  topPlayer: z.boolean().optional(),
});

export const walletAdjustmentSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  amount: z.number().int().positive("Amount must be a positive number"),
  action: z.enum(["credit", "debit"]),
  description: z.string().trim().optional(),
});

export const withdrawRequestUserSchema = z.object({
  amount: z.number().int().positive("Amount must be positive"),
  upiId: z.string().trim().min(1, "UPI ID is required"),
});

export const withdrawProcessSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
  action: z.enum(["complete", "cancel"]),
  adminNote: z.string().trim().optional(),
  refundOnCancel: z.boolean().default(false),
});

export const withdrawConfigUpdateSchema = z.object({
  minWithdrawAmount: z.number().int().positive("Minimum amount must be positive").optional(),
  dailyWithdrawLimit: z.number().int().positive("Daily limit must be positive").optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
});

export const siteConfigSchema = z.object({
  logoUrl: z.string().trim().optional().nullable(),
  logoSrc: z.string().trim().optional().nullable(),
  logoAlt: z.string().trim().optional().nullable(),
  logoTitle: z.string().trim().optional().nullable(),
  authLoginText: z.string().trim().optional().nullable(),
  authLoginUrl: z.string().trim().optional().nullable(),
  authSignupText: z.string().trim().optional().nullable(),
  authSignupUrl: z.string().trim().optional().nullable(),
  authPanelImageUrl: z.string().trim().optional().nullable(),
  authPanelColor: z.string().trim().optional().nullable(),
  copyrightText: z.string().trim().optional().nullable(),
  heroHeadline: z.string().trim().optional().nullable(),
  heroSubheadline: z.string().trim().optional().nullable(),
  heroCtaPrimaryText: z.string().trim().optional().nullable(),
  heroCtaPrimaryUrl: z.string().trim().optional().nullable(),
  heroCtaSecondaryText: z.string().trim().optional().nullable(),
  heroCtaSecondaryUrl: z.string().trim().optional().nullable(),
  heroBadgeText: z.string().trim().optional().nullable(),
  heroBadgeUrl: z.string().trim().optional().nullable(),
  contactEmail: z.union([z.string().email(), z.literal(""), z.null(), z.undefined()]),
  companyAddress: z.string().trim().optional().nullable(),
  jurisdictionName: z.string().trim().optional().nullable(),
  adminSlug: z.string().trim().min(3, "Admin slug must be at least 3 characters").optional().nullable(),
});

export const navigationItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  url: z.string().trim().min(1, "URL is required"),
  description: z.string().trim().optional().nullable(),
  icon: z.string().trim().optional().nullable(),
  parentId: z.string().optional().nullable(),
  order: z.number().int().default(0),
  isMobileExtra: z.boolean().default(false),
  isFooter: z.boolean().default(false),
  isSocial: z.boolean().default(false),
});
