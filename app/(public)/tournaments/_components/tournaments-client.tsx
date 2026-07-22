"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Trophy, Search, Clock, Zap, ChevronRight, Filter, Users2, UserCheck, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TOURNAMENT_STATUS_COLORS, TOURNAMENT_STATUS_LABELS } from "@/lib/constants";
import { TournamentListItem } from "@/lib/tournaments";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export default function TournamentsClient({ 
  initialData = [], 
  initialFilter = "ACTIVE,UPCOMING,ROOM_REVEALED,LIVE",
  initialJoinedIds = [],
}: { 
  initialData?: TournamentListItem[], 
  initialFilter?: string,
  initialJoinedIds?: string[],
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [tournaments, setTournaments] = useState<TournamentListItem[]>(initialData);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [gameModeFilter, setGameModeFilter] = useState<string>("ALL");
  const [entryFeeFilter, setEntryFeeFilter] = useState<string>("ALL");
  const [joinedIds, setJoinedIds] = useState<Set<string>>(() => new Set(initialJoinedIds));

  useEffect(() => {
    setTournaments(initialData);
    setStatusFilter(initialFilter);
    setJoinedIds(new Set(initialJoinedIds));
  }, [initialData, initialFilter, initialJoinedIds]);

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: "100" });
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    fetch(`/api/tournaments?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setTournaments(d.data);
      })
      .catch(console.error);
  }, [statusFilter]);

  useEffect(() => {
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val === "ALL") {
      params.delete("status");
    } else {
      params.set("status", val);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const filtered = useMemo(() => {
    let result = tournaments.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase())
    );

    if (gameModeFilter !== "ALL") {
      result = result.filter(t => t.teamFormat.toUpperCase() === gameModeFilter);
    }

    if (entryFeeFilter !== "ALL") {
      if (entryFeeFilter === "FREE") {
        result = result.filter(t => t.type === "FREE");
      } else {
        result = result.filter(t => t.type === "PAID");
      }
    }

    result.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    return result;
  }, [tournaments, search, gameModeFilter, entryFeeFilter]);

  const renderSidebarFilters = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">Entry Fee</h2>
        <Tabs value={entryFeeFilter} onValueChange={setEntryFeeFilter} className="w-full">
          <TabsList className="flex flex-col h-auto w-full p-1 bg-secondary/50 rounded-xl">
            {[
              { label: "All Fees", value: "ALL" },
              { label: "Free Entry", value: "FREE" },
              { label: "Paid Entry", value: "PAID" },
            ].map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value} className="w-full justify-start text-xs font-semibold py-1.5 rounded-lg">
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">Team Format</h2>
        <Tabs value={gameModeFilter} onValueChange={setGameModeFilter} className="w-full">
          <TabsList className="flex flex-col h-auto w-full p-1 bg-secondary/50 rounded-xl">
            {[
              { label: "All Formats", value: "ALL" },
              { label: "Solo Only", value: "SOLO" },
              { label: "Duo Only", value: "DUO" },
              { label: "Squad Only", value: "SQUAD" },
            ].map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value} className="w-full justify-start text-xs font-semibold py-1.5 rounded-lg">
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 text-foreground font-ibm">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-lora text-foreground">Tournaments</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Compete in verified Free Fire events and earn prize pools.</p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="w-full pl-9 pr-3 h-9 text-xs bg-card border-border/40 rounded-xl"
              placeholder="Search tournaments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="lg:hidden shrink-0">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/40">
                  <Filter className="h-3.5 w-3.5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <SheetHeader className="mb-4">
                  <SheetTitle className="font-lora text-base">Filter Events</SheetTitle>
                </SheetHeader>
                {renderSidebarFilters()}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-20">
          {renderSidebarFilters()}
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Status Bar */}
          <div className="overflow-x-auto no-scrollbar pb-1">
            <Tabs value={statusFilter} onValueChange={handleStatusChange} className="w-full">
              <TabsList className="h-9 inline-flex w-max lg:w-full justify-start p-1 bg-secondary/50 rounded-xl">
                {[
                  { label: "All", value: "ALL" },
                  { label: "Live Now", value: "LIVE" },
                  { label: "Upcoming", value: "UPCOMING" },
                  { label: "Active", value: "ACTIVE" },
                  { label: "Completed", value: "FINISHED,COMPLETED" },
                ].map((opt) => (
                  <TabsTrigger key={opt.value} value={opt.value} className="px-4 text-xs font-semibold rounded-lg">
                    {opt.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Grid View */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-card/60 rounded-2xl border border-border/40">
              <Trophy className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-bold font-lora text-foreground">No tournaments found</p>
              <p className="text-xs text-muted-foreground mt-0.5">Try clearing filters to see more events.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filtered.map((t) => {
                const isJoined = joinedIds.has(t.id);

                return (
                  <Link
                    key={t.id}
                    href={`/tournaments/${t.id}`}
                    prefetch={true}
                    className="group block"
                  >
                    <div className="p-4 rounded-2xl border border-border/40 bg-card hover:border-primary/40 hover:shadow-3xs transition-all flex flex-col justify-between h-full space-y-3">
                      <div className="space-y-2">
                        {/* Top Tones */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                              TOURNAMENT_STATUS_COLORS[t.status] || "bg-muted text-muted-foreground"
                            )}>
                              {TOURNAMENT_STATUS_LABELS[t.status] || t.status.replace(/_/g, " ")}
                            </span>
                            {isJoined && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" /> Joined
                              </span>
                            )}
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-extrabold text-amber-500 font-mono">₹{t.prizePool}</span>
                            <span className="block text-[9px] font-bold text-muted-foreground uppercase">Pool</span>
                          </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-sm font-bold text-foreground leading-tight font-lora group-hover:text-primary transition-colors line-clamp-1">
                          {t.name}
                        </h2>

                        {/* Meta Tags */}
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px] font-medium px-2 py-0 h-4 border-border/50 capitalize">
                            {t.maps[0] || "Bermuda"}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0 h-4 uppercase">
                            {t.teamFormat}
                          </Badge>
                          <Badge variant="secondary" className={cn("text-[10px] font-bold px-2 py-0 h-4", t.type === "FREE" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-primary/10 text-primary")}>
                            {t.type === "FREE" ? "FREE" : `₹${t.joiningFee}`}
                          </Badge>
                        </div>
                      </div>

                      {/* Info & Progress */}
                      <div className="space-y-2 pt-2 border-t border-border/30">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                            {format(new Date(t.startTime), "dd MMM, h:mm a")}
                          </span>
                          <span className="font-mono text-foreground font-semibold">
                            {t.bookedSlots}/{t.totalSlots} Slots
                          </span>
                        </div>

                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300 rounded-full" 
                            style={{ width: `${Math.min(100, (t.bookedSlots / t.totalSlots) * 100)}%` }}
                          />
                        </div>

                        <Button className="w-full h-8 text-xs font-bold rounded-xl mt-1" variant={isJoined ? "secondary" : "default"}>
                          {isJoined ? "Registered" : "View Details"}
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
