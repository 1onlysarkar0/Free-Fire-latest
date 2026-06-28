"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ElementType, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface AppSidebarItem {
  label: string;
  href: string;
  icon: ElementType;
  exact?: boolean;
}

export interface AppSidebarSection {
  title: string;
  items: AppSidebarItem[];
}

interface AppSidebarProps {
  siteName: string;
  logoSrc: string;
  logoUrl: string;
  logoAlt: string;
  sections: AppSidebarSection[];
  badge?: string;
  footer?: ReactNode | ((collapsed: boolean) => ReactNode);
}

function NavItemLink({
  item,
  isActive,
  collapsed,
}: {
  item: AppSidebarItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              prefetch={false}
              className={cn(
                "flex items-center justify-center h-9 w-9 rounded-lg transition-colors mx-auto",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Link
      href={item.href}
      prefetch={false}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group w-full",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      <span className="flex-1 truncate">{item.label}</span>
      {isActive && <ChevronRight className="h-3 w-3 text-foreground" />}
    </Link>
  );
}

export default function AppSidebarShell({
  siteName,
  logoSrc,
  logoUrl,
  logoAlt,
  sections,
  badge,
  footer,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="h-14 flex flex-row items-center justify-start border-b border-sidebar-border shrink-0 px-3">
        {collapsed ? (
          <div className="flex items-center justify-center w-full">
            {logoSrc && (
              <Link href={logoUrl} prefetch={false}>
                <Image src={logoSrc} alt={logoAlt} width={28} height={28} className="h-7 w-7 object-contain" />
              </Link>
            )}
          </div>
        ) : (
          <Link href={logoUrl} prefetch={false} className="flex items-center gap-2.5 min-w-0 w-full">
            {logoSrc && (
              <Image src={logoSrc} alt={logoAlt} width={28} height={28} className="h-7 w-7 object-contain shrink-0" />
            )}
            <span className="font-momo text-[18px] font-normal tracking-tight text-sidebar-foreground truncate mt-[3px]">
              {siteName}
            </span>
            {badge && (
              <span className="ml-auto text-[9px] font-bold bg-sidebar-primary/10 text-sidebar-primary px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0">
                {badge}
              </span>
            )}
          </Link>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 bg-sidebar">
        {sections.map((section, idx) => (
          <SidebarGroup key={`section-${idx}`} className="p-0 mb-4">
            {!collapsed && section.title && (
              <SidebarGroupLabel className="px-3 mb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                {section.title}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {section.items.map((item) => {
                  const isActive = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} className="h-auto p-0">
                        <NavItemLink item={item} isActive={isActive} collapsed={collapsed} />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {footer && (
        <SidebarFooter className="border-t border-sidebar-border px-3 py-3 bg-sidebar">
          {typeof footer === "function" ? footer(collapsed) : footer}
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
