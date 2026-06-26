"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import {
  Trophy, Users, Clock, Key, Crown, ArrowLeft, Check,
  Shield, Zap, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { TournamentDetail } from "@/lib/tournaments";
import { TOURNAMENT_STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface TournamentData extends TournamentDetail {
  userParticipant?: { slotId: string };
  userSlot?: { id: string; slotNumber: number; teamName?: string; ignList: string[] };
  roomId?: string | null;
  roomPassword?: string | null;
}

interface Props { id: string; initialData: TournamentDetail | null }

export default function TournamentDetailClient({ id, initialData }: Props) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [t, setT] = useState<TournamentData | null>(initialData as TournamentData | null);
  const [joining, setJoining] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;
      setT(data.data);
    } catch (err) { console.error(err); }
  }, [id]);

  useEffect(() => { if (!initialData) load(); }, [load, initialData]);

  // Poll every 15s for real-time updates
  useEffect(() => {
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleJoin() {
    if (!session?.user) { router.push("/sign-in?returnTo=/tournaments/" + id); return; }
    setJoining(true);
    try {
      const res = await fetch(`/api/tournaments/${id}/join`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlotId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`🎉 You're in! Slot #${data.data.slotNumber} secured.`);
        setSelectedSlotId(null);
        load();
        router.refresh();
      } else {
        toast.error(data.error || "Failed to join tournament");
      }
    } catch { toast.error("Failed to join tournament"); }
    finally { setJoining(false); }
  }

  if (!t) return null;

  const isParticipant = !!t.userParticipant;
  const isRegistrationOpen = t.status === "UPCOMING" && new Date() < new Date(t.registrationDeadline);
  const canJoin = isRegistrationOpen && !isParticipant && t.availableSlots > 0;
  const showCredentials = ["ROOM_REVEALED", "LIVE", "FINISHED", "COMPLETED"].includes(t.status) && isParticipant;

  const descContent = t.descriptionMarkdown || t.descriptionHtml;
  const rulesContent = t.rulesMarkdown || t.rulesHtml;

  const isTeamFormat = t.teamFormat === "duo" || t.teamFormat === "squad";
  const teamSize = t.teamFormat === "squad" ? 4 : t.teamFormat === "duo" ? 2 : 1;

  const selectedSlot = selectedSlotId ? t.slots.find(s => s.id === selectedSlotId) : null;

  // Group slots by teamName if Duo or Squad
  const groupedTeams = (() => {
    if (!isTeamFormat) return null;
    const groups: Record<string, typeof t.slots> = {};
    t.slots.forEach((s) => {
      const tName = s.teamName || `Team ${Math.ceil(s.slotNumber / teamSize)}`;
      if (!groups[tName]) groups[tName] = [];
      groups[tName].push(s);
    });
    return groups;
  })();

  return (
    <div className="flex flex-col">

      {/* Hero Banner */}
      <div className="bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/tournaments" prefetch={true} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Tournaments
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${TOURNAMENT_STATUS_COLORS[t.status] ?? "bg-muted text-muted-foreground"}`}>
                  {t.status.replace(/_/g, " ")}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${t.type === "FREE" ? "bg-success/20 text-success" : "bg-primary/20 text-primary/90"}`}>
                  {t.type === "FREE" ? "FREE ENTRY" : `₹${t.joiningFee} TO JOIN`}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold font-lora text-foreground">{t.name}</h1>
              <p className="text-muted-foreground mt-2 capitalize font-medium">
                {t.gameMode.replace(/_/g, " ")} · {t.teamFormat}
                {t.maps.length > 0 && ` · ${t.maps.join(", ")}`}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 md:min-w-[280px]">
              <div className="bg-primary/10 rounded-xl p-3 text-center border border-primary/15">
                <Trophy className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold text-primary">{t.prizePool > 0 ? `₹${t.prizePool}` : "—"}</p>
                <p className="text-xs text-primary font-medium uppercase">Winning Price</p>
              </div>
              <div className="bg-secondary/80 rounded-xl p-3 text-center border border-border/80">
                <Users className="h-5 w-5 mx-auto mb-1 text-foreground" />
                <p className="text-xl font-bold text-foreground">
                  {isTeamFormat ? `${Math.floor(t.bookedSlots / teamSize)}/${Math.floor(t.totalSlots / teamSize)}` : `${t.bookedSlots}/${t.totalSlots}`}
                </p>
                <p className="text-xs text-muted-foreground font-medium uppercase">{isTeamFormat ? "Teams" : "Slots"}</p>
              </div>
              <div className="bg-secondary/80 rounded-xl p-3 text-center border border-border/80">
                <Clock className="h-5 w-5 mx-auto mb-1 text-foreground" />
                <p className="text-sm font-bold text-foreground">{format(new Date(t.startTime), "dd MMM")}</p>
                <p className="text-xs text-muted-foreground font-medium">{format(new Date(t.startTime), "h:mm a")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {(descContent || rulesContent || t.winners.length > 0) && (
              <Tabs defaultValue={descContent ? "description" : rulesContent ? "rules" : "winners"}>
                <TabsList className="bg-transparent border-none flex-wrap h-auto gap-6 p-0 shadow-none text-muted-foreground mb-4">
                  {descContent && (
                    <TabsTrigger
                      value="description"
                      className="bg-transparent px-0 py-1.5 shadow-none border-none text-sm font-semibold text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent hover:text-foreground transition-colors"
                    >
                      Description
                    </TabsTrigger>
                  )}
                  {rulesContent && (
                    <TabsTrigger
                      value="rules"
                      className="bg-transparent px-0 py-1.5 shadow-none border-none text-sm font-semibold text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent hover:text-foreground transition-colors"
                    >
                      Rules
                    </TabsTrigger>
                  )}
                  {t.winners.length > 0 && (
                    <TabsTrigger
                      value="winners"
                      className="bg-transparent px-0 py-1.5 shadow-none border-none text-sm font-semibold text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent hover:text-foreground transition-colors"
                    >
                      Winners
                    </TabsTrigger>
                  )}
                </TabsList>

                {descContent && (
                  <TabsContent value="description">
                    <div className="bg-accent/40 rounded-2xl border border-border/80 p-6 prose prose-sm max-w-none shadow-sm">
                      {t.descriptionMarkdown ? (
                        <MarkdownRenderer content={t.descriptionMarkdown} />
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: t.descriptionHtml ?? "" }} />
                      )}
                    </div>
                  </TabsContent>
                )}

                {rulesContent && (
                  <TabsContent value="rules">
                    <div className="bg-accent/40 rounded-2xl border border-border/80 p-6 prose prose-sm max-w-none shadow-sm">
                      {t.rulesMarkdown ? (
                        <MarkdownRenderer content={t.rulesMarkdown} />
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: t.rulesHtml ?? "" }} />
                      )}
                    </div>
                  </TabsContent>
                )}

                {t.winners.length > 0 && (
                  <TabsContent value="winners">
                    <div className="bg-accent/40 rounded-2xl border border-border/80 p-6 shadow-sm">
                      <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                        <Crown className="h-5 w-5 text-foreground" /> Winners
                      </h3>
                      <div className="space-y-3">
                        {t.winners.map((w, i) => (
                          <div key={w.id} className={`flex items-center justify-between p-4 rounded-xl border ${i === 0 ? "bg-warning/10 border-warning/20" : i === 1 ? "bg-secondary border-border" : "bg-primary/10/30 border-primary/10"}`}>
                            <div className="flex items-center gap-3">
                              <span className={`text-2xl font-black ${i === 0 ? "text-warning" : i === 1 ? "text-muted-foreground" : "text-primary/70"}`}>
                                {w.placement}
                              </span>
                              <div>
                                <p className="font-semibold text-foreground">{w.userName}</p>
                                {w.userGameName && <p className="text-xs text-muted-foreground">{w.userGameName}</p>}
                              </div>
                            </div>
                            {w.prizeAmount > 0 && (
                              <span className="font-bold text-primary">₹{w.prizeAmount}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            )}

            {/* Slots section (Always Visible) */}
            <div className="bg-accent/40 rounded-2xl border border-border/80 p-6 shadow-sm mt-6">
              <h3 className="font-semibold text-foreground mb-1">
                {isTeamFormat ? "Team Slots" : "Player Slots"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {canJoin
                  ? "Click an available slot to select it before joining."
                  : isTeamFormat
                    ? `${t.bookedSlots} of ${t.totalSlots} teams registered (${t.bookedSlots * teamSize} of ${t.totalSlots * teamSize} slots filled).`
                    : `${t.bookedSlots} of ${t.totalSlots} slots filled.`
                }
              </p>

              {isTeamFormat && groupedTeams ? (
                // Team format: show grouped checkbox slots
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(groupedTeams).map(([teamName, slots]) => (
                    <div key={teamName} className="border border-border/70 rounded-xl p-4 bg-background/40 flex flex-col gap-2.5 shadow-sm">
                      <h4 className="font-bold text-xs text-foreground/80 tracking-wider uppercase border-b border-border/40 pb-1.5 flex items-center justify-between">
                        <span>{teamName}</span>
                      </h4>
                      <div className="flex flex-col gap-2">
                        {slots.map((s) => {
                          const isMySlot = s.id === t.userSlot?.id;
                          const isSelected = s.id === selectedSlotId;
                          const isBooked = s.status === "BOOKED";
                          const isClickable = canJoin && !isBooked;

                          return (
                            <div
                              key={s.id}
                              onClick={() => {
                                if (isClickable) {
                                  setSelectedSlotId(isSelected ? null : s.id);
                                }
                              }}
                              className={cn(
                                "flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all text-xs font-medium select-none",
                                isBooked ? "bg-muted/50 border-border/40 cursor-not-allowed opacity-80" :
                                isSelected ? "bg-primary/10 border-primary ring-2 ring-primary/20 cursor-pointer" :
                                "bg-card/50 border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                              )}
                            >
                              <div className={cn(
                                "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                (isBooked || isSelected) ? "bg-primary border-primary text-white" : "border-muted-foreground/45 bg-background"
                              )}>
                                {(isBooked || isSelected) && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                {isBooked ? (
                                  <span className="font-semibold text-foreground truncate block">
                                    {s.userName || "Booked"}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    {isSelected ? "Selected (Ready to book)" : "Available Slot"}
                                  </span>
                                )}
                              </div>
                              {isMySlot && (
                                <span className="text-[9px] font-bold text-success uppercase bg-success/15 px-1.5 py-0.5 rounded shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Solo format: show a list of checkbox-like slots
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {t.slots.map((s) => {
                    const isMySlot = s.id === t.userSlot?.id;
                    const isSelected = s.id === selectedSlotId;
                    const isBooked = s.status === "BOOKED";
                    const isClickable = canJoin && !isBooked;

                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          if (isClickable) {
                            setSelectedSlotId(isSelected ? null : s.id);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all text-xs font-medium select-none",
                          isBooked ? "bg-muted/50 border-border/40 cursor-not-allowed opacity-80" :
                          isSelected ? "bg-primary/10 border-primary ring-2 ring-primary/20 cursor-pointer" :
                          "bg-card/50 border-border hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                        )}
                      >
                        <div className={cn(
                          "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                          (isBooked || isSelected) ? "bg-primary border-primary text-white" : "border-muted-foreground/45 bg-background"
                        )}>
                          {(isBooked || isSelected) && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          {isBooked ? (
                            <span className="font-semibold text-foreground truncate block">
                              {s.userName || "Booked"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {isSelected ? `Slot #${s.slotNumber} (Selected)` : `Slot #${s.slotNumber} (Available)`}
                            </span>
                          )}
                        </div>
                        {isMySlot && (
                          <span className="text-[9px] font-bold text-success uppercase bg-success/15 px-1.5 py-0.5 rounded shrink-0">
                            You
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 mt-6 text-xs text-muted-foreground pt-4 border-t border-border/40">
                <span className="flex items-center gap-1.5">
                  <div className="h-3.5 w-3.5 rounded border border-primary bg-primary text-white flex items-center justify-center shrink-0">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                  Booked
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="h-3.5 w-3.5 rounded border border-primary bg-primary text-white flex items-center justify-center shrink-0">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                  <span className="text-success font-semibold">Your Slot</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="h-3.5 w-3.5 rounded border border-primary bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                  Selected
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="h-3.5 w-3.5 rounded border border-muted-foreground/45 bg-background shrink-0" />
                  Available
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            
            {/* Room Credentials */}
            {showCredentials && (
              <div className="bg-accent/40 rounded-2xl border border-primary/25 p-5 shadow-sm">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Key className="h-5 w-5 text-foreground" /> Room Credentials
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Room ID</p>
                    <p className="text-lg font-bold text-foreground font-mono">{t.roomId}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Password</p>
                    <p className="text-lg font-bold text-foreground font-mono">{t.roomPassword}</p>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Do NOT share these with anyone outside your team.
                  </p>
                </div>
              </div>
            )}

            {/* My Slot */}
            {isParticipant && t.userSlot && (
              <div className="bg-accent/40 rounded-2xl border border-success/25 p-5 shadow-sm">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Check className="h-5 w-5 text-foreground" /> You&apos;re Registered
                </h3>
                <div className="p-3 bg-success/10 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-1">Your Slot</p>
                  {isTeamFormat && t.userSlot.teamName ? (
                    <p className="text-2xl font-black text-success">{t.userSlot.teamName}</p>
                  ) : (
                    <p className="text-4xl font-black text-success">#{t.userSlot.slotNumber}</p>
                  )}
                </div>
              </div>
            )}

            {/* Join Card */}
            {canJoin && (
              <div className="bg-accent/40 rounded-2xl border border-border/80 p-5 shadow-sm">
                <h3 className="font-semibold text-foreground mb-1">Join Tournament</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Closes: {format(new Date(t.registrationDeadline), "dd MMM, h:mm a")}
                </p>

                {selectedSlot && (
                  <div className="flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 border border-primary/25 rounded-lg px-3 py-2 mb-3">
                    <ChevronRight className="h-3.5 w-3.5" />
                    {isTeamFormat
                      ? `Selected: ${selectedSlot.teamName || `Team ${selectedSlot.slotNumber}`}`
                      : `Selected: Slot #${selectedSlot.slotNumber}`
                    }
                  </div>
                )}

                <div className="space-y-3">
                  {/* Selected slot message or prompt */}
                  {!selectedSlot && (
                    <div className="p-3 bg-muted/60 border border-border/60 rounded-xl text-xs text-muted-foreground text-center font-medium">
                      Please select an available slot from the Slots tab above to register.
                    </div>
                  )}

                  {t.type === "PAID" && (
                    <div className="p-3 bg-amber-100/50 rounded-xl text-sm text-amber-900">
                      <Zap className="h-4 w-4 inline mr-1" />
                      <strong>₹{t.joiningFee}</strong> will be deducted from your wallet.
                    </div>
                  )}

                  {!session?.user ? (
                    <Link href={`/sign-in?returnTo=/tournaments/${t.id}`} prefetch={true}>
                      <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold">
                        Sign in to Join
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={handleJoin}
                      disabled={joining || !selectedSlotId}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-semibold"
                    >
                      {joining ? (
                        <span className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      {!selectedSlotId
                        ? "Select a slot to join"
                        : (t.type === "PAID" ? `Pay ₹${t.joiningFee} & Join` : "Join Free")}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Full / Deadline Passed */}
            {t.status === "UPCOMING" && !canJoin && !isParticipant && (
              <div className="bg-accent/40 rounded-2xl border border-border/80 p-5 text-center shadow-sm">
                {t.availableSlots === 0 ? (
                  <>
                    <Users className="h-8 w-8 mx-auto mb-2 text-foreground" />
                    <p className="font-medium text-muted-foreground">Tournament Full</p>
                    <p className="text-sm text-muted-foreground mt-1">All slots have been booked</p>
                  </>
                ) : (
                  <>
                    <Clock className="h-8 w-8 mx-auto mb-2 text-foreground" />
                    <p className="font-medium text-muted-foreground">Registration Closed</p>
                    <p className="text-sm text-muted-foreground mt-1">Deadline has passed</p>
                  </>
                )}
              </div>
            )}

            {/* Schedule Info */}
            <div className="bg-accent/40 rounded-2xl border border-border/80 p-5 space-y-3 shadow-sm">
              <h3 className="font-semibold text-foreground text-sm">Schedule</h3>
              {[
                { label: "Registration Closes", value: format(new Date(t.registrationDeadline), "dd MMM yyyy, h:mm a") },
                { label: "Match Starts", value: format(new Date(t.startTime), "dd MMM yyyy, h:mm a") },
              ].map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-semibold text-foreground text-right">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
