"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { ChevronRight, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import Image from "next/image";
import { useImageUrl } from "@/components/image-cache-provider";
import { ChatbotHeaderTrigger } from "./chatbot-header-trigger";

function WalletBalance({ initialBalance }: { initialBalance: number }) {
  const [balance, setBalance] = useState<number>(initialBalance);

  const refreshBalance = useCallback(() => {
    fetch("/api/wallet/me")
      .then((r) => r.json())
      .then((d) => setBalance(d.data?.balance ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    window.addEventListener("wallet:balance-updated", refreshBalance);
    return () => window.removeEventListener("wallet:balance-updated", refreshBalance);
  }, [refreshBalance]);

  return (
    <Link
      href="/dashboard/wallet"
      prefetch={true}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-all text-xs font-medium text-primary group"
    >
      <Wallet className="h-3.5 w-3.5 text-primary shrink-0 transition-transform group-hover:scale-105" />
      <span className="font-mono font-bold tracking-tight text-foreground tabular-nums">
        {balance === null ? null : `₹${balance}`}
      </span>
    </Link>
  );
}

interface DashboardTopNavProps {
  initialWalletBalance?: number;
  siteName?: string;
  logoSrc?: string;
  logoUrl?: string;
  logoAlt?: string;
}

export default function DashboardTopNav({
  initialWalletBalance,
  siteName = "",
  logoSrc = "/assets/logo.svg",
  logoUrl = "/dashboard",
  logoAlt = "logo",
}: DashboardTopNavProps) {
  const imgUrl = useImageUrl();
  const pathname = usePathname();

  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const isLast = index === pathSegments.length - 1;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace("-", " ");
    return (
      <div key={segment} className="flex items-center gap-1.5">
        <span className={cn(
          "text-xs transition-colors",
          isLast ? "text-foreground font-semibold tracking-tight" : "text-muted-foreground/80 hover:text-foreground"
        )}>
          {label}
        </span>
        {!isLast && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
      </div>
    );
  });

  return (
    <header className="sticky top-0 z-40 flex h-13 items-center justify-between px-3 md:px-6 bg-background/80 backdrop-blur-md border-b border-border/40 shrink-0 supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger className="shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md p-1.5 transition-colors hidden md:flex" />
        
        {/* Mobile: Site Logo & Name */}
        <Link href={logoUrl} prefetch={true} className="flex md:hidden items-center gap-2 min-w-0">
          {logoSrc && (
            <Image src={imgUrl(logoSrc)} alt={logoAlt} width={24} height={24} className="h-6 w-6 object-contain shrink-0" />
          )}
          {siteName && (
            <span className="font-momo text-sm font-medium tracking-tight text-foreground truncate">
              {siteName}
            </span>
          )}
        </Link>

        {/* Desktop: Breadcrumbs */}
        <div className="hidden md:flex items-center gap-1.5 text-xs">
          {breadcrumbs}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <ChatbotHeaderTrigger />
        <WalletBalance initialBalance={initialWalletBalance ?? 0} />
      </div>
    </header>
  );
}

