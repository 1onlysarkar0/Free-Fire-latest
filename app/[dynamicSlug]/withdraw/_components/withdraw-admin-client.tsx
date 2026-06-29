"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowUpFromLine, RefreshCw,
  CheckCircle, XCircle, Loader2, Save, Eye, EyeOff,
  User, Calendar, Check, X, ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import dynamic from "next/dynamic";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });
import { MarkdownRenderer } from "@/components/markdown-renderer";

import "@uiw/react-md-editor/markdown-editor.css";

interface WithdrawConfig {
  minWithdrawAmount: number;
  dailyWithdrawLimit: number;
  description: string;
  enabled: boolean;
}

interface WithdrawRequest {
  id: string;
  userId: string;
  amount: number;
  upiId: string;
  status: string;
  adminNote: string | null;
  refundedOnCancel: boolean;
  transactionId: string | null;
  createdAt: string;
  processedAt: string | null;
  processedByAdminId: string | null;
  userName: string | null;
  userEmail: string | null;
  userGameName: string | null;
  walletBalanceBefore: number | null;
  walletBalanceAfter: number | null;
}

// Premium color-coded Tailwind styles for statuses
const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  PENDING: {
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    dot: "bg-amber-500",
  },
  COMPLETED: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  CANCELLED: {
    badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
    dot: "bg-rose-500",
  },
};

