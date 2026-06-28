export const dynamic = "force-dynamic";

import { verifyPanelAccess } from "@/lib/panel-auth";
import AdminNavbar from "./_components/navbar";
import AdminSidebar from "./_components/sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { redirect } from "next/navigation";
import { getDashboardConfig } from "@/lib/content";

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
          />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 w-full">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Not a panel, render as public custom page layout
  return <>{children}</>;
}
