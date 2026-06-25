"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  ROOM_REVEALED: "bg-primary",
  TOURNAMENT_CANCELLED: "bg-destructive",
  PRIZE_CREDITED: "bg-success",
  REFUND_CREDITED: "bg-info",
  GENERAL: "bg-muted-foreground",
};

const TOURNAMENT_TYPES = new Set(["ROOM_REVEALED", "TOURNAMENT_CANCELLED", "PRIZE_CREDITED", "REFUND_CREDITED"]);

export default function NotificationsBell({
  initialNotifications = [],
  initialUnreadCount = 0,
}: {
  initialNotifications?: Notification[];
  initialUnreadCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.data?.notifications ?? []);
      setUnreadCount(data.data?.unreadCount ?? 0);
    } catch {
      // Silently fail — user might not be logged in
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((n) => n.map((notif) => ({ ...notif, isRead: true })));
      setUnreadCount(0);
    } catch {}
  }

  async function markRead(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((n) => n.map((notif) => notif.id === id ? { ...notif, isRead: true } : notif));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  }

  // Poll every 60s when mounted
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function getNotifLink(n: Notification) {
    if (TOURNAMENT_TYPES.has(n.type) && n.referenceId) {
      return `/tournaments/${n.referenceId}`;
    }
    if (n.type === "REFUND_CREDITED") return "/dashboard/wallet";
    return null;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-xl border border-border shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-foreground text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:text-primary font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => {
                const link = getNotifLink(n);
                const dot = TYPE_COLORS[n.type] ?? "bg-muted-foreground";
                const content = (
                  <div
                    key={n.id}
                    className={cn(
                      "px-4 py-3 hover:bg-muted transition-colors cursor-pointer border-b border-border/50 last:border-0",
                      !n.isRead && "bg-primary/5"
                    )}
                    onClick={() => !n.isRead && markRead(n.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.isRead ? "bg-muted" : dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm leading-snug", n.isRead ? "text-muted-foreground font-normal" : "text-foreground font-medium")}>
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );

                if (link) {
                  return (
                    <a key={n.id} href={link}>
                      {content}
                    </a>
                  );
                }
                return <div key={n.id}>{content}</div>;
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
