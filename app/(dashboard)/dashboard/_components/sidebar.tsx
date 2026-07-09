"use client";

import UserProfile, { type PermissionData } from "@/components/user-profile";
import { HomeIcon, Trophy, Wallet, Bell } from "lucide-react";
import AppSidebarShell, { type AppSidebarSection } from "@/components/app-sidebar";

const getDashboardSections = (): AppSidebarSection[] => [
  {
    title: "",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: HomeIcon, exact: true },
    ],
  },
  {
    title: "",
    items: [
      { label: "My Tournaments", href: "/dashboard/my-tournaments", icon: Trophy },
    ],
  },
  {
    title: "",
    items: [
      { label: "My Wallet", href: "/dashboard/wallet", icon: Wallet },
    ],
  },
  {
    title: "",
    items: [
      { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
    ],
  },
];

interface DashboardSideBarProps {
  siteName: string;
  logoSrc: string;
  logoUrl: string;
  logoAlt: string;
  user?: Record<string, unknown>;
  permData?: PermissionData;
  myAccountText?: string;
  logOutText?: string;
}

export default function DashboardSideBar({
  siteName,
  logoSrc,
  logoUrl,
  logoAlt,
  user,
  permData,
  myAccountText,
  logOutText,
}: DashboardSideBarProps) {
  return (
    <AppSidebarShell
      siteName={siteName}
      logoSrc={logoSrc}
      logoUrl={logoUrl}
      logoAlt={logoAlt}
      sections={getDashboardSections()}
      footer={(collapsed) => (
        <UserProfile
          mini={collapsed}
          initialUser={user}
          initialPermData={permData}
          myAccountText={myAccountText}
          logOutText={logOutText}
        />
      )}
    />
  );
}
