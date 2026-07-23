import { getNavbarConfig } from "@/lib/navigation";
import { NavbarClient } from "./navbar-client";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { connection } from "next/server";
import { getUserNotifications } from "@/lib/notifications";
import type { Notification } from "@/components/notifications-bell";

export async function Navbar() {
  const config = await getNavbarConfig();

  return (
    <NavbarClient
      logo={config.logo}
      menu={config.menu}
      mobileExtraLinks={config.mobileExtraLinks}
      auth={config.auth}
      initialIsLoggedIn={false}
      initialNotifications={[]}
      initialUnreadCount={0}
    />
  );
}
