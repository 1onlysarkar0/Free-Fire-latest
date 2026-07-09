import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserNotifications } from "@/lib/notifications";
import NotificationsClient from "./_components/notifications-client";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth.api.getSession({ 
    headers: await headers() 
  }).catch(() => null);

  if (!session?.user) {
    redirect("/sign-in?returnTo=/dashboard/notifications");
    return;
  }

  // Fetch initial notifications (fetch up to 100 for a detailed dashboard history)
  const initialData = await getUserNotifications(session.user.id, 100).catch(() => ({
    notifications: [],
    unreadCount: 0
  }));

  return <NotificationsClient initialData={initialData} />;
}
