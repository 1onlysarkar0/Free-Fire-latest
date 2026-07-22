"use client";

import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  CheckSquare,
  Sparkles,
  Trophy,
  AlertTriangle,
  Wallet,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsClientProps {
  initialData: {
    notifications: NotificationItem[];
    unreadCount: number;
  };
}

const CATEGORY_MAP: Record<string, string> = {
  ROOM_REVEALED: "Match Credentials",
  TOURNAMENT_CANCELLED: "Cancellations",
  PRIZE_CREDITED: "Prize Credits",
  REFUND_CREDITED: "Refunds",
  GENERAL: "General Info",
};

export default function NotificationsClient({ initialData }: NotificationsClientProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialData.notifications);
  const [unreadCount, setUnreadCount] = useState(initialData.unreadCount);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  async function handleMarkAllRead() {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!res.ok) throw new Error();

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  }

  async function handleMarkIndividualRead(id: string) {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      if (!res.ok) throw new Error();

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error("Failed to update notification");
    }
  }

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (statusFilter === "UNREAD" && n.isRead) return false;
      if (statusFilter === "READ" && !n.isRead) return false;
      if (typeFilter !== "ALL" && n.type !== typeFilter) return false;
      return true;
    });
  }, [notifications, statusFilter, typeFilter]);

  const getNotifDetails = (type: string) => {
    switch (type) {
      case "ROOM_REVEALED":
        return { icon: Trophy, color: "text-amber-500" };
      case "TOURNAMENT_CANCELLED":
        return { icon: AlertTriangle, color: "text-destructive" };
      case "PRIZE_CREDITED":
        return { icon: Sparkles, color: "text-emerald-500" };
      case "REFUND_CREDITED":
        return { icon: Wallet, color: "text-blue-500" };
      default:
        return { icon: Bell, color: "text-primary" };
    }
  };

  const getNotifLink = (n: NotificationItem) => {
    if (["ROOM_REVEALED", "TOURNAMENT_CANCELLED", "PRIZE_CREDITED"].includes(n.type) && n.referenceId) {
      return `/tournaments/${n.referenceId}`;
    }
    if (n.type === "REFUND_CREDITED") return "/dashboard/wallet";
    return null;
  };

  return (
    <div className="w-full min-w-0 space-y-4 pb-6 text-foreground font-ibm">
      {/* Top Filter Controls */}
      <Card className="p-3 rounded-2xl border border-border/40 bg-card shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {(["ALL", "UNREAD", "READ"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer",
                statusFilter === status
                  ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                  : "bg-secondary/40 text-muted-foreground border-border/40 hover:bg-secondary hover:text-foreground"
              )}
            >
              {status === "ALL" ? "All" : status === "UNREAD" ? `Unread (${unreadCount})` : "Read"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-secondary/50 border border-border/40 px-2.5 py-1 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {Object.entries(CATEGORY_MAP).map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {unreadCount > 0 && (
            <Button onClick={handleMarkAllRead} variant="outline" size="sm" className="h-7 text-xs px-2.5 rounded-xl border-border/50 font-semibold">
              <CheckSquare className="w-3.5 h-3.5 mr-1" /> Mark read
            </Button>
          )}
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <Card className="p-8 rounded-2xl border border-border/40 bg-card/60 text-center flex flex-col items-center justify-center">
            <Bell className="h-7 w-7 text-muted-foreground/30 mb-2" />
            <h2 className="text-sm font-bold font-lora text-foreground">No notifications found</h2>
            <p className="text-xs text-muted-foreground max-w-xs mt-0.5">
              You are all caught up! No notifications match the selected filter.
            </p>
          </Card>
        ) : (
          filteredNotifications.map((n) => {
            const { icon: Icon, color } = getNotifDetails(n.type);
            const link = getNotifLink(n);
            const label = CATEGORY_MAP[n.type] || "System Info";

            return (
              <Card
                key={n.id}
                onClick={() => !n.isRead && handleMarkIndividualRead(n.id)}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 shadow-3xs hover:border-primary/30",
                  n.isRead
                    ? "bg-card border-border/40"
                    : "bg-primary/5 border-primary/20 ring-1 ring-primary/10"
                )}
              >
                <div className="p-2 rounded-xl bg-secondary shrink-0 mt-0.5">
                  <Icon className={cn("h-4 w-4", color)} />
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-xs font-bold truncate", n.isRead ? "text-foreground" : "text-primary font-extrabold")}>
                      {n.title}
                    </p>
                    {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                  </div>

                  <p className="text-xs text-muted-foreground leading-normal line-clamp-2">
                    {n.message}
                  </p>

                  <div className="flex items-center gap-2 pt-1 text-[10px] text-muted-foreground font-mono">
                    <span className="font-semibold">{label}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>

                {link && (
                  <a
                    href={link}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-primary transition-colors shrink-0 self-center"
                    title="View Details"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
