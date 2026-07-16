"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

import { usePathname } from "next/navigation";
import { ChevronRight, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

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
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
    >
      <Wallet className="h-4 w-4 text-foreground shrink-0" />
      <span className="text-sm font-bold text-primary">
        {balance === null ? null : (
          `₹${balance}`
        )}
      </span>
    </Link>
  );
}

export default function DashboardTopNav({ initialWalletBalance }: { initialWalletBalance?: number }) {
  const pathname = usePathname();

  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const isLast = index === pathSegments.length - 1;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace("-", " ");
    return (
      <div key={segment} className="flex items-center gap-2">
        <span className={isLast ? "text-foreground font-semibold" : "text-muted-foreground"}>
          {label}
        </span>
        {!isLast && <ChevronRight className="h-4 w-4 text-foreground" />}
      </div>
    );
  });

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between px-3 md:px-6 bg-background/70 backdrop-blur-xl border-b border-border/20 shrink-0 supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="shrink-0 text-foreground hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors" />
        <div className="hidden md:flex items-center gap-2 text-sm">
          {breadcrumbs}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <WalletBalance initialBalance={initialWalletBalance ?? 0} />
      </div>
    </header>
  );
}
