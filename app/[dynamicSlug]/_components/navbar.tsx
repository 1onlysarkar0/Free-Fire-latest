"use client";

import { usePathname } from "next/navigation";
import { AvatarDisplay } from "@/components/ui/avatar-display";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface AdminNavbarProps {
  userName: string;
  userImage: string | null;
  isAdmin: boolean;
}

export default function AdminNavbar({ userName, userImage, isAdmin }: AdminNavbarProps) {
  const pathname = usePathname();
  
  // Extract the segment after the panelSlug
  const segments = pathname.split('/').filter(Boolean);
  const currentSegment = segments.length > 1 ? segments[1] : "";

  let currentPage = "Dashboard";
  if (currentSegment === "site-config") currentPage = "Site Configuration";
  else if (currentSegment === "navigation") currentPage = "Navigation Items";
  else if (currentSegment === "auth-content") currentPage = "Auth Content";
  else if (currentSegment === "smtp") currentPage = "SMTP Config";
  else if (currentSegment === "email-templates") currentPage = "Email Templates";
  else if (currentSegment === "seo") currentPage = "SEO Config";
  else if (currentSegment === "users") currentPage = "Users";
  else if (currentSegment === "roles") {
    if (segments.length > 2 && segments[2] === "new") currentPage = "Create Role";
    else if (segments.length > 2) currentPage = "Edit Role";
    else currentPage = "Roles & Permissions";
  }
  else if (currentSegment === "pages") {
    if (segments.length > 2 && segments[2] === "new") currentPage = "New Page";
    else if (segments.length > 2) currentPage = "Edit Page";
    else currentPage = "Custom Pages";
  }

  return (
    <header className="h-14 bg-background flex items-center px-3 md:px-6 gap-3 shrink-0">
      {/* Sidebar toggle — visible on all sizes */}
      <SidebarTrigger className="shrink-0 text-foreground hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors" />

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
        <span className="hidden sm:block cursor-default">Admin</span>
        <ChevronRight className="hidden sm:block h-3.5 w-3.5 shrink-0" />
        <span className="font-medium text-foreground truncate">{currentPage}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <AvatarDisplay
            image={userImage}
            name={userName}
            className="h-8 w-8 shrink-0"
          />
          <div className="hidden md:flex flex-col leading-tight">
            <span className="text-sm font-medium text-foreground truncate max-w-28">{userName}</span>
            <Badge
              variant="outline"
              className="text-[10px] h-4 px-1.5 border-primary/20 text-primary bg-primary/10 w-fit"
            >
              {isAdmin ? "Superadmin" : "Staff"}
            </Badge>
          </div>
          <div className="hidden sm:block md:hidden">
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 border-primary/20 text-primary bg-primary/10"
            >
              {isAdmin ? "SA" : "Staff"}
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
