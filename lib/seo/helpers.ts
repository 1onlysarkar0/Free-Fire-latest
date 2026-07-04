/**
 * SEO Admin Panel — Shared Types, Constants, Icon System, Helpers
 */

import {
  Globe, Home, LogIn, UserPlus, LayoutDashboard, KeyRound,
  Trophy, Settings, Wallet, Mail, Lock, HelpCircle, FileText,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SeoRow {
  id: string;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogType: string | null;
  twitterCard: string | null;
  twitterSite: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  structuredDataJson: string | null;
  schemaType: string | null;
  ogImageDynamic: boolean | null;
  ogImageTemplate: string | null;
  iconName: string | null;
  seoScore: number | null;
  lastAudited: string | Date | null;
}

export type SeoForm = Omit<SeoRow, "id">;

export interface KnownPage {
  label: string;
  icon: React.ElementType;
  path: string;
  description: string;
}

// ─── Empty Form ──────────────────────────────────────────────────────────────

export const emptyForm: SeoForm = {
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  ogType: "website",
  twitterCard: "summary_large_image",
  twitterSite: "",
  twitterTitle: "",
  twitterDescription: "",
  twitterImage: "",
  canonicalUrl: "",
  robots: "index, follow",
  structuredDataJson: "",
  schemaType: "WebPage",
  ogImageDynamic: false,
  ogImageTemplate: "",
  iconName: "Globe",
  seoScore: null,
  lastAudited: null,
};

// ─── Known Pages ─────────────────────────────────────────────────────────────

export const KNOWN_PAGES: Record<string, KnownPage> = {
  global: { label: "Global Fallback", icon: Globe, path: "—", description: "Default SEO merged for pages without a custom override" },
  home: { label: "Homepage", icon: Home, path: "/", description: "Main landing page" },
  "sign-in": { label: "Sign In", icon: LogIn, path: "/sign-in", description: "User login page" },
  "sign-up": { label: "Sign Up", icon: UserPlus, path: "/sign-up", description: "New account registration" },
  "forgot-password": { label: "Forgot Password", icon: KeyRound, path: "/forgot-password", description: "Password reset request page" },
  "reset-password": { label: "Reset Password", icon: KeyRound, path: "/reset-password", description: "New password entry page" },
  "two-factor": { label: "Two-Factor Auth", icon: Lock, path: "/two-factor", description: "Two-factor authentication verification" },
  "complete-profile": { label: "Complete Profile", icon: UserPlus, path: "/complete-profile", description: "Set Free Fire UID and game name" },
  dashboard: { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", description: "Authenticated user dashboard" },
  "my-tournaments": { label: "My Tournaments", icon: Trophy, path: "/dashboard/my-tournaments", description: "User's joined tournaments" },
  wallet: { label: "Wallet", icon: Wallet, path: "/dashboard/wallet", description: "User wallet and payments" },
  settings: { label: "Settings", icon: Settings, path: "/dashboard/settings", description: "User profile settings" },
  tournaments: { label: "Tournaments (List)", icon: Trophy, path: "/tournaments", description: "Browse all active and upcoming tournaments" },
  "page-faq": { label: "FAQ Page", icon: HelpCircle, path: "/faq", description: "Frequently asked questions page" },
  "llms-txt": { label: "llms.txt (AI Overview)", icon: FileText, path: "/llms.txt", description: "AI/LLM platform overview text file" },
};

// ─── Icon System ─────────────────────────────────────────────────────────────

// Curated list of ~150 useful icons organized by category
export const ICON_LIST: { category: string; icons: string[] }[] = [
  {
    category: "Navigation",
    icons: ["Home", "Globe", "LayoutDashboard", "Menu", "Sidebar", "Navigation", "Compass", "Map", "MapPin", "Link", "ExternalLink"],
  },
  {
    category: "Actions",
    icons: ["Plus", "Minus", "X", "Check", "Search", "Filter", "SortAsc", "Edit", "Edit2", "Save", "Copy", "Trash2", "RefreshCw", "Download", "Upload", "Send", "Share"],
  },
  {
    category: "Users & Auth",
    icons: ["User", "Users", "UserPlus", "UserX", "UserCheck", "LogIn", "LogOut", "Lock", "Unlock", "Shield", "KeyRound", "Mail", "AtSign", "Phone"],
  },
  {
    category: "E-Commerce",
    icons: ["ShoppingCart", "ShoppingBag", "Store", "Package", "Box", "Truck", "CreditCard", "Wallet", "DollarSign", "Coins", "Tag", "Gift", "Percent"],
  },
  {
    category: "Tournaments & Gaming",
    icons: ["Trophy", "Medal", "Award", "Crown", "Swords", "Gamepad2", "Target", "Flag", "Fire", "Flame", "Zap", "Star", "Sparkles", "Rocket"],
  },
  {
    category: "Content",
    icons: ["FileText", "BookOpen", "Image", "Camera", "Video", "Music", "Folder", "File", "Code", "Database", "Server"],
  },
  {
    category: "Charts & Data",
    icons: ["BarChart", "BarChart3", "PieChart", "LineChart", "AreaChart", "TrendingUp", "Activity", "Clock", "Calendar", "Timer"],
  },
  {
    category: "UI Elements",
    icons: ["Info", "AlertCircle", "HelpCircle", "Eye", "EyeOff", "Bookmark", "Hash", "Grid", "List", "Layout"],
  },
  {
    category: "Device & Tech",
    icons: ["Monitor", "Smartphone", "Tablet", "Cpu", "Wifi", "Printer", "Camera", "Headphones", "Mic"],
  },
  {
    category: "Misc",
    icons: ["Heart", "ThumbsUp", "Smile", "Sun", "Moon", "Cloud", "Wind", "Droplets", "Thermometer", "Lightbulb"],
  },
];

// Lazy icon cache
const iconCache: Record<string, React.ElementType | null> = {};

/**
 * Get a lucide-react icon component by name. Supports all lucide icons.
 * Falls back to a generic icon if not found.
 */
export function getIconByName(name: string): React.ElementType {
  if (!name) return Globe;

  // Check cache
  if (iconCache[name] !== undefined) {
    return iconCache[name] || Globe;
  }

  // Dynamically access lucide-react exports
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const lucide = require("lucide-react");
    const icon = lucide[name];
    if (icon) {
      iconCache[name] = icon;
      return icon;
    }
  } catch {
    // fallback
  }

  iconCache[name] = null;
  return Globe;
}

// ─── Score Helpers ───────────────────────────────────────────────────────────

export function getScoreColor(score: number | null): string {
  if (score === null) return "bg-muted text-muted-foreground border-border";
  if (score >= 90) return "bg-green-50 text-green-700 border-green-200";
  if (score >= 70) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

export function getScoreBadge(score: number | null): string {
  if (score === null) return "—";
  if (score >= 90) return `A (${score})`;
  if (score >= 80) return `B (${score})`;
  if (score >= 70) return `C (${score})`;
  if (score >= 50) return `D (${score})`;
  return `F (${score})`;
}

export function getScoreGrade(score: number | null): string {
  if (score === null) return "—";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 50) return "D";
  return "F";
}

// ─── Re-export audit ─────────────────────────────────────────────────────────

export { auditSeo } from "./audit";
export type { SeoAuditResult, SeoCheck } from "./audit";
