"use client";

import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Check,
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
import { Card, CardContent } from "@/components/ui/card";
import { H4, Muted } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
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
      // 1. Status Filter
      if (statusFilter === "UNREAD" && n.isRead) return false;
      if (statusFilter === "READ" && !n.isRead) return false;

      // 2. Type Filter
      if (typeFilter !== "ALL" && n.type !== typeFilter) return false;

      return true;
    });
  }, [notifications, statusFilter, typeFilter]);

  const getNotifDetails = (type: string) => {
    switch (type) {
      case "ROOM_REVEALED":
        return { icon: Trophy };
      case "TOURNAMENT_CANCELLED":
        return { icon: AlertTriangle };
      case "PRIZE_CREDITED":
        return { icon: Sparkles };
      case "REFUND_CREDITED":
        return { icon: Wallet };
      default:
        return { icon: Bell };
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
    <div className="w-full min-w-0 space-y-5 pb-6">
      
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card border border-border/60 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground font-lora">
              Notifications & Alerts
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Match room updates, credits, and announcements
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllRead} variant="outline" className="border-border/60 hover:bg-muted/40 font-semibold text-xs h-8 px-3 shrink-0">
            <CheckSquare className="w-3.5 h-3.5 mr-1.5 text-primary" /> Mark all read
          </Button>
        )}
      </div>

      {/* High-Density Filters Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-muted/40 border border-border/60 rounded-xl text-xs">
        
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1">
          {(["ALL", "UNREAD", "READ"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                statusFilter === status
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {status === "ALL" ? "All" : status === "UNREAD" ? `Unread (${unreadCount})` : "Read"}
            </button>
          ))}
        </div>

        {/* Category Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-7 rounded-md border border-border/60 bg-card px-2 py-0 text-xs font-semibold text-foreground focus-visible:outline-none"
          >
            <option value="ALL">All Categories</option>
            {Object.entries(CATEGORY_MAP).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notifications Compact Feed List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <Card className="p-6 bg-card/60 rounded-xl border border-dashed border-border/80 text-center">
            <Bell className="mx-auto h-6 w-6 text-muted-foreground/30 mb-2" />
            <p className="text-xs font-semibold text-foreground">No notifications found</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              You are all caught up! No matching notifications found for this filter.
            </p>
          </Card>
        ) : (
          filteredNotifications.map((n) => {
            const { icon: Icon } = getNotifDetails(n.type);
            const link = getNotifLink(n);
            const label = CATEGORY_MAP[n.type] || "System Info";

            return (
              <Card
                key={n.id}
                onClick={() => !n.isRead && handleMarkIndividualRead(n.id)}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 shadow-2xs group",
                  n.isRead 
                    ? "bg-card border-border/60 hover:border-border" 
                    : "bg-primary/5 border-primary/20"
                )}
              >
                {/* Icon Indicator */}
                <div className={cn(
                  "p-2 rounded-lg shrink-0 mt-0.5",
                  n.isRead ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                )}>
                  <Icon className="h-4 w-4" />
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className={cn("text-xs font-bold font-sans break-words", n.isRead ? "text-foreground" : "text-primary")}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground leading-relaxed break-words">
                    {n.message}
                  </p>

                  <div className="pt-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground/80">
                    {label}
                  </div>
                </div>

                {/* Link Action */}
                {link && (
                  <a
                    href={link}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-md border border-border/60 bg-card hover:bg-primary/10 hover:text-primary transition-all text-muted-foreground shrink-0 self-center"
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

