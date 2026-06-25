import "server-only";
import { db } from "@/db/drizzle";
import { notification } from "@/db/schema";
import { and, count, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

async function _fetchUserNotifications(userId: string, limit: number) {
  const [notifications, [{ unreadCount }]] = await Promise.all([
    db
      .select()
      .from(notification)
      .where(eq(notification.userId, userId))
      .orderBy(desc(notification.createdAt))
      .limit(limit),
    db
      .select({ unreadCount: count() })
      .from(notification)
      .where(and(eq(notification.userId, userId), eq(notification.isRead, false))),
  ]);

  return {
    notifications: notifications.map(n => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  };
}

export function getUserNotifications(userId: string, limit = 20) {
  return _fetchUserNotifications(userId, limit);
}

export async function createNotification(opts: {
  userId: string;
  title: string;
  message: string;
  type: string;
  referenceId?: string;
}) {
  try {
    await db.insert(notification).values({
      id: nanoid(),
      userId: opts.userId,
      title: opts.title,
      message: opts.message,
      type: opts.type,
      referenceId: opts.referenceId ?? null,
      isRead: false,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error(`[Notifications] Failed to create notification for user ${opts.userId}:`, err);
  }
}

export async function createNotificationsForUsers(opts: {
  userIds: string[];
  title: string;
  message: string;
  type: string;
  referenceId?: string;
}) {
  if (opts.userIds.length === 0) return;
  try {
    const rows = opts.userIds.map((userId) => ({
      id: nanoid(),
      userId,
      title: opts.title,
      message: opts.message,
      type: opts.type,
      referenceId: opts.referenceId ?? null,
      isRead: false,
      createdAt: new Date(),
    }));
    await db.insert(notification).values(rows);
  } catch (err) {
    console.error(`[Notifications] Failed to create notifications for multiple users:`, err);
  }
}
