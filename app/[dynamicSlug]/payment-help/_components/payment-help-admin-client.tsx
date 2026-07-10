"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  BadgeDollarSign, RefreshCw, Eye, ChevronLeft, ChevronRight,
  User, CheckCircle, XCircle, Clock, Trash2, Loader2,
  Search, X, Filter, IndianRupee, Hash,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface PaymentHelpRequest {
  id: string;
  userId: string;
  amount: number;
  utrNumber: string;
  description: string;
  status: string;
  adminNote: string | null;
  reviewedByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  userName: string | null;
  userEmail: string | null;
  userGameName: string | null;
}

const STATUS_OPTIONS = ["", "PENDING", "REVIEWED", "RESOLVED", "DISMISSED"] as const;

const STATUS_CONFIG: Record<string, { badge: string; dot: string; label: string; icon: React.FC<{className?:string}> }> = {
  PENDING: {
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
    label: "Pending",
    icon: Clock,
  },
  REVIEWED: {
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500",
    label: "Reviewed",
    icon: Eye,
  },
  RESOLVED: {
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
    label: "Resolved",
    icon: CheckCircle,
  },
  DISMISSED: {
    badge: "bg-rose-50 text-rose-700 border border-rose-200",
    dot: "bg-rose-500",
    label: "Dismissed",
    icon: XCircle,
  },
};

