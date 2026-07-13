import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "./_components/sidebar";
import DashboardTopNav from "./_components/navbar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUserProfileCached } from "@/lib/user-data";
import { getWalletBalanceCached } from "@/lib/wallet";
import { getAdminSiteConfigCached } from "@/lib/admin-data";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const dbUser = await getUserProfileCached(session.user.id);

  if (!dbUser?.gameName) {
    redirect("/complete-profile");
  }

  if (dbUser?.isBanned) {
    const banReason = dbUser.banReason;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <div className="max-w-md w-full space-y-6">
          <h1 className="text-3xl font-lora font-bold text-foreground">Account Suspended</h1>
          <p className="text-muted-foreground">
            {banReason 
              ? `Your account has been suspended for the following reason: ${banReason}`
              : "Your account has been suspended by an administrator."}
          </p>
          <div className="pt-4">
            <form action="/api/auth/sign-out" method="POST">
              <button 
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-ibm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const [balance, config] = await Promise.all([
    getWalletBalanceCached(session.user.id),
    getAdminSiteConfigCached(),
  ]);

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar 
        user={session.user} 
        siteName={config?.logoTitle ?? ""}
        logoSrc={config?.logoSrc ?? "/assets/logo.webp"}
        logoUrl={config?.logoUrl ?? "/dashboard"}
        logoAlt={config?.logoAlt ?? "logo"}
        myAccountText={config?.userProfileMyAccountText ?? "My Account"}
        logOutText={config?.userProfileLogOutText ?? "Log out"}
      />
      <SidebarInset className="flex flex-col min-h-screen bg-background">
        <DashboardTopNav initialWalletBalance={balance} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
