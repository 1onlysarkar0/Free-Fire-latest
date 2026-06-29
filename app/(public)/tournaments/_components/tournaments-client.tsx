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

  useEffect(() => {
    fetch("/api/tournaments/my", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data && data.joinedIds) {
          setJoinedIds(new Set(data.joinedIds));
        }
      })
      .catch((err) => console.error("Failed to load user joined tournaments:", err));
  }, []);

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
    <div className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Entry Fee</h2>
        <Tabs value={entryFeeFilter} onValueChange={setEntryFeeFilter} className="w-full">
          <TabsList className="flex flex-col h-auto w-full">
            {[
              { label: "All Fees", value: "ALL" },
              { label: "Free Entry", value: "FREE" },
              { label: "Paid Entry", value: "PAID" },
            ].map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value} className="w-full justify-start font-ibm py-2.5">
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {["ALL", "FREE", "PAID"].map((v) => (
            <TabsContent key={v} value={v} className="hidden" />
          ))}
        </Tabs>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Team Format</h2>
        <Tabs value={gameModeFilter} onValueChange={setGameModeFilter} className="w-full">
          <TabsList className="flex flex-col h-auto w-full">
            {[
              { label: "All Formats", value: "ALL" },
              { label: "Solo Only", value: "SOLO" },
              { label: "Duo Only", value: "DUO" },
              { label: "Squad Only", value: "SQUAD" },
            ].map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value} className="w-full justify-start font-ibm py-2.5">
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {["ALL", "SOLO", "DUO", "SQUAD"].map((v) => (
            <TabsContent key={v} value={v} className="hidden" />
          ))}
        </Tabs>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
      
      {/* Header & Main Search Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-lora text-foreground">Tournaments</h1>
          <p className="text-muted-foreground mt-2 font-ibm">Compete in premium events and climb the ranks.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground" />
            <Input
              className="w-full pl-10 pr-4 h-11 bg-background"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {/* Mobile Filter Trigger */}
          <div className="lg:hidden shrink-0">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label="Filter tournaments">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <SheetHeader className="mb-6">
                  <SheetTitle className="font-lora">Filters</SheetTitle>
                </SheetHeader>
                {renderSidebarFilters()}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10 items-start">
        {/* Desktop Sticky Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-24">
          {renderSidebarFilters()}
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 w-full">
          {/* Status Navigation */}
          <div className="mb-8 overflow-x-auto no-scrollbar pb-2">
            <Tabs value={statusFilter} onValueChange={handleStatusChange} className="w-full">
              <TabsList className="h-11 inline-flex w-max lg:w-full justify-start p-1 bg-secondary/50">
                {[
                  { label: "All Events", value: "ALL" },
                  { label: "Live Now", value: "LIVE" },
                  { label: "Upcoming", value: "UPCOMING" },
                  { label: "Active", value: "ACTIVE" },
                  { label: "Completed", value: "FINISHED,COMPLETED" },
                ].map((opt) => (
                  <TabsTrigger key={opt.value} value={opt.value} className="px-6 font-ibm font-semibold text-sm">
                    {opt.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Tournament Grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center bg-background rounded-3xl border border-border">
              <Trophy className="h-12 w-12 text-foreground mb-4" />
              <p className="text-xl font-bold font-lora text-foreground">No tournaments found</p>
              <p className="text-muted-foreground text-sm mt-2 font-ibm">Try removing filters to see more events.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.map((t) => {
                const teamSize = t.teamFormat === "squad" ? 4 : t.teamFormat === "duo" ? 2 : 1;
                const isTeamFormat = t.teamFormat === "duo" || t.teamFormat === "squad";
                const isJoined = joinedIds.has(t.id);

                return (
                  <Link
                    key={t.id}
                    href={`/tournaments/${t.id}`}
                    prefetch={true}
                    className="group flex flex-col card-widget hover:border-primary/40 hover:-translate-y-1 hover:shadow-md active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-out overflow-hidden"
                  >
                    <div className="p-5 md:p-6 flex-1 flex flex-col">
                      {/* Top Row: Status & Prize */}
                      <div className="flex justify-between items-center mb-5">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                            TOURNAMENT_STATUS_COLORS[t.status] || "bg-muted text-muted-foreground"
                          )}>
                            {TOURNAMENT_STATUS_LABELS[t.status] || t.status.replace(/_/g, " ")}
                          </span>
                          {isJoined && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-success/15 text-success">
                              <CheckCircle2 className="h-3 w-3" />
                              Joined
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1.5 text-primary font-lora">
                            <Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="text-base md:text-lg font-bold leading-none">₹{t.prizePool}</span>
                          </div>
                          <span className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-ibm mt-1">Winning Price</span>
                        </div>
                      </div>

                      <h2 className="text-lg font-bold text-foreground leading-tight mb-3 font-lora group-hover:text-primary transition-colors line-clamp-2">
                        {t.name}
                      </h2>

                      {/* Metadata Badges */}
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        <span className="bg-secondary/60 border border-border/30 px-2.5 py-0.5 rounded-lg text-xs font-semibold text-foreground font-ibm capitalize">
                          {t.maps[0] || "TBD"}
                        </span>
                        <span className="bg-secondary/60 border border-border/30 px-2.5 py-0.5 rounded-lg text-xs font-semibold text-foreground font-ibm capitalize">
                          {t.teamFormat}
                        </span>
                      </div>

                      {/* Info Rows */}
                      <div className="space-y-3 mb-6 flex-1">
                        <div className="flex justify-between items-center text-muted-foreground text-xs font-ibm">
                          <div className="flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5" />
                            <span className={cn("font-medium", t.type === "FREE" ? "text-success" : "")}>
                              {t.type === "FREE" ? "FREE ENTRY" : `₹${t.joiningFee} ENTRY`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="font-medium">{format(new Date(t.startTime), "dd MMM, h:mm a")}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-3 border-t border-border/40">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium font-ibm">
                            {isTeamFormat ? (
                              <div className="flex items-center gap-4 w-full">
                                <span className="text-foreground flex items-center gap-1">
                                  <Users2 className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                                  <span className="font-semibold">{Math.floor(t.bookedSlots / teamSize)} / {Math.floor(t.totalSlots / teamSize)}</span>
                                  <span className="text-muted-foreground text-[10px]">Teams</span>
                                </span>
                                <span className="text-foreground flex items-center gap-1">
                                  <UserCheck className="h-3.5 w-3.5 text-success/90 shrink-0" aria-hidden="true" />
                                  <span className="font-semibold">{t.bookedSlots} / {t.totalSlots}</span>
                                  <span className="text-muted-foreground text-[10px]">Slots</span>
                                </span>
                              </div>
                            ) : (
                              <span className="text-foreground flex items-center gap-1.5 w-full">
                                <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                                <span className="font-semibold">{t.bookedSlots} / {t.totalSlots}</span>
                                <span className="text-muted-foreground text-[10px]">Slots Booked</span>
                              </span>
                            )}
                          </div>
                          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mt-1.5">
                            <div 
                              className="h-full bg-primary transition-all duration-500 rounded-full" 
                              style={{ width: `${Math.min(100, (t.bookedSlots / t.totalSlots) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="mt-auto">
                        {isJoined ? (
                          <Button
                            className="w-full rounded-xl group/btn h-10 text-xs font-semibold"
                            variant="secondary"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1.5 text-success" />
                            You&apos;re Registered
                            <ChevronRight className="h-4 w-4 ml-1.5 group-hover/btn:translate-x-0.5 transition-transform" />
                          </Button>
                        ) : (
                          <Button
                            className="w-full rounded-xl group/btn h-10 text-xs font-semibold"
                            variant={t.status === "UPCOMING" && t.availableSlots > 0 ? "default" : "secondary"}
                          >
                            {t.status === "UPCOMING"
                              ? t.availableSlots > 0
                                ? "Join Tournament"
                                : "Registration Full"
                              : "View Results"}
                            <ChevronRight className="h-4 w-4 ml-1.5 group-hover/btn:translate-x-0.5 transition-transform" />
                          </Button>
                        )}
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