function StatusBadge({ status, className }: { status: string; className?: string }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <span className="text-xs text-muted-foreground font-ibm">{status}</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold font-ibm", cfg.badge, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export default function PaymentHelpAdminClient() {
  const [requests, setRequests] = useState<PaymentHelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Detail dialog
  const [selectedRequest, setSelectedRequest] = useState<PaymentHelpRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("PENDING");
  const [adminNote, setAdminNote] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/payment-help?${params}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to fetch requests");
        return;
      }
      setRequests(data.data ?? []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch {
      toast.error("Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const openDetail = (req: PaymentHelpRequest) => {
    setSelectedRequest(req);
    setNewStatus(req.status);
    setAdminNote(req.adminNote ?? "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedRequest) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/payment-help/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, adminNote: adminNote || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update request");
        return;
      }
      toast.success("Request updated. User has been notified.");
      setDialogOpen(false);
      fetchRequests();
    } catch {
      toast.error("Failed to update request");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/payment-help/${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete request");
        return;
      }
      toast.success("Request deleted");
      setDeleteDialogOpen(false);
      setDeleteId(null);
      fetchRequests();
    } catch {
      toast.error("Failed to delete request");
    } finally {
      setDeleting(false);
    }
  };

  // Client-side search filter
  const filteredRequests = searchQuery.trim()
    ? requests.filter(r =>
        r.utrNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.userName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.userEmail?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.userGameName?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : requests;

  const statusCounts = {
    PENDING: requests.filter(r => r.status === "PENDING").length,
    REVIEWED: requests.filter(r => r.status === "REVIEWED").length,
    RESOLVED: requests.filter(r => r.status === "RESOLVED").length,
    DISMISSED: requests.filter(r => r.status === "DISMISSED").length,
  };

  // Total pending amount for quick overview
  const totalPendingAmount = requests
    .filter(r => r.status === "PENDING")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="header-admin">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <BadgeDollarSign className="h-5 w-5 text-foreground" />
            <h1 className="text-2xl font-bold font-lora text-foreground">Payment Help</h1>
          </div>
          <p className="text-sm text-muted-foreground font-ibm">
            Review and manage payment help requests.{" "}
            <span className="font-semibold text-foreground">{total} total</span>
            {totalPendingAmount > 0 && (
              <span className="ml-2 text-amber-600 font-semibold">
                · ₹{totalPendingAmount.toLocaleString("en-IN")} pending
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchRequests}
          disabled={loading}
          className="font-ibm shrink-0"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"] as const).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const StatusIcon = cfg.icon;
          return (
            <button
              key={s}
              type="button"
              onClick={() => { setStatusFilter(statusFilter === s ? "" : s); setPage(1); }}
              className={cn(
                "flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 text-left cursor-pointer",
                statusFilter === s
                  ? cn(cfg.badge, "ring-2 ring-offset-1 ring-primary/20")
                  : "bg-card border-border/50 hover:border-border"
              )}
            >
              <StatusIcon className="h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{cfg.label}</p>
                <p className="text-lg font-extrabold font-ibm leading-none mt-0.5">{statusCounts[s]}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="card-settings p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by UTR, name, email, game name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 font-ibm bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="sm:hidden font-ibm gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
              {statusFilter && <span className="h-2 w-2 rounded-full bg-primary" />}
            </Button>
          </div>
          <div className="hidden sm:flex flex-wrap gap-1.5 items-center">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s || "all"}
                type="button"
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold font-ibm transition-all duration-150 border",
                  statusFilter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border/50 hover:border-border"
                )}
              >
                {s || "All"}
              </button>
            ))}
          </div>
        </div>
        {showFilters && (
          <div className="flex flex-wrap gap-1.5 mt-3 sm:hidden">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s || "all"}
                type="button"
                onClick={() => { setStatusFilter(s); setPage(1); setShowFilters(false); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold font-ibm transition-all duration-150 border",
                  statusFilter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border/50 hover:border-border"
                )}
              >
                {s || "All"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table / Cards */}
      <div className="card-list">
        {loading && requests.length === 0 ? (
          <div className="divide-y divide-border/10">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="p-4 sm:p-5 animate-pulse">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded-md w-32" />
                    <div className="h-3 bg-muted rounded-md w-44" />
                  </div>
                  <div className="h-6 bg-muted rounded-full w-20 shrink-0" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-12 bg-muted rounded-xl" />
                  <div className="h-12 bg-muted rounded-xl" />
                  <div className="h-12 bg-muted rounded-xl" />
                </div>
                <div className="flex gap-2 mt-3">
                  <div className="h-9 bg-muted rounded-xl flex-1" />
                  <div className="h-9 bg-muted rounded-xl w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : !loading && filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
              <BadgeDollarSign className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold font-ibm text-foreground">No requests found</p>
              <p className="text-xs text-muted-foreground font-ibm mt-1">
                {searchQuery || statusFilter ? "Try clearing your filters" : "No payment help requests have been submitted yet"}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Amount</th>
                    <th>UTR / Transaction ID</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div>
                          <p className="font-semibold font-ibm text-sm text-foreground">{r.userName ?? "—"}</p>
                          <p className="text-xs text-muted-foreground font-ibm">{r.userEmail ?? ""}</p>
                          {r.userGameName && (
                            <p className="text-xs text-foreground/70 font-ibm font-medium mt-0.5 flex items-center gap-1">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/40" />
                              {r.userGameName}
                            </p>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="font-bold font-ibm text-sm text-foreground">
                          ₹{r.amount.toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-xs font-semibold text-foreground bg-accent/50 px-2 py-0.5 rounded-lg border border-border/30">
                          {r.utrNumber}
                        </span>
                      </td>
                      <td>
                        <p className="text-xs font-ibm text-muted-foreground max-w-[160px] truncate" title={r.description}>
                          {r.description}
                        </p>
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td>
                        <p className="text-xs font-ibm font-medium text-muted-foreground whitespace-nowrap">
                          {format(new Date(r.createdAt), "PP")}
                        </p>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDetail(r)}
                            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                            title="View & Update"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                            onClick={() => { setDeleteId(r.id); setDeleteDialogOpen(true); }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards */}
            <div className="md:hidden divide-y divide-border/10">
              {filteredRequests.map((r) => (
                <div key={r.id} className="p-4 space-y-3.5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold font-ibm text-sm text-foreground truncate">{r.userName ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground font-ibm truncate">{r.userEmail}</p>
                      {r.userGameName && (
                        <p className="text-xs text-foreground/60 font-ibm mt-0.5">{r.userGameName}</p>
                      )}
                    </div>
                    <StatusBadge status={r.status} className="shrink-0" />
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-accent/40 rounded-xl p-3 border border-border/30">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-ibm mb-1.5 flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" /> Amount
                      </p>
                      <p className="font-bold text-foreground text-base font-ibm">₹{r.amount.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="bg-accent/40 rounded-xl p-3 border border-border/30">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-ibm mb-1.5 flex items-center gap-1">
                        <Hash className="h-3 w-3" /> UTR / TXN ID
                      </p>
                      <p className="font-mono text-xs font-bold text-foreground break-all leading-snug">{r.utrNumber}</p>
                    </div>
                  </div>

                  {/* Description */}
                  {r.description && (
                    <p className="text-xs text-muted-foreground font-ibm line-clamp-2 leading-relaxed bg-accent/20 p-2.5 rounded-lg border border-border/10">
                      {r.description}
                    </p>
                  )}

                  {/* Submitted date */}
                  <p className="text-[10px] text-muted-foreground font-ibm">
                    Submitted {format(new Date(r.createdAt), "PPp")}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 font-ibm font-semibold text-xs h-9 rounded-xl cursor-pointer"
                      onClick={() => openDetail(r)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      View & Update
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-ibm text-xs text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive h-9 w-11 rounded-xl cursor-pointer p-0"
                      onClick={() => { setDeleteId(r.id); setDeleteDialogOpen(true); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground font-ibm">
            Page <span className="font-semibold text-foreground">{page}</span> of {totalPages} · {total} requests
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="font-ibm"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="font-ibm"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Detail Dialog ─────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg w-full max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-lora flex items-center gap-2">
              <BadgeDollarSign className="h-5 w-5 text-foreground shrink-0" />
              Payment Help Details
            </DialogTitle>
            <DialogDescription className="font-ibm">
              Review this request and update its status. The user will be notified.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-1">
              {/* User */}
              <div className="card-inset rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-ibm mb-2.5">Submitted By</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent border border-border flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold font-ibm text-sm text-foreground">{selectedRequest.userName ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground font-ibm truncate">{selectedRequest.userEmail}</p>
                    {selectedRequest.userGameName && (
                      <p className="text-xs text-muted-foreground font-ibm">{selectedRequest.userGameName}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="card-inset rounded-xl p-3 flex items-start gap-3">
                  <IndianRupee className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground font-ibm font-bold uppercase tracking-wider">Amount</p>
                    <p className="font-bold font-ibm text-foreground text-xl mt-1">₹{selectedRequest.amount.toLocaleString("en-IN")}</p>
                  </div>
                </div>
                <div className="card-inset rounded-xl p-3 flex items-start gap-3">
                  <Hash className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-ibm font-bold uppercase tracking-wider">UTR / TXN ID</p>
                    <p className="font-mono text-sm font-bold text-foreground break-all mt-1">{selectedRequest.utrNumber}</p>
                  </div>
                </div>
                <div className="card-inset rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground font-ibm font-bold uppercase tracking-wider mb-1.5">Current Status</p>
                  <StatusBadge status={selectedRequest.status} />
                </div>
                <div className="card-inset rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground font-ibm font-bold uppercase tracking-wider mb-1.5">Submitted</p>
                  <p className="text-sm font-ibm text-foreground font-medium">{format(new Date(selectedRequest.createdAt), "PP")}</p>
                  <p className="text-xs text-muted-foreground font-ibm">{format(new Date(selectedRequest.createdAt), "p")}</p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-ibm">Description</p>
                <div className="bg-accent/40 rounded-xl p-4 text-sm font-ibm text-foreground leading-relaxed whitespace-pre-wrap border border-border/20 max-h-40 overflow-y-auto">
                  {selectedRequest.description}
                </div>
              </div>

              {/* Status Update */}
              <div className="space-y-4 border-t border-border/20 pt-4">
                <div className="space-y-2">
                  <Label className="font-ibm font-semibold text-sm">Update Status</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"] as const).map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setNewStatus(s)}
                          className={cn(
                            "rounded-xl px-3 py-2.5 text-xs font-semibold font-ibm border transition-all duration-150 flex items-center gap-2 cursor-pointer",
                            newStatus === s
                              ? cn(cfg.badge, "ring-2 ring-offset-1 ring-primary/20")
                              : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border bg-card"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-note-payment" className="font-ibm font-semibold text-sm">
                    Admin Note <span className="text-muted-foreground font-normal">(optional — sent to user)</span>
                  </Label>
                  <Textarea
                    id="admin-note-payment"
                    placeholder="e.g. 'Amount has been credited to your wallet'…"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    className="font-ibm text-sm resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="font-ibm">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="font-ibm">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Save & Notify User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ─────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-lora text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Request
            </DialogTitle>
            <DialogDescription className="font-ibm">
              Are you sure you want to permanently delete this payment help request? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="font-ibm">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="font-ibm">
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
