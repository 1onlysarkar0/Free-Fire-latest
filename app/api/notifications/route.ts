import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { notification } from "@/db/schema";
import { and, count, desc, eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return apiError("Authentication required", 401);
    }
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));

    const conditions = [eq(notification.userId, userId)];
    if (unreadOnly) conditions.push(eq(notification.isRead, false));

    const [notifications, [{ unreadCount }]] = await Promise.all([
      db
        .select()
        .from(notification)
        .where(and(...conditions))
        .orderBy(desc(notification.createdAt))
        .limit(limit),
      db
        .select({ unreadCount: count() })
        .from(notification)
        .where(and(eq(notification.userId, userId), eq(notification.isRead, false))),
    ]);

    // Format output with data and unreadCount in a standardized wrapper
    return apiSuccess({ notifications, unreadCount });
  } catch (err) {
    console.error("[API/notifications] GET error:", err);
    return apiError("Failed to fetch notifications", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return apiError("Authentication required", 401);
    }
    const userId = session.user.id;

    const body = await req.json().catch(() => ({}));
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await db
        .update(notification)
        .set({ isRead: true })
        .where(and(eq(notification.userId, userId), eq(notification.isRead, false)));
      return apiSuccess({ success: true });
    }

    if (notificationId) {
      await db
        .update(notification)
        .set({ isRead: true })
        .where(and(eq(notification.id, notificationId), eq(notification.userId, userId)));
      return apiSuccess({ success: true });
    }

    return apiError("Specify notificationId or markAllRead", 400);
  } catch (err) {
    console.error("[API/notifications] PATCH error:", err);
    return apiError("Failed to update notifications", 500);
  }
}
