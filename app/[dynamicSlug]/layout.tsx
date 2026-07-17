// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

import { verifyPanelAccess } from "@/lib/panel-auth";
import AdminNavbar from "./_components/navbar";
import AdminSidebar from "./_components/sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { redirect } from "next/navigation";
import { getDashboardConfig } from "@/lib/content";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function DynamicSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ dynamicSlug: string }>;
}) {
  const { dynamicSlug } = await params;

  const authState = await verifyPanelAccess(dynamicSlug);
  const dashConfig = authState.isPanel ? await getDashboardConfig() : null;

  if (authState.isPanel) {
    if (!authState.hasAccess || !authState.user) {
      redirect("/dashboard");
    }

    return (
      <SidebarProvider>
        <AdminSidebar
          siteName={dashConfig!.siteName}
          logoSrc={dashConfig!.logoSrc}
          logoUrl={dashConfig!.logoUrl}
          logoAlt={dashConfig!.logoAlt}
          isAdmin={authState.isAdmin}
          permissions={authState.permissions}
          panelSlug={dynamicSlug}
        />
        <SidebarInset className="min-h-screen">
          <AdminNavbar
            userName={authState.user.name}
            userImage={authState.user.image ?? null}
            isAdmin={authState.isAdmin}
            siteName={dashConfig?.siteName ?? ""}
            logoSrc={dashConfig?.logoSrc ?? "/assets/logo.svg"}
            logoUrl={dashConfig?.logoUrl ?? "/dashboard"}
            logoAlt={dashConfig?.logoAlt ?? "logo"}
          />
          <main className="flex-1 overflow-y-auto overflow-x-hidden pt-6 pb-20 px-4 md:pt-8 md:pb-6 md:px-6 lg:pt-10 lg:pb-8 lg:px-8 w-full">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Not a panel, render as public custom page layout
  return <>{children}</>;
}
