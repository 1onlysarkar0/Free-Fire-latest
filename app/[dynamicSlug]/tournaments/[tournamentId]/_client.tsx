"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import {
  ArrowLeft, Save, Users, Trophy, Key, XCircle, Crown,
  Loader2, Plus, Trash2, AlertTriangle, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_COLORS: Record<string, string> = {
  UPCOMING: "bg-blue-100 text-blue-700 border-blue-200",
  ACTIVE: "bg-success/20 text-success border-success/20",
  ROOM_REVEALED: "bg-primary/20 text-primary/90 border-primary/20",
  LIVE: "bg-success/20 text-success border-success/20",
  FINISHED: "bg-muted text-muted-foreground border-border",
  COMPLETED: "bg-purple-100 text-purple-700 border-purple-200",
  CANCELLED: "bg-red-100 text-destructive border-destructive/20",
};

const STATUSES = ["UPCOMING", "ACTIVE", "ROOM_REVEALED", "LIVE", "FINISHED", "COMPLETED", "CANCELLED"];
const PLACEMENTS = ["1st", "2nd", "3rd", "4th", "5th", "Custom"];

interface Tournament {
  id: string; name: string; type: string; joiningFee: number; prizePool: number;
  gameMode: string; teamFormat: string; maps: string[]; totalSlots: number;
  startTime: string; registrationDeadline: string; endTime?: string | null;
  descriptionHtml?: string | null; rulesHtml?: string | null; status: string;
  roomId?: string | null; roomPassword?: string | null;
  slots: { id: string; slotNumber: number; status: string; teamName?: string | null; ignList: string[] }[];
  participants: { id: string; userId: string; slotId: string; entryFeePaid: number; createdAt: string; userName: string; userEmail: string; userGameName?: string | null; userUid?: string | null; userImage?: string | null }[];
  winners: { id: string; userId: string; placement: string; prizeAmount: number; userName: string; userGameName?: string | null }[];
  participantCount: number;
}

interface WinnerForm { userId: string; slotId: string; placement: string; prizeAmount: number; customPlacement: string }

interface ManageTournamentClientProps {
  id: string;
  initialData: Tournament;
  dynamicSlug: string;
}

