"use client";

import Link from "next/link";
import type { ElementType } from "react";
import {
  LayoutDashboard, Settings, Menu, FileText, Mail, MailOpen,
  Search,   Users, Shield, FileCode, Trophy, FileStack,
  CreditCard, MessageSquare, ArrowUpFromLine,
} from "lucide-react";
import AppSidebarShell, { type AppSidebarSection } from "@/components/app-sidebar";
import { canAccessSection } from "@/lib/admin-permissions";

interface SidebarProps {
  siteName: string;
  logoSrc: string;
  logoUrl: string;
  logoAlt: string;
  isAdmin: boolean;
  permissions: string[];
  panelSlug: string;
}

interface AdminNavItem {
  label: string;
  href: string;
  icon: ElementType;
  sectionKey?: string;
  exact?: boolean;
}

interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

const getSections = (panelSlug: string): AdminNavSection[] => [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", href: `/${panelSlug}`, icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "SITE SETTINGS",
    items: [
      { label: "Branding & Config", href: `/${panelSlug}/site-config`, icon: Settings, sectionKey: "site_config" },
      { label: "Navigation Items", href: `/${panelSlug}/navigation`, icon: Menu, sectionKey: "navigation" },
      { label: "SEO Configuration", href: `/${panelSlug}/seo`, icon: Search, sectionKey: "seo" },
      { label: "Custom Pages", href: `/${panelSlug}/pages`, icon: FileCode, sectionKey: "pages" },
    ],
  },
  {
    title: "AUTH & EMAIL",
    items: [
      { label: "Auth Page Content", href: `/${panelSlug}/auth-content`, icon: FileText, sectionKey: "auth_content" },
      { label: "SMTP Config", href: `/${panelSlug}/smtp`, icon: Mail, sectionKey: "smtp" },
      { label: "Email Templates", href: `/${panelSlug}/email-templates`, icon: MailOpen, sectionKey: "email_templates" },
    ],
  },
  {
    title: "TOURNAMENTS",
    items: [
      { label: "All Tournaments", href: `/${panelSlug}/tournaments`, icon: Trophy, sectionKey: "tournaments" },
      { label: "Content Templates", href: `/${panelSlug}/content-templates`, icon: FileStack, sectionKey: "content_templates" },
    ],
  },
  {
    title: "MONETIZATION",
    items: [
      { label: "Payment Gateway", href: `/${panelSlug}/payment`, icon: CreditCard, sectionKey: "payment" },
      { label: "Withdrawals", href: `/${panelSlug}/withdraw`, icon: ArrowUpFromLine, sectionKey: "withdraw" },
    ],
  },
  {
    title: "ENGAGEMENT",
    items: [
      { label: "AI Chatbot", href: `/${panelSlug}/chatbot`, icon: MessageSquare, sectionKey: "chatbot" },
    ],
  },
  {
    title: "USERS & ACCESS",
    items: [
      { label: "All Users", href: `/${panelSlug}/users`, icon: Users, sectionKey: "users" },
      { label: "Roles & Permissions", href: `/${panelSlug}/roles`, icon: Shield, sectionKey: "roles" },
    ],
  },
];

export default function AdminSidebar({
  siteName,
  logoSrc,
  logoUrl,
  logoAlt,
  isAdmin,
  permissions,
  panelSlug,
}: SidebarProps) {
  const sections: AppSidebarSection[] = getSections(panelSlug)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.sectionKey || canAccessSection(permissions, item.sectionKey, isAdmin)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <AppSidebarShell
      siteName={siteName}
      logoSrc={logoSrc}
      logoUrl={logoUrl}
      logoAlt={logoAlt}
      sections={sections}
      badge="Admin"
      footer={<Link href="/dashboard" prefetch={true} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Back to Dashboard</Link>}
    />
  );
}
