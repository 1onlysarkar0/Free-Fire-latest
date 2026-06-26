"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Trophy, Plus, Search, Filter, MoreHorizontal, Pencil, Trash2,
  Users,
} from "lucide-react";
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

interface Tournament {
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

export default function AdminTournamentsClient({ dynamicSlug, initialData }: { dynamicSlug: string; initialData: Tournament[] }) {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>(initialData);
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

  return (
    <div className="w-full min-w-0 p-4 md:p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Tournaments</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{tournaments.length} tournament{tournaments.length !== 1 ? "s" : ""} total</p>
            </div>
          </div>
          <Link href={`/${dynamicSlug}/tournaments/new`} prefetch={true}>
            <Button><Plus className="h-4 w-4" />New Tournament</Button>
          </Link>
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
          <div className="rounded-2xl bg-accent/40 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-accent/60">
                    {["Tournament","Status","Slots","Fee / Prize","Start Time",""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
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
          <Card className="rounded-2xl bg-accent/40 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-accent/60">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Tournament</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Slots</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground hidden md:table-cell">Fee / Prize</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground hidden lg:table-cell">Start Time</th>
                    <th className="px-4 py-3 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-foreground">{t.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {t.gameMode.replace(/_/g, " ")} · {t.teamFormat}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[t.status] ?? "bg-muted text-muted-foreground"}`}>
                          {t.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="text-xs text-muted-foreground">
                          {t.type === "FREE" ? (
                            <span className="text-success font-medium">FREE</span>
                          ) : (
                            <span>{t.joiningFee}c</span>
                          )}
                          {t.prizePool > 0 && (
                            <span className="ml-1 text-primary font-medium">→ {t.prizePool}c</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                        {format(new Date(t.startTime), "dd MMM yyyy, h:mm a")}
                      </td>
                      <td className="px-4 py-3">
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
      </div>
    </div>
  );
}