export default function ManageTournamentClient({ id: tournamentId, initialData, dynamicSlug }: ManageTournamentClientProps) {
  const router = useRouter();
  const [t, setT] = useState<Tournament>(initialData);
  const [loading, setLoading] = useState(false);

  // Room credentials
  const [roomId, setRoomId] = useState(initialData.roomId ?? "");
  const [roomPwd, setRoomPwd] = useState(initialData.roomPassword ?? "");
  const [revealingRoom, setRevealingRoom] = useState(false);

  // Status change
  const [newStatus, setNewStatus] = useState(initialData.status);
  const [changingStatus, setChangingStatus] = useState(false);

  // Declare winners
  const [winners, setWinners] = useState<WinnerForm[]>([{ userId: "", slotId: "", placement: "1st", prizeAmount: 0, customPlacement: "" }]);
  const [declaringWinners, setDeclaringWinners] = useState(false);

  // Cancel
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Remove participant
  const [removeDialogUserId, setRemoveDialogUserId] = useState<string | null>(null);
  const [removeRefund, setRemoveRefund] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}`);
      if (!res.ok) { toast.error("Tournament not found"); router.push(`/${dynamicSlug}/tournaments`); return; }
      const data: Tournament = await res.json();
      setT(data);
      setNewStatus(data.status);
      setRoomId(data.roomId ?? "");
      setRoomPwd(data.roomPassword ?? "");
    } catch { toast.error("Failed to load tournament"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    // Only fetch on mount if tournamentId changed (standard client transition)
    if (t.id !== tournamentId) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  async function handleRevealRoom() {
    if (!roomId.trim() || !roomPwd.trim()) return toast.error("Both Room ID and Password are required");
    setRevealingRoom(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}/room-credentials`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: roomId.trim(), roomPassword: roomPwd.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Room credentials set and participants notified!");
        router.refresh();
        load();
      }
      else toast.error(data.error || "Failed to set room credentials");
    } catch { toast.error("Failed to set room credentials"); }
    finally { setRevealingRoom(false); }
  }

  async function handleStatusChange() {
    if (!newStatus || newStatus === t?.status) return;
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Status updated");
        router.refresh();
        load();
      }
      else toast.error(data.error || "Failed to update status");
    } catch { toast.error("Failed to update status"); }
    finally { setChangingStatus(false); }
  }

  async function handleDeclareWinners() {
    const payload = winners.map((w) => ({
      userId: w.userId,
      slotId: w.slotId || undefined,
      placement: w.placement === "Custom" ? w.customPlacement : w.placement,
      prizeAmount: Number(w.prizeAmount) || 0,
    }));
    if (payload.some((w) => !w.userId)) return toast.error("All winners must have a user selected");
    if (payload.some((w) => !w.placement)) return toast.error("All winners must have a placement");

    setDeclaringWinners(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}/declare-winners`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winners: payload }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Winners declared and prizes credited!");
        router.refresh();
        load();
      }
      else toast.error(data.error || "Failed to declare winners");
    } catch { toast.error("Failed to declare winners"); }
    finally { setDeclaringWinners(false); }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) return toast.error("Cancellation reason is required");
    setCancelling(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}/cancel`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Tournament cancelled. ${data.refundsProcessed} refunds processed.`);
        setCancelDialogOpen(false);
        router.refresh();
        load();
      } else toast.error(data.error || "Failed to cancel");
    } catch { toast.error("Failed to cancel tournament"); }
    finally { setCancelling(false); }
  }

  async function handleRemoveParticipant() {
    if (!removeDialogUserId) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}/participants/${removeDialogUserId}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refund: removeRefund }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.refunded ? `Participant removed. ₹${data.refundAmount} coins refunded.` : "Participant removed.");
        setRemoveDialogUserId(null);
        router.refresh();
        load();
      } else toast.error(data.error || "Failed to remove participant");
    } catch { toast.error("Failed to remove participant"); }
    finally { setRemoving(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-muted/80" /></div>;
  if (!t) return null;

  const isActive = !["COMPLETED", "CANCELLED"].includes(t.status);
  const canDeclare = !["COMPLETED", "CANCELLED", "UPCOMING"].includes(t.status);
  const canCancel = !["COMPLETED", "CANCELLED"].includes(t.status);

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${dynamicSlug}/tournaments`} prefetch={true}>
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground truncate">{t.name}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[t.status] ?? ""}`}>
              {t.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t.gameMode.replace(/_/g, " ")} · {t.teamFormat} · {
              t.teamFormat === "solo"
                ? `${t.participantCount}/${t.totalSlots} slots`
                : `${t.participantCount}/${t.totalSlots} teams (${t.participantCount * (t.teamFormat === "squad" ? 4 : 2)}/${t.totalSlots * (t.teamFormat === "squad" ? 4 : 2)} slots)`
            }
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="participants">Participants ({t.participantCount})</TabsTrigger>
          <TabsTrigger value="room">Room Credentials</TabsTrigger>
          <TabsTrigger value="winners">Declare Winners</TabsTrigger>
          {canCancel && <TabsTrigger value="danger" className="text-destructive">Danger Zone</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <h2 className="font-semibold text-foreground">Status</h2>
            <div className="flex items-center gap-3">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                onClick={handleStatusChange}
                disabled={changingStatus || newStatus === t.status}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {changingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Update Status
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Type", value: t.type },
              { label: "Entry Fee", value: t.type === "FREE" ? "Free" : `${t.joiningFee} coins` },
              { label: "Winning Price", value: `${t.prizePool} coins` },
              {
                label: t.teamFormat === "solo" ? "Slots" : "Teams",
                value: t.teamFormat === "solo"
                  ? `${t.participantCount}/${t.totalSlots}`
                  : `${t.participantCount}/${t.totalSlots} (${t.participantCount * (t.teamFormat === "squad" ? 4 : 2)}/${t.totalSlots * (t.teamFormat === "squad" ? 4 : 2)} spots)`
              },
              { label: "Start Time", value: format(new Date(t.startTime), "dd MMM yyyy, h:mm a") },
              { label: "Reg. Deadline", value: format(new Date(t.registrationDeadline), "dd MMM yyyy, h:mm a") },
            ].map((item) => (
              <div key={item.label} className="bg-card rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{item.label}</p>
                <p className="text-sm font-semibold text-foreground mt-1">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Slot Grid */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h2 className="font-semibold text-foreground mb-3">Slot Overview</h2>
            <div className="grid grid-cols-6 gap-2">
              {t.slots.map((s) => (
                <div
                  key={s.id}
                  title={s.status === "BOOKED" ? (s.teamName || `Slot ${s.slotNumber}`) : `Slot ${s.slotNumber} — Available`}
                  className={`flex items-center justify-center h-10 w-full rounded-lg text-xs font-bold border transition-colors ${
                    s.status === "BOOKED"
                      ? "bg-primary text-white border-primary"
                      : "bg-muted/50 text-muted-foreground border-border"
                  }`}
                >
                  {s.slotNumber}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary inline-block" /> Booked ({t.teamFormat === "solo" ? `${t.participantCount} slots` : `${t.participantCount} teams` })</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-muted border border-border inline-block" /> Available ({t.teamFormat === "solo" ? `${t.totalSlots - t.participantCount} slots` : `${t.totalSlots - t.participantCount} teams` })</span>
            </div>
          </div>
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {t.participants.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No participants yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-border/50 bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Player</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Game Name / UID</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fee Paid</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Joined At</th>
                    {isActive && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {t.participants.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{p.userName}</div>
                        <div className="text-xs text-muted-foreground">{p.userEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.userGameName || "—"}
                        {p.userUid && <span className="text-xs text-muted-foreground ml-1">#{p.userUid}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {p.entryFeePaid > 0
                          ? <span className="text-primary font-medium">{p.entryFeePaid}c</span>
                          : <span className="text-success">Free</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {format(new Date(p.createdAt), "dd MMM, h:mm a")}
                      </td>
                      {isActive && (
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => { setRemoveDialogUserId(p.userId); setRemoveRefund(p.entryFeePaid > 0); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* Room Credentials Tab */}
        <TabsContent value="room">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4 max-w-md">
            <div>
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Key className="h-5 w-5 text-foreground" /> Room Credentials
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Setting these will automatically change status to ROOM_REVEALED and notify all participants.
              </p>
            </div>
            {t.status === "ROOM_REVEALED" || t.roomId ? (
              <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success">
                <Check className="h-4 w-4 inline mr-1" /> Credentials already set — you can update them below.
              </div>
            ) : null}
            <div>
              <Label>Room ID *</Label>
              <Input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="e.g. 1234567" className="mt-1" />
            </div>
            <div>
              <Label>Room Password *</Label>
              <Input value={roomPwd} onChange={(e) => setRoomPwd(e.target.value)} placeholder="e.g. abc123" className="mt-1" />
            </div>
            <Button
              onClick={handleRevealRoom}
              disabled={revealingRoom || !isActive}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {revealingRoom ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
              {t.roomId ? "Update Credentials" : "Reveal Room"}
            </Button>
          </div>
        </TabsContent>

        {/* Declare Winners Tab */}
        <TabsContent value="winners" className="space-y-4">
          {t.winners.length > 0 ? (
            <div className="bg-card rounded-xl border border-border p-5">
              <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Crown className="h-5 w-5 text-foreground" /> Declared Winners
              </h2>
              <div className="space-y-2">
                {t.winners.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-yellow-100">
                    <div>
                      <span className="font-semibold text-yellow-800">{w.placement}</span>
                      <span className="text-sm text-muted-foreground ml-3">{w.userName}</span>
                      {w.userGameName && <span className="text-xs text-muted-foreground ml-1">({w.userGameName})</span>}
                    </div>
                    <span className="text-primary font-semibold">{w.prizeAmount}c</span>
                  </div>
                ))}
              </div>
            </div>
          ) : canDeclare ? (
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <div>
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Crown className="h-5 w-5 text-foreground" /> Declare Winners
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Prize coins will be automatically credited to winners&apos; wallets. Tournament will be marked COMPLETED.
                </p>
              </div>

              {winners.map((w, i) => (
                <div key={i} className="p-4 border border-border rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">Winner #{i + 1}</span>
                    {i > 0 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        onClick={() => setWinners((ws) => ws.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Participant</Label>
                      <Select value={w.userId} onValueChange={(v) => setWinners((ws) => ws.map((wr, j) => j === i ? { ...wr, userId: v } : wr))}>
                        <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          {t.participants.map((p) => (
                            <SelectItem key={p.userId} value={p.userId}>{p.userName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Placement</Label>
                      <Select value={w.placement} onValueChange={(v) => setWinners((ws) => ws.map((wr, j) => j === i ? { ...wr, placement: v } : wr))}>
                        <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PLACEMENTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {w.placement === "Custom" && (
                        <Input className="mt-1 h-8 text-xs" placeholder="e.g. MVP"
                          value={w.customPlacement}
                          onChange={(e) => setWinners((ws) => ws.map((wr, j) => j === i ? { ...wr, customPlacement: e.target.value } : wr))}
                        />
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">Prize (coins)</Label>
                      <Input type="number" min={0} className="mt-1 h-9"
                        value={w.prizeAmount}
                        onChange={(e) => setWinners((ws) => ws.map((wr, j) => j === i ? { ...wr, prizeAmount: Number(e.target.value) } : wr))}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setWinners((ws) => [...ws, { userId: "", slotId: "", placement: "2nd", prizeAmount: 0, customPlacement: "" }])}>
                  <Plus className="h-4 w-4 mr-1" /> Add Winner
                </Button>
                <Button onClick={handleDeclareWinners} disabled={declaringWinners} className="bg-yellow-500 hover:bg-yellow-600 text-white">
                  {declaringWinners ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trophy className="h-4 w-4 mr-2" />}
                  Declare Winners & Credit Prizes
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
              <Crown className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Winners can only be declared after the tournament has started.</p>
            </div>
          )}
        </TabsContent>

        {/* Danger Zone */}
        {canCancel && (
          <TabsContent value="danger">
            <div className="bg-card rounded-xl border border-destructive/20 p-5 space-y-4 max-w-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-foreground" />
                <h2 className="font-semibold text-destructive">Cancel Tournament</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Cancelling will notify all participants and automatically refund entry fees to their wallets.
                This action cannot be undone.
              </p>
              <div>
                <Label>Cancellation Reason *</Label>
                <Textarea
                  value={cancelReason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCancelReason(e.target.value)}
                  placeholder="Explain why the tournament is being cancelled…"
                  rows={3}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={() => setCancelDialogOpen(true)}
                disabled={!cancelReason.trim()}
                className="bg-destructive hover:bg-destructive text-white"
              >
                <XCircle className="h-4 w-4 mr-2" /> Cancel Tournament
              </Button>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Cancel confirmation */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Tournament?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel &quot;{t.name}&quot;, refund all entry fees, and notify all participants. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={cancelling} className="bg-destructive hover:bg-destructive">
              {cancelling ? "Cancelling…" : "Yes, Cancel Tournament"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove participant confirmation */}
      <AlertDialog open={!!removeDialogUserId} onOpenChange={(open) => !open && setRemoveDialogUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Participant?</AlertDialogTitle>
            <AlertDialogDescription>This participant will be removed and their slot freed.</AlertDialogDescription>
          </AlertDialogHeader>
          {t.participants.find((p) => p.userId === removeDialogUserId)?.entryFeePaid ? (
            <div className="px-6 py-2 flex items-center gap-3">
              <Switch id="refundToggle" checked={removeRefund} onCheckedChange={setRemoveRefund} />
              <Label htmlFor="refundToggle" className="cursor-pointer">
                Refund entry fee ({t.participants.find((p) => p.userId === removeDialogUserId)?.entryFeePaid}c) to wallet
              </Label>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveParticipant} disabled={removing} className="bg-destructive hover:bg-destructive">
              {removing ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
