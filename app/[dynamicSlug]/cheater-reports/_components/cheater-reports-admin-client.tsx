"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  AlertTriangle, RefreshCw, Eye, ChevronLeft, ChevronRight,
  User, Trophy, CheckCircle, XCircle, Clock, Search, Trash2,
  ShieldAlert, Calendar, Loader2,
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

interface CheaterReport {
  id: string;
  userId: string;
  reportedUid: string;
  reportedAt: string;
  tournamentId: string | null;
  description: string;
  status: string;
  adminNote: string | null;
  reviewedByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  userName: string | null;
  userEmail: string | null;
  userGameName: string | null;
  userUid: string | null;
  tournamentName: string | null;
  tournamentMode: string | null;
  tournamentFormat: string | null;
}

const STATUS_OPTIONS = ["", "PENDING", "REVIEWED", "RESOLVED", "DISMISSED"] as const;

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  PENDING: {
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  REVIEWED: {
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500",
  },
  RESOLVED: {
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  DISMISSED: {
    badge: "bg-rose-50 text-rose-700 border border-rose-200",
    dot: "bg-rose-500",
  },
};

export default function CheaterReportsAdminClient() {
  const [reports, setReports] = useState<CheaterReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Detail dialog
  const [selectedReport, setSelectedReport] = useState<CheaterReport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("PENDING");
  const [adminNote, setAdminNote] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/cheater-reports?${params}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to fetch reports");
        return;
      }
      setReports(data.data ?? []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch {
      toast.error("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const openDetail = (report: CheaterReport) => {
    setSelectedReport(report);
    setNewStatus(report.status);
    setAdminNote(report.adminNote ?? "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedReport) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/cheater-reports/${selectedReport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, adminNote: adminNote || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update report");
        return;
      }
      toast.success("Report updated. User has been notified.");
      setDialogOpen(false);
      fetchReports();
    } catch {
      toast.error("Failed to update report");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/cheater-reports/${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete report");
        return;
      }
      toast.success("Report deleted");
      setDeleteDialogOpen(false);
      setDeleteId(null);
      fetchReports();
    } catch {
      toast.error("Failed to delete report");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="header-admin">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h1 className="text-2xl font-bold font-lora text-foreground">Cheater Reports</h1>
          </div>
          <p className="text-sm text-muted-foreground font-ibm">
            Review and manage cheater reports submitted by users. Total: {total}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchReports}
          disabled={loading}
          className="font-ibm shrink-0"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="card-settings p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-semibold font-ibm text-foreground">Filter by status:</span>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold font-ibm transition-all duration-150 border",
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border/40 hover:border-primary/30"
              )}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card-list">
        {loading && reports.length === 0 ? (
          <>
            {/* Desktop Skeleton */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Reporter</th>
                    <th>Reported UID</th>
                    <th>Incident</th>
                    <th>Tournament</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td>
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded-md w-28" />
                          <div className="h-3 bg-muted rounded-md w-36" />
                        </div>
                      </td>
                      <td><div className="h-5 bg-muted rounded-md w-24 font-mono" /></td>
                      <td><div className="h-4 bg-muted rounded-md w-32" /></td>
                      <td>
                        <div className="space-y-1">
                          <div className="h-4 bg-muted rounded-md w-24" />
                          <div className="h-3 bg-muted rounded-md w-16" />
                        </div>
                      </td>
                      <td><div className="h-6 bg-muted rounded-full w-20" /></td>
                      <td><div className="h-4 bg-muted rounded-md w-16" /></td>
                      <td><div className="h-8 bg-muted rounded-md w-14" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Skeleton */}
            <div className="md:hidden divide-y divide-border/10">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="p-4 space-y-3 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 bg-muted rounded-md w-28" />
                      <div className="h-3 bg-muted rounded-md w-36" />
                    </div>
                    <div className="h-6 bg-muted rounded-full w-20" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="h-3 bg-muted rounded-md w-16 mb-1" />
                      <div className="h-4 bg-muted rounded-md w-24" />
                    </div>
                    <div>
                      <div className="h-3 bg-muted rounded-md w-16 mb-1" />
                      <div className="h-4 bg-muted rounded-md w-20" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-9 bg-muted rounded-xl flex-1" />
                    <div className="h-9 bg-muted rounded-xl w-12" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : !loading && reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <ShieldAlert className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground font-ibm font-semibold">No reports found</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Reporter</th>
                    <th>Reported UID</th>
                    <th>Incident</th>
                    <th>Tournament</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div>
                          <p className="font-semibold font-ibm text-sm text-foreground">{r.userName ?? "—"}</p>
                          <p className="text-xs text-muted-foreground font-ibm">{r.userEmail ?? ""}</p>
                          {r.userGameName && (
                            <p className="text-xs text-primary font-ibm font-medium mt-0.5">🎮 {r.userGameName}</p>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-sm font-bold text-foreground bg-accent/50 px-2 py-0.5 rounded-lg border border-border/20">{r.reportedUid}</span>
                      </td>
                      <td>
                        <p className="text-xs font-ibm font-medium text-foreground">
                          {format(new Date(r.reportedAt), "PPp")}
                        </p>
                      </td>
                      <td>
                        {r.tournamentName ? (
                          <div className="max-w-[200px]">
                            <p className="text-xs font-ibm font-semibold text-foreground truncate">{r.tournamentName}</p>
                            <p className="text-[10px] text-muted-foreground font-ibm font-bold mt-0.5 uppercase tracking-wider">
                              {r.tournamentMode?.replace("_", " ")} · {r.tournamentFormat}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50 font-ibm italic">— None —</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold font-ibm shadow-2xs",
                            STATUS_STYLES[r.status]?.badge
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_STYLES[r.status]?.dot)} />
                          {r.status}
                        </span>
                      </td>
                      <td>
                        <p className="text-xs font-ibm font-semibold text-muted-foreground whitespace-nowrap">
                          {format(new Date(r.createdAt), "PP")}
                        </p>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDetail(r)}
                            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            title="View & Update"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                            onClick={() => {
                              setDeleteId(r.id);
                              setDeleteDialogOpen(true);
                            }}
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

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border/10">
              {reports.map((r) => (
                <div key={r.id} className="p-4 space-y-3.5 hover:bg-accent/5 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold font-ibm text-sm text-foreground">{r.userName ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground font-ibm">{r.userEmail}</p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold font-ibm shrink-0 shadow-2xs",
                        STATUS_STYLES[r.status]?.badge
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_STYLES[r.status]?.dot)} />
                      {r.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs font-ibm">
                    <div>
                      <p className="text-muted-foreground font-medium mb-0.5">Reported UID</p>
                      <p className="font-mono font-bold text-foreground bg-accent/50 px-2 py-0.5 rounded-md border border-border/20 w-fit">{r.reportedUid}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium mb-0.5">Incident</p>
                      <p className="text-foreground font-bold">{format(new Date(r.reportedAt), "PP")}</p>
                    </div>
                    {r.tournamentName && (
                      <div className="col-span-2 border-t border-border/10 pt-2">
                        <p className="text-muted-foreground font-medium mb-0.5">Tournament</p>
                        <p className="text-foreground font-bold flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5 text-primary shrink-0" />
                          {r.tournamentName}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2.5 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 font-ibm font-bold text-xs h-9 rounded-xl cursor-pointer hover:bg-accent/40" onClick={() => openDetail(r)}>
                      <Eye className="h-4 w-4 mr-1.5" /> View & Update
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-ibm font-bold text-xs text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive h-9 rounded-xl cursor-pointer"
                      onClick={() => {
                        setDeleteId(r.id);
                        setDeleteDialogOpen(true);
                      }}
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground font-ibm">
            Page {page} of {totalPages} · {total} reports
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

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-lora flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cheater Report Details
            </DialogTitle>
            <DialogDescription className="font-ibm">
              Review this report and update its status. The user will be notified of any changes.
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-5 py-2">
              {/* Reporter Info */}
              <div className="card-inset rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ibm">Reporter</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold font-ibm text-sm text-foreground">{selectedReport.userName ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground font-ibm">{selectedReport.userEmail}</p>
                    {selectedReport.userGameName && (
                      <p className="text-xs text-muted-foreground font-ibm">Game: {selectedReport.userGameName}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Report Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card-inset rounded-xl p-3">
                  <p className="text-xs text-muted-foreground font-ibm mb-1">Reported UID</p>
                  <p className="font-mono font-bold text-foreground">{selectedReport.reportedUid}</p>
                </div>
                <div className="card-inset rounded-xl p-3">
                  <p className="text-xs text-muted-foreground font-ibm mb-1">Incident Time</p>
                  <p className="text-sm font-ibm text-foreground">{format(new Date(selectedReport.reportedAt), "PPp")}</p>
                </div>
              </div>

              {selectedReport.tournamentName && (
                <div className="card-inset rounded-xl p-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground font-ibm">Tournament</p>
                    <p className="text-sm font-ibm font-medium text-foreground">{selectedReport.tournamentName}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ibm">Description</p>
                <div className="bg-accent/40 rounded-xl p-4 text-sm font-ibm text-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedReport.description}
                </div>
              </div>

              {/* Status Update */}
              <div className="space-y-3 border-t border-border/10 pt-4">
                <div className="space-y-2">
                  <Label className="font-ibm font-semibold text-sm">Update Status</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewStatus(s)}
                        className={cn(
                          "rounded-xl px-3 py-2 text-xs font-semibold font-ibm border transition-all duration-150",
                          newStatus === s
                            ? cn(STATUS_STYLES[s]?.badge, "ring-2 ring-offset-1 ring-primary/30")
                            : "border-border/40 text-foreground hover:border-primary/30 bg-card"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-note-cheater" className="font-ibm font-semibold text-sm">
                    Admin Note <span className="text-muted-foreground font-normal">(optional — sent to user)</span>
                  </Label>
                  <Textarea
                    id="admin-note-cheater"
                    placeholder="Add a note for the user…"
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

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
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

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-lora text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Report
            </DialogTitle>
            <DialogDescription className="font-ibm">
              Are you sure you want to permanently delete this report? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="font-ibm">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="font-ibm"
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