export default function WithdrawAdminClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"requests" | "config">("requests");
  const [previewContent, setPreviewContent] = useState(false);

  // Config state
  const [config, setConfig] = useState<WithdrawConfig>({
    minWithdrawAmount: 50,
    dailyWithdrawLimit: 3,
    description: "",
    enabled: true,
  });
  const [configSaving, setConfigSaving] = useState(false);

  // Requests state
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<"complete" | "cancel">("complete");
  const [dialogRequestId, setDialogRequestId] = useState<string | null>(null);
  const [dialogReason, setDialogReason] = useState("");
  const [dialogRefund, setDialogRefund] = useState(false);

  useEffect(() => {
    loadConfig();
    loadRequests(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadConfig() {
    try {
      const res = await fetch("/api/admin/withdraw/config");
      if (!res.ok) throw new Error("Failed to load config");
      const data = await res.json();
      if (data.data) setConfig(data.data);
    } catch {
      toast.error("Failed to load config settings");
    }
  }

  async function saveConfig() {
    setConfigSaving(true);
    try {
      const res = await fetch("/api/admin/withdraw/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Withdrawal settings updated successfully.");
        router.refresh();
      } else {
        toast.error(data.error || "Failed to update configuration.");
      }
    } catch {
      toast.error("Failed to save config");
    } finally {
      setConfigSaving(false);
    }
  }

  async function loadRequests(p: number, filterOverride?: string) {
    setRequestsLoading(true);
    try {
      const activeFilter = filterOverride !== undefined ? filterOverride : statusFilter;
      const params = new URLSearchParams({ page: String(p), limit: "50" });
      if (activeFilter) params.set("status", activeFilter);
      const res = await fetch(`/api/admin/withdraw/requests?${params}`);
      if (!res.ok) throw new Error("Failed to load requests");
      const data = await res.json();
      setRequests(data.data ?? []);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setPage(p);
    } catch {
      toast.error("Failed to load requests list");
    } finally {
      setRequestsLoading(false);
    }
  }

  function handleFilterClick(s: string) {
    setStatusFilter(s);
    loadRequests(1, s);
  }

  function openDialog(id: string, action: "complete" | "cancel") {
    setDialogRequestId(id);
    setDialogAction(action);
    setDialogReason("");
    setDialogRefund(action === "cancel");
    setDialogOpen(true);
  }

  async function handleDialogConfirm() {
    if (!dialogRequestId) return;
    setProcessingId(dialogRequestId);
    setDialogOpen(false);
    try {
      const res = await fetch(`/api/admin/withdraw/requests/${dialogRequestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: dialogAction,
          adminNote: dialogReason.trim() || undefined,
          refundOnCancel: dialogRefund,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        await loadRequests(page);
        router.refresh();
      } else {
        toast.error(data.error || "Failed to process");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setProcessingId(null);
      setDialogRequestId(null);
    }
  }

  // Calculate metrics based on currently loaded requests for immediate feedback
  const pendingCount = requests.filter(r => r.status === "PENDING").length;
  const completedCount = requests.filter(r => r.status === "COMPLETED").length;
  const cancelledCount = requests.filter(r => r.status === "CANCELLED").length;

  return (
    <div className="w-full min-w-0 space-y-6 animate-in fade-in duration-200">
      
      {/* Header Section */}
      <div className="header-admin">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <ArrowUpFromLine className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Withdrawals</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Process withdrawal requests and configure minimum limits or daily caps.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!config.enabled && (
            <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">
              <ShieldAlert className="h-3.5 w-3.5" />
              System Offline
            </div>
          )}
        </div>
      </div>

      {/* Tab Selection */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "requests" | "config")} className="w-full space-y-6">
        <TabsList className="flex h-auto w-full items-center justify-start rounded-xl bg-accent/40 p-1 md:w-auto border border-border/20">
          <TabsTrigger value="requests" className="rounded-lg px-4 py-2 text-sm font-semibold transition-all">
            Requests Queue
          </TabsTrigger>
          <TabsTrigger value="config" className="rounded-lg px-4 py-2 text-sm font-semibold transition-all">
            System Settings
          </TabsTrigger>
        </TabsList>

        {/* Tab Content: Requests Queue */}
        <TabsContent value="requests" className="outline-none space-y-6">
          
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="card-widget">
              <CardContent className="p-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xl font-semibold tracking-tight text-foreground">{requests.length}</div>
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-1">Queue Total</div>
                </div>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                  <ArrowUpFromLine className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-widget">
              <CardContent className="p-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xl font-semibold tracking-tight text-amber-500">{pendingCount}</div>
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-1">Pending</div>
                </div>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-widget">
              <CardContent className="p-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xl font-semibold tracking-tight text-emerald-500">{completedCount}</div>
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-1">Completed</div>
                </div>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-500">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-widget">
              <CardContent className="p-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xl font-semibold tracking-tight text-rose-500">{cancelledCount}</div>
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-1">Cancelled</div>
                </div>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-rose-500/10 text-rose-500">
                  <XCircle className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Queue Table Card */}
          <Card className="card-list">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-border/10 bg-accent/20">
                
                {/* Dynamic Filters Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: "All requests", value: "" },
                    { label: "Pending", value: "PENDING" },
                    { label: "Completed", value: "COMPLETED" },
                    { label: "Cancelled", value: "CANCELLED" },
                  ].map((filter) => (
                    <Button
                      key={filter.value}
                      variant={statusFilter === filter.value ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleFilterClick(filter.value)}
                      className={`h-9 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                        statusFilter === filter.value
                          ? "shadow-sm bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                      }`}
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl border border-border/20 bg-background/50 hover:bg-accent px-4 text-xs font-semibold inline-flex items-center gap-2 self-end sm:self-center"
                  onClick={() => loadRequests(page)}
                  disabled={requestsLoading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${requestsLoading ? "animate-spin text-primary" : ""}`} />
                  Refresh List
                </Button>
              </div>

              {/* Table Skeletons if loading */}
              {requestsLoading ? (
                <div className="divide-y divide-border/20">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-6 flex items-center justify-between gap-4 animate-pulse">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 rounded-full bg-accent shrink-0" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 w-1/3 bg-accent rounded" />
                          <div className="h-3 w-1/4 bg-accent rounded" />
                        </div>
                      </div>
                      <div className="h-4 w-16 bg-accent rounded shrink-0" />
                      <div className="h-6 w-20 bg-accent rounded-full shrink-0" />
                      <div className="h-8 w-24 bg-accent rounded-lg shrink-0" />
                    </div>
                  ))}
                </div>
              ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center">
                  <div className="rounded-2xl bg-accent/20 p-4 mb-4 border border-border/10">
                    <ArrowUpFromLine className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-bold text-foreground">No withdrawal requests</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                    {statusFilter 
                      ? `There are no requests matching "${statusFilter.toLowerCase()}" in the queue.` 
                      : "No user has requested a withdrawal payout yet."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile & Tablet Card Layout */}
                  <div className="xl:hidden divide-y divide-border/20">
                    {requests.map((r) => {
                      const style = STATUS_STYLES[r.status] || { badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };
                      return (
                        <div key={r.id} className="p-4 hover:bg-accent/15 transition-colors">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-foreground truncate">{r.userName || "Username —"}</p>
                                <p className="text-xs text-muted-foreground truncate">{r.userEmail || r.userId}</p>
                              </div>
                            </div>

                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${style.badge} shrink-0`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                              {r.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm mt-4 bg-accent/10 border border-border/10 rounded-xl p-3.5">
                            <div>
                              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">UPI ID Address</p>
                              <code className="font-mono text-xs text-foreground bg-background border border-border/40 rounded px-1.5 py-0.5 select-all truncate block">{r.upiId}</code>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Payout Amount</p>
                              <p className="font-bold text-sm text-foreground">₹{r.amount}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Balance Ledger Details</p>
                              {r.walletBalanceBefore !== null ? (
                                <div className="flex items-center gap-3 text-xs flex-wrap">
                                  <span className="text-muted-foreground">Before: <span className="font-medium text-foreground">₹{r.walletBalanceBefore}</span></span>
                                  <span className="text-muted-foreground">After: <span className="font-medium text-foreground">₹{r.walletBalanceAfter ?? "—"}</span></span>
                                  {r.status === "CANCELLED" && r.refundedOnCancel ? (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-semibold text-[10px]">
                                      Refunded +₹{r.amount}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 font-semibold text-[10px]">
                                      Deducted -₹{r.amount}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Requested Date</p>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(r.createdAt), "dd MMM yyyy")}
                              </div>
                            </div>
                            {r.processedAt && (
                              <div>
                                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Processed On</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(r.processedAt), "dd MMM, h:mm a")}
                                </p>
                              </div>
                            )}
                          </div>

                          {r.adminNote && (
                            <div className="mt-3 text-xs bg-background/50 rounded-xl p-3 border border-border/10">
                              <span className="font-semibold text-foreground">Admin Note:</span> <span className="text-muted-foreground italic">{r.adminNote}</span>
                            </div>
                          )}

                          {r.status === "PENDING" && (
                            <div className="mt-4 flex gap-2 w-full">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-10 rounded-xl border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/10 text-xs font-semibold flex-1"
                                disabled={processingId === r.id}
                                onClick={() => openDialog(r.id, "complete")}
                              >
                                {processingId === r.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="mr-1 h-3.5 w-3.5" />
                                    Approve Payout
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-10 rounded-xl border-rose-500/20 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/10 text-xs font-semibold flex-1"
                                disabled={processingId === r.id}
                                onClick={() => openDialog(r.id, "cancel")}
                              >
                                {processingId === r.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <X className="mr-1 h-3.5 w-3.5" />
                                    Reject Request
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden xl:block overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-accent/40 border-b border-border/10">
                        <tr>
                          <th className="text-left px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Request Details</th>
                          <th className="text-left px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">UPI ID</th>
                          <th className="text-right px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Amount</th>
                          <th className="text-right px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Wallet Ledger</th>
                          <th className="text-left px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Status / Logs</th>
                          <th className="text-left px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Requested</th>
                          <th className="text-right px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/10">
                        {requests.map((r) => {
                          const style = STATUS_STYLES[r.status] || { badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };
                          return (
                            <tr key={r.id} className="hover:bg-accent/10 transition-colors group">
                              
                              {/* Request user details */}
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                    <User className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-sm text-foreground truncate">{r.userName || "—"}</p>
                                    <p className="text-xs text-muted-foreground truncate">{r.userEmail || r.userId}</p>
                                  </div>
                                </div>
                              </td>

                              {/* UPI ID */}
                              <td className="px-5 py-4">
                                <code className="text-xs bg-accent/40 border border-border/40 rounded-lg px-2.5 py-1 font-mono select-all text-foreground">
                                  {r.upiId}
                                </code>
                              </td>

                              {/* Amount */}
                              <td className="px-5 py-4 text-right">
                                <span className="font-bold text-base text-foreground">₹{r.amount}</span>
                              </td>

                              {/* Balance details */}
                              <td className="px-5 py-4 text-right">
                                {r.walletBalanceBefore !== null ? (
                                  <div className="text-xs space-y-0.5 inline-block text-right">
                                    <span className="block text-muted-foreground">Before: <span className="font-medium text-foreground">₹{r.walletBalanceBefore}</span></span>
                                    <span className="block text-muted-foreground">After: <span className="font-medium text-foreground">₹{r.walletBalanceAfter ?? "—"}</span></span>
                                    {r.status === "CANCELLED" && r.refundedOnCancel ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-semibold text-[10px] mt-1">
                                        Refunded +₹{r.amount}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 font-semibold text-[10px] mt-1">
                                        Deducted -₹{r.amount}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>

                              {/* Status Badge */}
                              <td className="px-5 py-4">
                                <div className="space-y-1">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.badge}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                                    {r.status}
                                  </span>
                                  {r.adminNote && (
                                    <p className="text-xs text-muted-foreground italic max-w-[200px] truncate block" title={r.adminNote}>
                                      Note: {r.adminNote}
                                    </p>
                                  )}
                                </div>
                              </td>

                              {/* Dates */}
                              <td className="px-5 py-4 text-xs text-muted-foreground">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                                    {format(new Date(r.createdAt), "dd MMM yyyy, h:mm a")}
                                  </div>
                                  {r.processedAt && (
                                    <span className="block text-[11px] font-medium text-muted-foreground/80">
                                      Processed: {format(new Date(r.processedAt), "dd MMM, h:mm a")}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="px-5 py-4 text-right">
                                {r.status === "PENDING" ? (
                                  <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 rounded-lg border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/10 text-xs font-semibold"
                                      disabled={processingId === r.id}
                                      onClick={() => openDialog(r.id, "complete")}
                                    >
                                      {processingId === r.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin text-emerald-500 bg-transparent" />
                                      ) : (
                                        <Check className="h-3.5 w-3.5 mr-0.5" />
                                      )}
                                      Approve
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 rounded-lg border-rose-500/20 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/10 text-xs font-semibold"
                                      disabled={processingId === r.id}
                                      onClick={() => openDialog(r.id, "cancel")}
                                    >
                                      {processingId === r.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin text-rose-500 bg-transparent" />
                                      ) : (
                                        <X className="h-3.5 w-3.5 mr-0.5" />
                                      )}
                                      Reject
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-border/10 bg-accent/10">
                  <span className="text-xs text-muted-foreground font-semibold">Page {page} of {totalPages}</span>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" disabled={requestsLoading || page <= 1} onClick={() => loadRequests(page - 1)} className="flex-1 sm:flex-none h-9 rounded-lg">Previous</Button>
                    <Button variant="outline" size="sm" disabled={requestsLoading || page >= totalPages} onClick={() => loadRequests(page + 1)} className="flex-1 sm:flex-none h-9 rounded-lg">Next</Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Tab Content: System Settings */}
          <TabsContent value="config" className="outline-none">
            <Card className="card-settings">
              <div className="p-4 md:p-6 space-y-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/20 pb-6">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Withdrawal Policies</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure withdrawal rules, minimum wallet payouts, and user information pages.
                    </p>
                  </div>
                  <Button onClick={saveConfig} disabled={configSaving} className="gap-2 h-10 w-full sm:w-auto rounded-xl">
                    {configSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {configSaving ? "Saving Config..." : "Save Policies"}
                  </Button>
                </div>

                <div className="space-y-6 max-w-xl">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">Minimum Withdrawal Amount (₹)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={config.minWithdrawAmount}
                      onChange={(e) => setConfig({ ...config, minWithdrawAmount: parseInt(e.target.value) || 50 })}
                      className="h-10 text-base rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">The threshold balance required for users to create a payout request.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">Daily Withdrawal Request Cap</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={config.dailyWithdrawLimit}
                      onChange={(e) => setConfig({ ...config, dailyWithdrawLimit: parseInt(e.target.value) || 3 })}
                      className="h-10 text-base rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">Maximum pending withdrawal requests a user is allowed to keep active concurrently.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-accent/20 border border-border/20">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Enable Payout System</p>
                      <p className="text-xs text-muted-foreground">When deactivated, withdrawal fields are locked for all users.</p>
                    </div>
                    <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
                  </div>
                </div>

                {/* Markdown Editor */}
                <div className="space-y-4 pt-6 border-t border-border/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground">Informational Guidelines</h4>
                      <p className="text-xs text-muted-foreground">Explain the payout timelines and bank details requirement.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewContent(!previewContent)}
                      className="gap-2 h-10 w-full sm:w-auto rounded-xl"
                    >
                      {previewContent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {previewContent ? "Write Policy" : "Preview Layout"}
                    </Button>
                  </div>
                  
                  {previewContent ? (
                    <div className="min-h-[300px] bg-background rounded-2xl border border-border/30 p-6">
                      <MarkdownRenderer content={config.description} />
                    </div>
                  ) : (
                    <div data-color-mode="light" className="rounded-xl overflow-hidden border border-border/30">
                      <MDEditor
                        value={config.description}
                        onChange={(v) => setConfig({ ...config, description: v || "" })}
                        height={320}
                        preview="edit"
                      />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md border border-border/30 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {dialogAction === "complete" ? "Approve & Complete" : "Reject & Cancel"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {dialogAction === "complete"
                ? "Verify that you have processed this UPI payout. This action updates the request status to completed."
                : "This cancels the withdrawal request. You can optionally refund the deducted coins to the user's wallet."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {dialogAction === "cancel" && (
              <div className="flex items-center justify-between rounded-2xl bg-rose-500/5 p-4 border border-rose-500/10">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-rose-600 dark:text-rose-400">Refund Wallet Coins</p>
                  <p className="text-xs text-muted-foreground">Return the payout amount to the user&apos;s balance.</p>
                </div>
                <Switch checked={dialogRefund} onCheckedChange={setDialogRefund} />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">
                Internal / User Note <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                placeholder={dialogAction === "complete" ? "UTR transaction reference, bank status note..." : "Reason for rejection (e.g. invalid UPI address)..."}
                value={dialogReason}
                onChange={(e) => setDialogReason(e.target.value)}
                className="min-h-24 resize-none rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                This message will be appended to the user&apos;s wallet transaction details.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-border/20 pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-xl h-10 px-4"
            >
              Go Back
            </Button>
            <Button
              onClick={handleDialogConfirm}
              disabled={processingId === dialogRequestId}
              className={`rounded-xl h-10 px-4 ${
                dialogAction === "cancel"
                  ? "bg-rose-600 hover:bg-rose-500 text-white"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              {processingId === dialogRequestId ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin text-white bg-transparent" />
              ) : dialogAction === "cancel" ? (
                <XCircle className="mr-1.5 h-4 w-4" />
              ) : (
                <CheckCircle className="mr-1.5 h-4 w-4" />
              )}
              {dialogAction === "cancel"
                ? (dialogRefund ? "Reject & Refund" : "Reject Request Only")
                : "Approve Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
