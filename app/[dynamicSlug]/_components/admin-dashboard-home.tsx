"use client";

import { useEffect, useState } from "react";
import { Users, Shield, Menu, MailOpen, Search, TrendingUp, UserCheck, Settings, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Muted } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";

import { canAccessSection } from "@/lib/admin-permissions";

interface Stats {
  totalUsers: number;
  topPlayers: number;
  adminUsers: number;
  navItems: number;
  emailTemplates: number;
  seoConfigs: number;
  roles: number;
  usersWithRoles: number;
}

function StatCard({
  label, value, sub, icon: Icon, color, href,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  href?: string;
}) {
  const inner = (
    <Card className="card-widget">
      <CardContent className="p-5 flex items-start gap-4">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-1">{label}</div>
          {sub && <Muted className="text-xs mt-0.5">{sub}</Muted>}
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href} prefetch={false} className="block">{inner}</Link> : inner;
}

interface Props {
  panelSlug: string;
  initialStats?: Stats | null;
  roleName?: string;
  isAdmin: boolean;
  permissions: string[];
}

export default function AdminDashboardHome({
  panelSlug,
  initialStats,
  roleName,
  isAdmin = false,
  permissions = [],
}: Props) {
  const [stats, setStats] = useState<Stats | null>(initialStats ?? null);
  const [loading, setLoading] = useState(!initialStats);

  useEffect(() => {
    if (initialStats) return;
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [initialStats]);

  const QUICK_LINKS = [
    { label: "Site Configuration", desc: "Branding, hero, auth panel", href: `/${panelSlug}/site-config`, icon: Settings, color: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400", sectionKey: "site_config" },
    { label: "Navigation Items", desc: "Header, footer, social links", href: `/${panelSlug}/navigation`, icon: Menu, color: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400", sectionKey: "navigation" },
    { label: "All Users", desc: "View & manage platform users", href: `/${panelSlug}/users`, icon: Users, color: "bg-success/10 text-success", sectionKey: "users" },
    { label: "Roles & Permissions", desc: "RBAC permission matrix", href: `/${panelSlug}/roles`, icon: Shield, color: "bg-primary/10 text-primary", sectionKey: "roles" },
    { label: "Email Templates", desc: "Manage transactional emails", href: `/${panelSlug}/email-templates`, icon: MailOpen, color: "bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400", sectionKey: "email_templates" },
    { label: "SEO Config", desc: "Meta tags, Open Graph, robots", href: `/${panelSlug}/seo`, icon: Search, color: "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400", sectionKey: "seo" },
  ].filter((link) => canAccessSection(permissions, link.sectionKey, isAdmin));

  if (loading) {
    return (
      <div className="w-full min-w-0">
        <div className="space-y-6">
          <div className="space-y-1">
            <div className="h-8 w-48 rounded-xl bg-accent/60 animate-pulse" />
            <div className="h-4 w-72 rounded-xl bg-accent/40 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="card-widget animate-pulse p-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-accent/60" />
                  <div className="space-y-2 flex-1">
                    <div className="h-6 w-16 rounded bg-accent/60" />
                    <div className="h-3 w-24 rounded bg-accent/40" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const dashboardTitle = roleName ? `${roleName} Dashboard` : "Admin Dashboard";

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="header-admin">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{dashboardTitle}</h1>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {canAccessSection(permissions, "users", isAdmin) && (
          <StatCard label="Total Users" value={loading ? "—" : (stats?.totalUsers ?? 0)} sub="Registered accounts" icon={Users} color="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" href={`/${panelSlug}/users`} />
        )}
        {canAccessSection(permissions, "users", isAdmin) && (
          <StatCard label="Top Players" value={loading ? "—" : (stats?.topPlayers ?? 0)} sub="Featured in marquee" icon={TrendingUp} color="bg-success/10 text-success" href={`/${panelSlug}/users`} />
        )}
        {canAccessSection(permissions, "roles", isAdmin) && (
          <StatCard label="Admin Roles" value={loading ? "—" : (stats?.roles ?? 0)} sub="RBAC roles defined" icon={Shield} color="bg-primary/10 text-primary" href={`/${panelSlug}/roles`} />
        )}
        {canAccessSection(permissions, "users", isAdmin) && (
          <StatCard label="Staff Users" value={loading ? "—" : (stats?.usersWithRoles ?? 0)} sub="Users with roles" icon={UserCheck} color="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" href={`/${panelSlug}/users`} />
        )}
        {canAccessSection(permissions, "navigation", isAdmin) && (
          <StatCard label="Nav Items" value={loading ? "—" : (stats?.navItems ?? 0)} sub="Header, footer, social" icon={Menu} color="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" href={`/${panelSlug}/navigation`} />
        )}
        {canAccessSection(permissions, "email_templates", isAdmin) && (
          <StatCard label="Email Templates" value={loading ? "—" : (stats?.emailTemplates ?? 0)} sub="Transactional emails" icon={MailOpen} color="bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" href={`/${panelSlug}/email-templates`} />
        )}
        {canAccessSection(permissions, "seo", isAdmin) && (
          <StatCard label="SEO Configs" value={loading ? "—" : (stats?.seoConfigs ?? 0)} sub="Page-level SEO rows" icon={Search} color="bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400" href={`/${panelSlug}/seo`} />
        )}
        {canAccessSection(permissions, "users", isAdmin) && (
          <StatCard label="Admin Users" value={loading ? "—" : (stats?.adminUsers ?? 0)} sub="Superadmin accounts" icon={Shield} color="bg-destructive/10 text-destructive" href={`/${panelSlug}/users`} />
        )}
      </div>

      {/* Quick Links */}
      {QUICK_LINKS.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Quick Access</h2>
            <Badge variant="secondary" className="text-[10px]">{QUICK_LINKS.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} prefetch={false}
                  className="card-widget p-5 flex items-center gap-4 group cursor-pointer">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${link.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{link.label}</div>
                    <Muted className="text-xs mt-0.5 truncate">{link.desc}</Muted>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
