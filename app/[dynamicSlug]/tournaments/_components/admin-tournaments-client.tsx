"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Trophy,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Trash,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_COLORS: Record<string, string> = {
  UPCOMING:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200",
  ACTIVE: "bg-success/20 text-success border-success/20",
  ROOM_REVEALED: "bg-primary/20 text-primary/90 border-primary/20",
  LIVE: "bg-success/20 text-success border-success/20",
  FINISHED: "bg-muted text-muted-foreground border-border",
  COMPLETED:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200",
  CANCELLED:
    "bg-red-100 text-destructive dark:bg-red-900/30 border-destructive/20",
};

export interface Tournament {
  id: string;
  name: string;
  type: string;
  joiningFee: number;
  prizePool: number;
  gameMode: string;
  teamFormat: string;
  totalSlots: number;
  bookedSlots: number;
  startTime: string | Date;
  status: string;
  maps: string[];
}

interface AdminTournamentsClientProps {
  dynamicSlug: string;
  initialData: Tournament[];
  initialDeletedCount: number;
}

export default function AdminTournamentsClient({
  dynamicSlug,
  initialData,
  initialDeletedCount,
}: AdminTournamentsClientProps) {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>(initialData);
  const [deletedCount, setDeletedCount] = useState(initialDeletedCount);
  const [showCleanup, setShowCleanup] = useState(false);
  const [cleanupTournaments, setCleanupTournaments] = useState<Tournament[]>(
    []
  );
  const [loadingCleanup, setLoadingCleanup] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tournaments");
      const data = await res.json();
      setTournaments(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return tournaments.filter((t) => {
      const matchesSearch = t.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tournaments, search, statusFilter]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${deleteId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Tournament deleted");
        setDeletedCount((prev) => prev + 1);
        setDeleteId(null);
        router.refresh();
        load();
      } else {
        toast.error(data.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete tournament");
    } finally {
      setDeleting(false);
    }
  }

  async function loadCleanup() {
    setLoadingCleanup(true);
    try {
      const res = await fetch("/api/admin/tournaments/cleanup");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setCleanupTournaments(Array.isArray(data) ? data : []);
      setSelectedIds([]);
    } catch {
      toast.error("Failed to load old tournaments");
    } finally {
      setLoadingCleanup(false);
    }
  }

  const openCleanup = () => {
    setShowCleanup(true);
    loadCleanup();
  };

  async function handleCleanup() {
    if (selectedIds.length === 0) return;
    setCleaningUp(true);
    try {
      const res = await fetch("/api/admin/tournaments/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Deleted ${data.count} old tournaments successfully`);
        setDeletedCount((prev) => prev + data.count);
        setShowCleanup(false);
        router.refresh();
        load();
      } else {
        toast.error(data.error || "Failed to cleanup");
      }
    } catch {
      toast.error("Failed to cleanup tournaments");
    } finally {
      setCleaningUp(false);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-4 pb-8 sm:space-y-6">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="px-3 pb-4 pt-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:h-10 sm:w-10">
                <Trophy className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-foreground sm:text-lg">
                  Tournaments
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {tournaments.length} active · {tournaments.length + deletedCount}{" "}
                  total created
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={openCleanup}
                className="h-10 gap-2"
              >
                <Trash className="h-4 w-4" />
                <span className="hidden sm:inline">Cleanup Old</span>
                <span className="sm:hidden">Cleanup</span>
              </Button>
              <Link href={`/${dynamicSlug}/tournaments/new`} prefetch={true}>
                <Button className="h-10 gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Tournament</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                placeholder="Search tournaments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-full sm:w-44">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="UPCOMING">Upcoming</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ROOM_REVEALED">Room Revealed</SelectItem>
                <SelectItem value="LIVE">Live</SelectItem>
                <SelectItem value="FINISHED">Finished</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 sm:px-4 md:px-6 lg:px-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-border bg-card p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-muted sm:w-48" />
                    <div className="h-3 w-48 rounded bg-muted/60 sm:w-64" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
            <Trophy className="mb-4 h-6 w-6 text-muted-foreground/50" />
            <h4 className="text-sm font-semibold text-foreground sm:text-base">
              No tournaments found
            </h4>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Create your first tournament to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Desktop Table Header */}
            <div className="hidden rounded-t-2xl border border-b-0 border-border bg-muted/40 px-4 py-2 sm:grid sm:grid-cols-[1fr,120px,140px,120px,140px,80px] sm:items-center">
              <span className="text-xs font-medium text-muted-foreground">
                Tournament
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                Status
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                Slots
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                Fee / Prize
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                Start Time
              </span>
              <span className="text-right text-xs font-medium text-muted-foreground">
                Actions
              </span>
            </div>

            {filtered.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md sm:grid sm:grid-cols-[1fr,120px,140px,120px,140px,80px] sm:items-center sm:gap-4 sm:rounded-none sm:border-t-0 sm:p-4 sm:shadow-none sm:first:rounded-t-none sm:last:rounded-b-2xl sm:hover:shadow-none"
              >
                {/* Tournament Name */}
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:h-9 sm:w-9">
                    <Trophy className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
                      {t.name}
                    </h3>
                    <p className="truncate text-xs text-muted-foreground sm:text-sm">
                      {t.gameMode.replace(/_/g, " ")} · {t.teamFormat}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between sm:justify-start">
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium sm:px-2.5 sm:text-xs ${STATUS_COLORS[t.status] ??
                      "bg-muted text-muted-foreground"
                      }`}
                  >
                    {t.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Slots */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {t.bookedSlots}/{t.totalSlots}{" "}
                    {t.teamFormat === "solo" ? "slots" : "teams"}
                  </span>
                </div>

                {/* Fee / Prize - desktop */}
                <div className="hidden text-xs text-muted-foreground sm:block">
                  {t.type === "FREE" ? (
                    <span className="text-success font-medium">FREE</span>
                  ) : (
                    <span>{t.joiningFee}c</span>
                  )}
                  {t.prizePool > 0 && (
                    <span className="ml-1 text-primary font-medium">
                      → {t.prizePool}c
                    </span>
                  )}
                </div>

                {/* Start Time - desktop */}
                <div className="hidden text-xs text-muted-foreground sm:block">
                  {format(new Date(t.startTime), "dd MMM yyyy, h:mm a")}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 border-t border-border pt-3 sm:justify-end sm:border-0 sm:pt-0">
                  <span className="text-[11px] text-muted-foreground sm:hidden">
                    {format(new Date(t.startTime), "dd MMM")}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/${dynamicSlug}/tournaments/${t.id}`}
                          prefetch={true}
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Manage
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(t.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Alert */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-sm rounded-2xl sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tournament?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the tournament and all its slots and
              participants. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="h-10 w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="h-10 w-full bg-destructive hover:bg-destructive sm:w-auto"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cleanup Dialog */}
      <Dialog open={showCleanup} onOpenChange={setShowCleanup}>
        <DialogContent className="flex max-h-[85vh] w-[calc(100vw-1.5rem)] max-w-2xl flex-col rounded-2xl p-0 sm:w-full">
          <DialogHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Trash className="h-5 w-5 text-destructive" />
              <span>Cleanup Old Tournaments</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Select tournaments started more than 24 hours ago to delete them.
            </DialogDescription>
          </DialogHeader>

          {loadingCleanup ? (
            <div className="flex flex-1 items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : cleanupTournaments.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <Trophy className="mb-2 h-10 w-10 animate-pulse text-foreground opacity-50" />
              <p className="text-sm font-medium">No old tournaments found</p>
              <p className="mt-1 text-xs text-muted-foreground/80">
                All tournaments are newer than 24 hours.
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden px-4 sm:px-6">
              {/* Select All */}
              <div className="flex items-center justify-between border-b pb-2 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="select-all-cleanup"
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 bg-background text-primary focus:ring-primary"
                    checked={
                      cleanupTournaments.length > 0 &&
                      selectedIds.length === cleanupTournaments.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(cleanupTournaments.map((t) => t.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                  <label
                    htmlFor="select-all-cleanup"
                    className="cursor-pointer select-none text-xs font-bold uppercase tracking-wider text-foreground"
                  >
                    Select All ({cleanupTournaments.length})
                  </label>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">
                  {selectedIds.length} selected
                </span>
              </div>

              {/* Tournament List */}
              <div className="flex-1 space-y-2 overflow-y-auto py-2 pr-1">
                {cleanupTournaments.map((t) => {
                  const isSelected = selectedIds.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedIds((prev) =>
                          prev.includes(t.id)
                            ? prev.filter((id) => id !== t.id)
                            : [...prev, t.id]
                        );
                      }}
                      className={`flex cursor-pointer select-none items-start gap-3 rounded-xl border p-3 transition-all ${isSelected
                          ? "border-primary/45 bg-primary/5"
                          : "border-border/80 bg-background/40 hover:bg-accent/20"
                        }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary"
                        checked={isSelected}
                        readOnly
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="truncate text-sm font-semibold text-foreground">
                            {t.name}
                          </h4>
                          <span
                            className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[t.status] ??
                              "bg-muted text-muted-foreground"
                              }`}
                          >
                            {t.status}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-xs font-medium text-muted-foreground">
                          <span className="capitalize">
                            {t.gameMode.replace(/_/g, " ")} · {t.teamFormat}
                          </span>
                          <span>
                            Starts:{" "}
                            {format(
                              new Date(t.startTime),
                              "dd MMM, h:mm a"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 border-t p-4 pt-4 sm:p-6 sm:pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCleanup(false)}
              className="h-10 w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCleanup}
              disabled={selectedIds.length === 0 || cleaningUp}
              className="h-10 w-full sm:w-auto"
            >
              {cleaningUp ? "Deleting..." : `Delete Selected (${selectedIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}