"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Trophy, Search, Clock, Zap, ChevronRight, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TOURNAMENT_STATUS_COLORS, TOURNAMENT_STATUS_LABELS } from "@/lib/constants";
import { TournamentListItem } from "@/lib/tournaments";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function TournamentsClient({ 
  initialData = [], 
  initialFilter = "ACTIVE,UPCOMING,ROOM_REVEALED,LIVE" 
}: { 
  initialData?: TournamentListItem[], 
  initialFilter?: string 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [tournaments, setTournaments] = useState<TournamentListItem[]>(initialData);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [gameModeFilter, setGameModeFilter] = useState<string>("ALL");
  const [entryFeeFilter, setEntryFeeFilter] = useState<string>("ALL");

  useEffect(() => {
    setTournaments(initialData);
    setStatusFilter(initialFilter);
  }, [initialData, initialFilter]);

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: "100" });
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    fetch(`/api/tournaments?${params}`)
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

  const SidebarFilters = () => (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Entry Fee</h3>
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
        </Tabs>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Team Format</h3>
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
                <Button variant="outline" size="icon" className="h-11 w-11 shrink-0">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <SheetHeader className="mb-6">
                  <SheetTitle className="font-lora">Filters</SheetTitle>
                </SheetHeader>
                <SidebarFilters />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10 items-start">
        {/* Desktop Sticky Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-24">
          <SidebarFilters />
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
              {filtered.map((t) => (
                <Link
                  key={t.id}
                  href={`/tournaments/${t.id}`}
                  prefetch={true}
                  className="group flex flex-col bg-background rounded-2xl border border-border hover:border-primary/50 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md"
                >
                  <div className="p-6 md:p-8 flex-1 flex flex-col">
                    {/* Top Row: Status & Prize */}
                    <div className="flex justify-between items-start mb-6">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                        TOURNAMENT_STATUS_COLORS[t.status] || "bg-muted text-muted-foreground"
                      )}>
                        {TOURNAMENT_STATUS_LABELS[t.status] || t.status.replace(/_/g, " ")}
                      </span>
                      <div className="text-right">
                        <span className="block text-xl md:text-2xl font-bold text-primary font-lora leading-none">₹{t.prizePool}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-ibm">Prize Pool</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-foreground leading-tight mb-4 font-lora group-hover:text-primary transition-colors line-clamp-2">
                      {t.name}
                    </h3>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="bg-secondary px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground font-ibm">
                        {t.maps[0] || "TBD"}
                      </span>
                      <span className="bg-secondary px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground font-ibm">
                        {t.teamFormat}
                      </span>
                    </div>

                    {/* Info Rows */}
                    <div className="space-y-4 mb-8 flex-1">
                      <div className="flex justify-between items-center text-muted-foreground text-sm font-ibm">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          <span className={cn("font-medium", t.type === "FREE" ? "text-success" : "")}>
                            {t.type === "FREE" ? "FREE ENTRY" : `₹${t.joiningFee} ENTRY`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">{format(new Date(t.startTime), "dd MMM, h:mm a")}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium font-ibm">
                          <span className="text-muted-foreground">Registration</span>
                          <span className="text-foreground">{t.bookedSlots} / {t.totalSlots}</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-500 rounded-full" 
                            style={{ width: `${(t.bookedSlots / t.totalSlots) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="mt-auto">
                      <Button className="w-full rounded-xl group/btn h-11" variant={t.status === "UPCOMING" && t.availableSlots > 0 ? "default" : "secondary"}>
                        {t.status === "UPCOMING" ? (t.availableSlots > 0 ? "Join Tournament" : "Registration Full") : "View Results"}
                        <ChevronRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}