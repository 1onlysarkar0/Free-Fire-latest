"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, LogIn, UserPlus, LayoutDashboard } from "lucide-react";
import NotificationsBell from "@/components/notifications-bell";
import * as LucideIcons from "lucide-react";
import { authClient } from "@/lib/auth-client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { MenuItem } from "@/lib/navigation";
import type { Notification } from "@/components/notifications-bell";
import { Large, Muted } from "@/components/ui/typography";

export type { MenuItem };

export interface Navbar1Props {
  logo: {
    url: string;
    src: string;
    alt: string;
    title: string;
  };
  menu: MenuItem[];
  mobileExtraLinks: {
    name: string;
    url: string;
  }[];
  auth: {
    login: {
      text: string;
      url: string;
    };
    signup: {
      text: string;
      url: string;
    };
  };
  initialIsLoggedIn?: boolean;
  initialNotifications?: Notification[];
  initialUnreadCount?: number;
}

const getIcon = (name?: string | null) => {
  if (!name) return null;
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!IconComponent) return null;
  return <IconComponent className="size-5 shrink-0 text-foreground" />;
};

export const NavbarClient = ({
  logo,
  menu,
  mobileExtraLinks = [],
  auth,
  initialIsLoggedIn = false,
  initialNotifications = [],
  initialUnreadCount = 0,
}: Navbar1Props) => {
  const { data: session, isPending } = authClient.useSession();

  // Use server-provided initial value while client hydrates — eliminates flash
  const isLoggedIn = isPending ? initialIsLoggedIn : !!session?.user;

  const authButtons = isLoggedIn ? (
    <>
      <NotificationsBell initialNotifications={initialNotifications} initialUnreadCount={initialUnreadCount} />
      <Link
        href="/dashboard"
        prefetch={true}
        className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors duration-150 text-secondary-foreground bg-secondary hover:bg-secondary/80 rounded-md px-4 py-2 shadow-xs"
      >
        <LayoutDashboard className="size-4 shrink-0 text-foreground" />
        Dashboard
      </Link>
    </>
  ) : (
    <>
      <Link
        href={auth.login.url}
        prefetch={true}
        className="nav-login-link inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-foreground hover:text-primary rounded-md transition-colors duration-150"
      >
        <LogIn className="size-4 shrink-0" />
        {auth.login.text}
      </Link>
      <Link
        href={auth.signup.url}
        prefetch={true}
        className="nav-signup-direct inline-flex items-center gap-1.5 text-sm font-semibold transition-colors duration-150 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 shadow-xs"
      >
        <UserPlus className="size-4 shrink-0" />
        {auth.signup.text}
      </Link>
    </>
  );

  const mobileAuthButtons = isLoggedIn ? (
    <Link
      href="/dashboard"
      prefetch={true}
      className="inline-flex items-center justify-center gap-2 w-full text-sm font-semibold transition-colors duration-150 text-secondary-foreground bg-secondary hover:bg-secondary/80 rounded-md px-4 py-2 shadow-xs"
    >
      <LayoutDashboard className="size-4 shrink-0 text-foreground" />
      Dashboard
    </Link>
  ) : (
    <>
      <Link
        href={auth.login.url}
        prefetch={true}
        className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-foreground rounded-md transition-colors duration-150 hover:bg-secondary"
      >
        <LogIn className="size-4 shrink-0" />
        {auth.login.text}
      </Link>
      <Link
        href={auth.signup.url}
        prefetch={true}
        className="inline-flex items-center justify-center gap-2 w-full text-sm font-semibold transition-colors duration-150 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 shadow-xs"
      >
        <UserPlus className="size-4 shrink-0" />
        {auth.signup.text}
      </Link>
    </>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-background/80 backdrop-blur-md transition-all duration-200">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex h-16 items-center justify-between">

          {/* ── Desktop Navigation ── */}
          <div className="hidden lg:flex items-center justify-between w-full">
            <div className="flex items-center gap-8">
              <Link
                href={logo.url}
                prefetch={true}
                className="flex items-center gap-2.5 hover:opacity-90 transition-opacity shrink-0"
              >
                <Image src={logo.src} className="w-8 h-8" alt={logo.alt} width={32} height={32} priority suppressHydrationWarning />
                <Large className="font-momo text-foreground text-[22px] font-normal tracking-tight">
                  {logo.title}
                </Large>
              </Link>

              <NavigationMenu>
                <NavigationMenuList className="gap-0">
                  {menu.map((item) => renderMenuItem(item))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden lg:block h-5 w-px bg-border" />
              {authButtons}
            </div>
          </div>

          {/* ── Mobile Navigation ── */}
          <div className="flex w-full items-center justify-between lg:hidden">
            <Link href={logo.url} prefetch={true} className="flex items-center gap-2">
              <Image src={logo.src} className="w-7 h-7" alt={logo.alt} width={28} height={28} priority suppressHydrationWarning />
              <Large className="font-momo text-foreground text-lg font-normal">
                {logo.title}
              </Large>
            </Link>

            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="h-11 w-11 flex items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors cursor-pointer"
                  aria-label="Open menu"
                >
                  <Menu className="size-5 text-foreground" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[300px] overflow-y-auto p-6 bg-background border-none"
              >
                <SheetHeader className="text-left pb-4">
                  <SheetTitle>
                    <Link href={logo.url} prefetch={true} className="flex items-center gap-2">
                      <Image src={logo.src} className="w-7 h-7" alt={logo.alt} width={28} height={28} priority suppressHydrationWarning />
                      <Large className="font-momo text-foreground text-lg font-normal">
                        {logo.title}
                      </Large>
                    </Link>
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-6 flex flex-col gap-6">
                  <Accordion type="single" collapsible className="flex w-full flex-col gap-3">
                    {menu.map((item) => renderMobileMenuItem(item))}
                  </Accordion>

                  {mobileExtraLinks.length > 0 && (
                    <div className="flex flex-col gap-1 pt-2 border-t border-border">
                      {mobileExtraLinks.map((link) => (
                        <Link
                          key={link.url}
                          href={link.url}
                          prefetch={true}
                          className="py-2 text-sm font-semibold block text-foreground hover:text-primary transition-colors duration-150"
                        >
                          {link.name}
                        </Link>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-4 border-t border-border">
                    {mobileAuthButtons}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </div>
    </header>
  );
};

const renderMenuItem = (item: MenuItem) => {
  if (item.items && item.items.length > 0) {
    return (
      <NavigationMenuItem key={item.title}>
        <NavigationMenuTrigger className="text-sm font-semibold hover:no-underline px-4 py-2 text-foreground data-[state=open]:bg-accent">
          {item.title}
        </NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul className="w-80 p-2 flex flex-col gap-0.5">
            {item.items.map((subItem) => (
              <li key={subItem.title}>
                <NavigationMenuLink asChild>
                  <Link
                    className="flex select-none gap-4 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-foreground group"
                    href={subItem.url}
                    prefetch={true}
                  >
                    {getIcon(subItem.icon)}
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {subItem.title}
                      </div>
                      {subItem.description && (
                        <Muted className="text-xs leading-normal">
                          {subItem.description}
                        </Muted>
                      )}
                    </div>
                  </Link>
                </NavigationMenuLink>
              </li>
            ))}
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem key={item.title}>
      <Link
        className="inline-flex w-max items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-foreground hover:text-primary hover:bg-accent transition-colors duration-150"
        href={item.url}
        prefetch={true}
      >
        {item.title}
      </Link>
    </NavigationMenuItem>
  );
};

const renderMobileMenuItem = (item: MenuItem) => {
  if (item.items && item.items.length > 0) {
    return (
      <AccordionItem key={item.title} value={item.title} className="border-none">
        <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline text-foreground">
          {item.title}
        </AccordionTrigger>
        <AccordionContent className="mt-1 flex flex-col gap-1 pl-2 border-l border-border">
          {item.items.map((subItem) => (
            <Link
              key={subItem.title}
              className="flex select-none gap-3 rounded-md p-2.5 leading-none outline-none transition-colors hover:bg-accent text-foreground"
              href={subItem.url}
              prefetch={true}
            >
              {getIcon(subItem.icon)}
              <div className="space-y-0.5">
                <div className="text-xs font-semibold">{subItem.title}</div>
                {subItem.description && (
                  <Muted className="text-[11px] leading-normal">
                    {subItem.description}
                  </Muted>
                )}
              </div>
            </Link>
          ))}
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <Link
      key={item.title}
      href={item.url}
      prefetch={true}
      className="py-2 text-sm font-semibold block text-foreground hover:text-primary transition-colors duration-150"
    >
      {item.title}
    </Link>
  );
};
