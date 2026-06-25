import { getNavbarConfig } from "@/lib/navigation";
import { NavbarClient } from "./navbar-client";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getUserNotifications } from "@/lib/notifications";
import type { Notification } from "@/components/notifications-bell";

export async function Navbar() {
  const [config, session] = await Promise.all([
    getNavbarConfig(),
    auth.api.getSession({ headers: await headers() }).catch(() => null),
  ]);

  let initialNotifications: Notification[] = [];
  let initialUnreadCount = 0;

  if (session?.user) {
    const data = await getUserNotifications(session.user.id).catch(() => ({ notifications: [], unreadCount: 0 }));
    initialNotifications = data.notifications;
    initialUnreadCount = data.unreadCount;
  }

  return (
    <NavbarClient
      logo={config.logo}
      menu={config.menu}
      mobileExtraLinks={config.mobileExtraLinks}
      auth={config.auth}
      initialIsLoggedIn={!!session?.user}
      initialNotifications={initialNotifications}
      initialUnreadCount={initialUnreadCount}
    />
  );
}
