"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ElementType, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImageUrl } from "@/components/image-cache-provider";
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
  disableDock?: boolean;
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

  const linkContent = (
    <Link
      href={item.href}
      prefetch={true}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 group w-full overflow-hidden",
        isActive
          ? "bg-primary/10 text-primary font-semibold shadow-2xs"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        collapsed && "justify-center px-0 h-8 w-8 mx-auto"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate transition-opacity duration-150">{item.label}</span>
          {isActive && <ChevronRight className="h-3 w-3 text-primary/70 shrink-0" />}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return linkContent;
}

import { InteractiveMenu, type InteractiveMenuItem } from "@/components/ui/interactive-menu";
import { User as UserIcon } from "lucide-react";
import React, { useMemo } from "react";

export default function AppSidebarShell({
  siteName,
  logoSrc,
  logoUrl,
  logoAlt,
  sections,
  badge,
  footer,
  disableDock = false,
}: AppSidebarProps) {
  const imgUrl = useImageUrl();
  const pathname = usePathname();
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  const footerElement = useMemo(() => {
    if (!footer) return null;
    return typeof footer === "function" ? footer(false) : footer;
  }, [footer]);

  const dockItems = useMemo<InteractiveMenuItem[]>(() => {
    if (disableDock) return [];
    const allItems: AppSidebarItem[] = [];
    sections.forEach((sec) => {
      sec.items.forEach((it) => allItems.push(it));
    });

    const primaryNavItems = allItems.slice(0, 4);

    const items: InteractiveMenuItem[] = primaryNavItems.map((it) => ({
      label: it.label,
      href: it.href,
      icon: it.icon,
      exact: it.exact,
    }));

    if (footerElement) {
      if (React.isValidElement(footerElement)) {
        items.push({
          label: "Profile",
          icon: UserIcon,
          renderWrapper: (buttonChild) => {
            return React.cloneElement(footerElement as React.ReactElement<{ customTrigger?: React.ReactNode; side?: string; align?: string }>, {
              customTrigger: buttonChild,
              side: "top",
              align: "center",
            });
          },
        });
      } else {
        items.push({
          label: "Profile",
          icon: UserIcon,
        });
      }
    }

    return items;
  }, [sections, footerElement, disableDock]);

  return (
    <>
      <Sidebar collapsible="icon" className={cn("border-r border-sidebar-border bg-sidebar", !disableDock && "hidden md:flex")}>
        <SidebarHeader className="h-14 flex flex-row items-center justify-start border-b border-sidebar-border shrink-0 px-3 overflow-hidden">
          <Link href={logoUrl} prefetch={true} className={cn("flex items-center gap-2.5 min-w-0 w-full", collapsed && "justify-center")}>
            {logoSrc && (
              <Image src={imgUrl(logoSrc)} alt={logoAlt} width={28} height={28} className="h-7 w-7 object-contain shrink-0" />
            )}
            {!collapsed && (
              <>
                <span className="font-momo text-[18px] font-normal tracking-tight text-sidebar-foreground truncate mt-[3px]">
                  {siteName}
                </span>
                {badge && (
                  <span className="ml-auto text-[9px] font-bold bg-sidebar-primary/10 text-sidebar-primary px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0">
                    {badge}
                  </span>
                )}
              </>
            )}
          </Link>
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

      {!disableDock && <InteractiveMenu items={dockItems} className="md:hidden" />}
    </>
  );
}

