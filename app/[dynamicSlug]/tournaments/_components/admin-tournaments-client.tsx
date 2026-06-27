"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Trophy, Plus, Search, Filter, MoreHorizontal, Pencil, Trash2,
  Users, Trash, Loader2,
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
import { Muted } from "@/components/ui/typography";
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
  UPCOMING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200",
  ACTIVE: "bg-success/20 text-success border-success/20",
  ROOM_REVEALED: "bg-primary/20 text-primary/90 border-primary/20",
  LIVE: "bg-success/20 text-success border-success/20",
  FINISHED: "bg-muted text-muted-foreground border-border",
  COMPLETED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200",
  CANCELLED: "bg-red-100 text-destructive dark:bg-red-900/30 border-destructive/20",
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
  const [cleanupTournaments, setCleanupTournaments] = useState<Tournament[]>([]);
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

  const filtered = tournaments.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${deleteId}`, { method: "DELETE" });
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
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="header-admin">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Tournaments</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{tournaments.length} active · {tournaments.length + deletedCount} total created</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openCleanup}>
            <Trash className="h-4 w-4 mr-1.5" />Cleanup Old
          </Button>
          <Link href={`/${dynamicSlug}/tournaments/new`} prefetch={true}>
            <Button><Plus className="h-4 w-4" />New Tournament</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search tournaments..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
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

      {loading ? (
        <div className="card-list">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Tournament","Status","Slots","Fee / Prize","Start Time",""].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {[1,2,3].map(i => (
                  <tr key={i} className="animate-pulse">
                    {[1,2,3,4,5,6].map(j => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-16 rounded bg-accent/60" /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center bg-background px-6 py-10 text-center rounded-2xl border">
          <Trophy className="mb-4 h-6 w-6 text-foreground" />
          <h4 className="text-sm font-semibold text-foreground">No tournaments found</h4>
          <Muted className="mt-1 text-sm">Create your first tournament to get started.</Muted>
        </div>
      ) : (
        <Card className="card-list">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th>Tournament</th>
                  <th>Status</th>
                  <th>Slots</th>
                  <th className="hidden md:table-cell">Fee / Prize</th>
                  <th className="hidden lg:table-cell">Start Time</th>
                  <th className="w-16 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="font-medium text-sm text-foreground">{t.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                        {t.gameMode.replace(/_/g, " ")} · {t.teamFormat}
                      </div>
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[t.status] ?? "bg-muted text-muted-foreground"}`}>
                        {t.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-col gap-0.5 text-muted-foreground text-xs font-medium">
                        <div className="flex items-center gap-1 text-foreground text-sm font-semibold">
                          <Users className="h-3.5 w-3.5" />
                          <span>{t.bookedSlots}/{t.totalSlots} {t.teamFormat === "solo" ? "Slots" : "Teams"}</span>
                        </div>
                        {t.teamFormat !== "solo" && (
                          <span className="text-[10px] text-muted-foreground pl-[18px]">
                            ({t.bookedSlots * (t.teamFormat === "squad" ? 4 : 2)}/{t.totalSlots * (t.teamFormat === "squad" ? 4 : 2)} spots)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden md:table-cell">
                      <div className="text-xs text-muted-foreground font-mono">
                        {t.type === "FREE" ? (
                          <span className="text-success font-medium font-sans">FREE</span>
                        ) : (
                          <span>{t.joiningFee}c</span>
                        )}
                        {t.prizePool > 0 && (
                          <span className="ml-1 text-primary font-medium font-mono">→ {t.prizePool}c</span>
                        )}
                      </div>
                    </td>
                    <td className="text-muted-foreground text-xs hidden lg:table-cell">
                      {format(new Date(t.startTime), "dd MMM yyyy, h:mm a")}
                    </td>
                    <td className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/${dynamicSlug}/tournaments/${t.id}`} prefetch={true}>
                              <Pencil className="h-4 w-4 mr-2" /> Manage
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(t.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Tournament?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete the tournament and all its slots and participants. This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive">
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={showCleanup} onOpenChange={setShowCleanup}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash className="h-5 w-5 text-destructive" />
                <span>Cleanup Old Tournaments</span>
              </DialogTitle>
              <DialogDescription>
                Select tournaments started more than 24 hours ago to delete them. Deleting these tournaments will free up space, but the total count of tournaments created will be preserved.
              </DialogDescription>
            </DialogHeader>

            {loadingCleanup ? (
              <div className="flex-1 flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : cleanupTournaments.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <Trophy className="h-10 w-10 mb-2 opacity-50 text-foreground animate-pulse" />
                <p className="text-sm font-medium">No old tournaments found</p>
                <p className="text-xs mt-1 text-muted-foreground/80">All tournaments are newer than 24 hours or have already been cleaned up.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden min-h-[300px]">
                {/* Select All */}
                <div className="flex items-center justify-between border-b pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="select-all-cleanup"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer bg-background"
                      checked={cleanupTournaments.length > 0 && selectedIds.length === cleanupTournaments.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(cleanupTournaments.map(t => t.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                    <label htmlFor="select-all-cleanup" className="text-xs font-bold text-foreground cursor-pointer select-none uppercase tracking-wider">
                      Select All ({cleanupTournaments.length})
                    </label>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold">
                    {selectedIds.length} selected
                  </span>
                </div>

                {/* Tournament List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {cleanupTournaments.map((t) => {
                    const isSelected = selectedIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          setSelectedIds(prev => 
                            prev.includes(t.id) 
                              ? prev.filter(id => id !== t.id) 
                              : [...prev, t.id]
                          );
                        }}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected 
                            ? "bg-primary/5 border-primary/45" 
                            : "bg-background/40 border-border/80 hover:bg-accent/20"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          checked={isSelected}
                          readOnly
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-sm text-foreground truncate">{t.name}</h4>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[t.status] ?? "bg-muted text-muted-foreground"}`}>
                              {t.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 font-medium">
                            <span className="capitalize">{t.gameMode.replace(/_/g, " ")} · {t.teamFormat}</span>
                            <span>Starts: {format(new Date(t.startTime), "dd MMM, h:mm a")}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <DialogFooter className="mt-4 border-t pt-4">
              <Button variant="outline" onClick={() => setShowCleanup(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleCleanup}
                disabled={selectedIds.length === 0 || cleaningUp}
              >
                {cleaningUp ? "Deleting..." : `Delete Selected (${selectedIds.length})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
