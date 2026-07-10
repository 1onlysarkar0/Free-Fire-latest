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
    <div className="w-full min-w-0 space-y-6">
      
      {/* Premium Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-foreground shrink-0" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground font-lora">Your Notifications</h1>
            <p className="text-sm text-muted-foreground mt-0.5 font-ibm">
              Stay updated with your joined match schedules, credits, and announcements.
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllRead} variant="outline" className="sm:self-center border-border/60 hover:bg-accent/40 font-semibold self-start text-xs h-9">
            <CheckSquare className="w-4 h-4 mr-1.5 text-foreground" /> Mark all read
          </Button>
        )}
      </div>

      {/* Filters Area */}
      <div className="flex flex-col gap-4 bg-card/60 p-4 rounded-2xl border border-border/40 shadow-3xs sm:flex-row sm:items-center sm:justify-between">
        
        {/* Read Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(["ALL", "UNREAD", "READ"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 cursor-pointer",
                statusFilter === status
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-muted-foreground border-border hover:bg-muted/10 hover:text-foreground"
              )}
            >
              {status === "ALL" ? "All" : status === "UNREAD" ? `Unread (${unreadCount})` : "Read"}
            </button>
          ))}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold text-foreground shadow-3xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center bg-card/40 rounded-2xl border border-border/40 p-8 text-center">
            <Bell className="mb-4 h-8 w-8 text-muted-foreground/30 animate-pulse" />
            <H4 className="mt-0 font-lora">No notifications found</H4>
            <Muted className="mt-1.5 max-w-sm text-xs leading-5 font-ibm">
              No matching alerts or messages fit your current filter settings. You&apos;re all caught up!
            </Muted>
          </div>
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
                  "group relative overflow-hidden transition-all duration-300 border shadow-3xs rounded-2xl cursor-pointer hover:shadow-md hover:-translate-y-[1px]",
                  n.isRead 
                    ? "bg-card border-border/40" 
                    : "bg-primary/5 border-primary/20 ring-1 ring-primary/5"
                )}
              >
                <CardContent className="p-4 sm:p-5 flex items-start gap-4">
                  {/* Icon Indicator */}
                  <Icon className="h-5 w-5 text-foreground shrink-0 mt-0.5" />

                  {/* Main Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn("text-sm font-semibold tracking-tight leading-snug", n.isRead ? "text-foreground" : "text-primary font-bold")}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground leading-relaxed font-ibm pr-4">
                      {n.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground font-ibm">
                      <span className="font-semibold">{label}</span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Action Link Icon */}
                  {link ? (
                    <a
                      href={link}
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 w-8 shrink-0 rounded-lg border border-border/50 bg-white hover:bg-muted/20 hover:text-primary transition-all flex items-center justify-center text-muted-foreground self-center group-hover:scale-105"
                      title="View Details"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <div className="h-8 w-8 shrink-0 flex items-center justify-center self-center opacity-0 group-hover:opacity-40 transition-opacity">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}

                </CardContent>
              </Card>
            );
          })
        )}
      </div>

    </div>
  );
}
