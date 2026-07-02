"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Users,
  Trophy,
  Key,
  XCircle,
  Crown,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
  UPCOMING: "bg-blue-100 text-blue-700 border-blue-200",
  ACTIVE: "bg-success/20 text-success border-success/20",
  ROOM_REVEALED: "bg-primary/20 text-primary/90 border-primary/20",
  LIVE: "bg-success/20 text-success border-success/20",
  FINISHED: "bg-muted text-muted-foreground border-border",
  COMPLETED: "bg-purple-100 text-purple-700 border-purple-200",
  CANCELLED: "bg-red-100 text-destructive border-destructive/20",
};

const STATUSES = [
  "UPCOMING",
  "ACTIVE",
  "ROOM_REVEALED",
  "LIVE",
  "FINISHED",
  "COMPLETED",
  "CANCELLED",
];
const PLACEMENTS = ["1st", "2nd", "3rd", "4th", "5th", "Custom"];

interface Tournament {
  id: string;
  name: string;
  type: string;
  joiningFee: number;
  prizePool: number;
  gameMode: string;
  teamFormat: string;
  maps: string[];
  totalSlots: number;
  startTime: string;
  registrationDeadline: string;
  endTime?: string | null;
  descriptionHtml?: string | null;
  rulesHtml?: string | null;
  status: string;
  roomId?: string | null;
  roomPassword?: string | null;
  slots: {
    id: string;
    slotNumber: number;
    status: string;
    teamName?: string | null;
    ignList: string[];
  }[];
  participants: {
    id: string;
    userId: string;
    slotId: string;
    entryFeePaid: number;
    createdAt: string;
    userName: string;
    userEmail: string;
    userGameName?: string | null;
    userUid?: string | null;
    userImage?: string | null;
  }[];
  winners: {
    id: string;
    userId: string;
    placement: string;
    prizeAmount: number;
    userName: string;
    userGameName?: string | null;
  }[];
  participantCount: number;
}

interface WinnerForm {
  userId: string;
  slotId: string;
  placement: string;
  prizeAmount: number;
  customPlacement: string;
}

interface ManageTournamentClientProps {
  id: string;
  initialData: Tournament;
  dynamicSlug: string;
}

export default function ManageTournamentClient({
  id: tournamentId,
  initialData,
  dynamicSlug,
}: ManageTournamentClientProps) {
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
  const [winners, setWinners] = useState<WinnerForm[]>([
    {
      userId: "",
      slotId: "",
      placement: "1st",
      prizeAmount: 0,
      customPlacement: "",
    },
  ]);
  const [declaringWinners, setDeclaringWinners] = useState(false);

  // Cancel
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Remove participant
  const [removeDialogUserId, setRemoveDialogUserId] = useState<string | null>(
    null
  );
  const [removeRefund, setRemoveRefund] = useState(false);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}`);
      if (!res.ok) {
        toast.error("Tournament not found");
        router.push(`/${dynamicSlug}/tournaments`);
        return;
      }
      const data: Tournament = await res.json();
      setT(data);
      setNewStatus(data.status);
      setRoomId(data.roomId ?? "");
      setRoomPwd(data.roomPassword ?? "");
    } catch {
      toast.error("Failed to load tournament");
    } finally {
      setLoading(false);
    }
  }, [tournamentId, dynamicSlug, router]);

  useEffect(() => {
    if (t.id !== tournamentId) {
      load();
    }
  }, [tournamentId, t.id, load]);

  async function handleRevealRoom() {
    if (!roomId.trim() || !roomPwd.trim())
      return toast.error("Both Room ID and Password are required");
    setRevealingRoom(true);
    try {
      const res = await fetch(
        `/api/admin/tournaments/${tournamentId}/room-credentials`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: roomId.trim(),
            roomPassword: roomPwd.trim(),
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success("Room credentials set and participants notified!");
        router.refresh();
        load();
      } else toast.error(data.error || "Failed to set room credentials");
    } catch {
      toast.error("Failed to set room credentials");
    } finally {
      setRevealingRoom(false);
    }
  }

  async function handleStatusChange() {
    if (!newStatus || newStatus === t?.status) return;
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Status updated");
        router.refresh();
        load();
      } else toast.error(data.error || "Failed to update status");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleDeclareWinners() {
    const payload = winners.map((w) => ({
      userId: w.userId,
      slotId: w.slotId || undefined,
      placement:
        w.placement === "Custom" ? w.customPlacement : w.placement,
      prizeAmount: Number(w.prizeAmount) || 0,
    }));
    if (payload.some((w) => !w.userId))
      return toast.error("All winners must have a user selected");
    if (payload.some((w) => !w.placement))
      return toast.error("All winners must have a placement");

    setDeclaringWinners(true);
    try {
      const res = await fetch(
        `/api/admin/tournaments/${tournamentId}/declare-winners`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ winners: payload }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success("Winners declared and prizes credited!");
        router.refresh();
        load();
      } else toast.error(data.error || "Failed to declare winners");
    } catch {
      toast.error("Failed to declare winners");
    } finally {
      setDeclaringWinners(false);
    }
  }

  async function handleCancel() {
    if (!cancelReason.trim())
      return toast.error("Cancellation reason is required");
    setCancelling(true);
    try {
      const res = await fetch(
        `/api/admin/tournaments/${tournamentId}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: cancelReason.trim() }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Tournament cancelled. ${data.refundsProcessed} refunds processed.`
        );
        setCancelDialogOpen(false);
        router.refresh();
        load();
      } else toast.error(data.error || "Failed to cancel");
    } catch {
      toast.error("Failed to cancel tournament");
    } finally {
      setCancelling(false);
    }
  }

  async function handleRemoveParticipant() {
    if (!removeDialogUserId) return;
    setRemoving(true);
    try {
      const res = await fetch(
        `/api/admin/tournaments/${tournamentId}/participants/${removeDialogUserId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refund: removeRefund }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(
          data.refunded
            ? `Participant removed. ₹${data.refundAmount} coins refunded.`
            : "Participant removed."
        );
        setRemoveDialogUserId(null);
        router.refresh();
        load();
      } else toast.error(data.error || "Failed to remove participant");
    } catch {
      toast.error("Failed to remove participant");
    } finally {
      setRemoving(false);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  if (!t) return null;

  const isActive = !["COMPLETED", "CANCELLED"].includes(t.status);
  const canDeclare = !["COMPLETED", "CANCELLED", "UPCOMING"].includes(
    t.status
  );
  const canCancel = !["COMPLETED", "CANCELLED"].includes(t.status);

  return (
    <div className="w-full min-w-0 px-3 pb-8 pt-4 sm:px-4 md:px-6 lg:px-8">
      {/* Header */}
      <div className="sticky top-0 z-30 -mx-3 border-b border-border bg-background/95 px-3 pb-3 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-4 sm:px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href={`/${dynamicSlug}/tournaments`} prefetch={true}>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
                {t.name}
              </h1>
              <span
                className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium sm:text-xs ${STATUS_COLORS[t.status] ?? ""
                  }`}
              >
                {t.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {t.gameMode.replace(/_/g, " ")} · {t.teamFormat} ·{" "}
              {t.teamFormat === "solo"
                ? `${t.participantCount}/${t.totalSlots} slots`
                : `${t.participantCount}/${t.totalSlots} teams (${t.participantCount * (t.teamFormat === "squad" ? 4 : 2)}/${t.totalSlots * (t.teamFormat === "squad" ? 4 : 2)} spots)`}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="mt-4">
        <div className="-mx-1 overflow-x-auto px-1 pb-3 scrollbar-hide">
          <TabsList className="inline-flex h-auto min-w-max gap-1 rounded-2xl border border-border bg-muted/60 p-1">
            <TabsTrigger
              value="overview"
              className="flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm sm:min-h-10 sm:text-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="participants"
              className="flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm sm:min-h-10 sm:text-sm"
            >
              Participants ({t.participantCount})
            </TabsTrigger>
            <TabsTrigger
              value="room"
              className="flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm sm:min-h-10 sm:text-sm"
            >
              Room
            </TabsTrigger>
            <TabsTrigger
              value="winners"
              className="flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm sm:min-h-10 sm:text-sm"
            >
              Winners
            </TabsTrigger>
            {canCancel && (
              <TabsTrigger
                value="danger"
                className="flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-destructive data-[state=active]:bg-background data-[state=active]:shadow-sm sm:min-h-10 sm:text-sm"
              >
                Danger
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Overview */}
        <TabsContent value="overview" className="mt-0 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-foreground sm:text-base">
              Status
            </h2>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="h-10 w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleStatusChange}
                disabled={changingStatus || newStatus === t.status}
                className="h-10"
              >
                {changingStatus ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Update Status
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Type", value: t.type },
              {
                label: "Entry Fee",
                value:
                  t.type === "FREE" ? "Free" : `${t.joiningFee} coins`,
              },
              { label: "Winning Price", value: `${t.prizePool} coins` },
              {
                label: t.teamFormat === "solo" ? "Slots" : "Teams",
                value:
                  t.teamFormat === "solo"
                    ? `${t.participantCount}/${t.totalSlots}`
                    : `${t.participantCount}/${t.totalSlots} (${t.participantCount * (t.teamFormat === "squad" ? 4 : 2)}/${t.totalSlots * (t.teamFormat === "squad" ? 4 : 2)} spots)`,
              },
              {
                label: "Start Time",
                value: format(
                  new Date(t.startTime),
                  "dd MMM yyyy, h:mm a"
                ),
              },
              {
                label: "Reg. Deadline",
                value: format(
                  new Date(t.registrationDeadline),
                  "dd MMM yyyy, h:mm a"
                ),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground sm:text-xs">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground sm:text-base">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Slot Grid */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-foreground sm:text-base">
              Slot Overview
            </h2>
            <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
              {t.slots.map((s) => (
                <div
                  key={s.id}
                  title={
                    s.status === "BOOKED"
                      ? s.teamName || `Slot ${s.slotNumber}`
                      : `Slot ${s.slotNumber} — Available`
                  }
                  className={`flex h-10 items-center justify-center rounded-lg border text-xs font-bold transition-colors ${s.status === "BOOKED"
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-muted/50 text-muted-foreground"
                    }`}
                >
                  {s.slotNumber}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded bg-primary" />{" "}
                Booked (
                {t.teamFormat === "solo"
                  ? `${t.participantCount} slots`
                  : `${t.participantCount} teams`}
                )
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded border border-border bg-muted" />{" "}
                Available (
                {t.teamFormat === "solo"
                  ? `${t.totalSlots - t.participantCount} slots`
                  : `${t.totalSlots - t.participantCount} teams`}
                )
              </span>
            </div>
          </div>
        </TabsContent>

        {/* Participants */}
        <TabsContent value="participants" className="mt-0">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {t.participants.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="mx-auto mb-2 h-8 w-8 opacity-30" />
                <p className="text-sm">No participants yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/50 bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                        Player
                      </th>
                      <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground sm:table-cell">
                        Game Name / UID
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                        Fee
                      </th>
                      <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground md:table-cell">
                        Joined
                      </th>
                      {isActive && <th className="px-4 py-3" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {t.participants.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-muted/50"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {p.userName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {p.userEmail}
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                          {p.userGameName || "—"}
                          {p.userUid && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              #{p.userUid}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {p.entryFeePaid > 0 ? (
                            <span className="font-medium text-primary">
                              {p.entryFeePaid}c
                            </span>
                          ) : (
                            <span className="text-success">Free</span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                          {format(new Date(p.createdAt), "dd MMM, h:mm a")}
                        </td>
                        {isActive && (
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => {
                                setRemoveDialogUserId(p.userId);
                                setRemoveRefund(p.entryFeePaid > 0);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Room */}
        <TabsContent value="room" className="mt-0">
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground sm:text-base">
                <Key className="h-5 w-5" /> Room Credentials
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Setting these will change status to ROOM_REVEALED and notify
                participants.
              </p>
            </div>
            {t.status === "ROOM_REVEALED" || t.roomId ? (
              <div className="mt-3 rounded-lg border border-success/20 bg-success/10 p-3 text-sm text-success">
                <Check className="mr-1 inline h-4 w-4" /> Credentials set —
                update below.
              </div>
            ) : null}
            <div className="mt-4 space-y-3">
              <div>
                <Label>Room ID *</Label>
                <Input
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="e.g. 1234567"
                  className="mt-1 h-10"
                />
              </div>
              <div>
                <Label>Room Password *</Label>
                <Input
                  value={roomPwd}
                  onChange={(e) => setRoomPwd(e.target.value)}
                  placeholder="e.g. abc123"
                  className="mt-1 h-10"
                />
              </div>
              <Button
                onClick={handleRevealRoom}
                disabled={revealingRoom || !isActive}
                className="h-10"
              >
                {revealingRoom ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Key className="mr-2 h-4 w-4" />
                )}
                {t.roomId ? "Update Credentials" : "Reveal Room"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Winners */}
        <TabsContent value="winners" className="mt-0 space-y-4">
          {t.winners.length > 0 ? (
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground sm:text-base">
                <Crown className="h-5 w-5" /> Declared Winners
              </h2>
              <div className="space-y-2">
                {t.winners.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-lg border border-yellow-100 bg-warning/10 p-3"
                  >
                    <div>
                      <span className="font-semibold text-yellow-800">
                        {w.placement}
                      </span>
                      <span className="ml-3 text-sm text-muted-foreground">
                        {w.userName}
                      </span>
                      {w.userGameName && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({w.userGameName})
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-primary">
                      {w.prizeAmount}c
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : canDeclare ? (
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground sm:text-base">
                  <Crown className="h-5 w-5" /> Declare Winners
                </h2>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  Prize coins will be credited to winners. Tournament marked
                  COMPLETED.
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {winners.map((w, i) => (
                  <div
                    key={i}
                    className="space-y-3 rounded-xl border border-border p-3 sm:p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground sm:text-sm">
                        Winner #{i + 1}
                      </span>
                      {i > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() =>
                            setWinners((ws) =>
                              ws.filter((_, j) => j !== i)
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <Label className="text-xs">Participant</Label>
                        <Select
                          value={w.userId}
                          onValueChange={(v) =>
                            setWinners((ws) =>
                              ws.map((wr, j) =>
                                j === i ? { ...wr, userId: v } : wr
                              )
                            )
                          }
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue placeholder="Select…" />
                          </SelectTrigger>
                          <SelectContent>
                            {t.participants.map((p) => (
                              <SelectItem key={p.userId} value={p.userId}>
                                {p.userName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Placement</Label>
                        <Select
                          value={w.placement}
                          onValueChange={(v) =>
                            setWinners((ws) =>
                              ws.map((wr, j) =>
                                j === i ? { ...wr, placement: v } : wr
                              )
                            )
                          }
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLACEMENTS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {w.placement === "Custom" && (
                          <Input
                            className="mt-1 h-8 text-xs"
                            placeholder="e.g. MVP"
                            value={w.customPlacement}
                            onChange={(e) =>
                              setWinners((ws) =>
                                ws.map((wr, j) =>
                                  j === i
                                    ? {
                                      ...wr,
                                      customPlacement: e.target.value,
                                    }
                                    : wr
                                )
                              )
                            }
                          />
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">Prize (coins)</Label>
                        <Input
                          type="number"
                          min={0}
                          className="mt-1 h-9"
                          value={w.prizeAmount}
                          onChange={(e) =>
                            setWinners((ws) =>
                              ws.map((wr, j) =>
                                j === i
                                  ? {
                                    ...wr,
                                    prizeAmount: Number(e.target.value),
                                  }
                                  : wr
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() =>
                    setWinners((ws) => [
                      ...ws,
                      {
                        userId: "",
                        slotId: "",
                        placement: "2nd",
                        prizeAmount: 0,
                        customPlacement: "",
                      },
                    ])
                  }
                  className="h-10"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Winner
                </Button>
                <Button
                  onClick={handleDeclareWinners}
                  disabled={declaringWinners}
                  className="h-10 bg-yellow-500 text-white hover:bg-yellow-600"
                >
                  {declaringWinners ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trophy className="mr-2 h-4 w-4" />
                  )}
                  Declare Winners & Credit Prizes
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
              <Crown className="mx-auto mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">
                Winners can only be declared after tournament has started.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Danger Zone */}
        {canCancel && (
          <TabsContent value="danger" className="mt-0">
            <div className="mx-auto max-w-lg rounded-2xl border border-destructive/20 bg-card p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <h2 className="font-semibold text-destructive">
                  Cancel Tournament
                </h2>
              </div>
              <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                Cancelling will notify participants and refund entry fees. This
                cannot be undone.
              </p>
              <div className="mt-4">
                <Label>Cancellation Reason *</Label>
                <Textarea
                  value={cancelReason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setCancelReason(e.target.value)
                  }
                  placeholder="Explain why the tournament is being cancelled…"
                  rows={3}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={() => setCancelDialogOpen(true)}
                disabled={!cancelReason.trim()}
                className="mt-4 h-10 bg-destructive text-white hover:bg-destructive"
              >
                <XCircle className="mr-2 h-4 w-4" /> Cancel Tournament
              </Button>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Cancel confirmation */}
      <AlertDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
      >
        <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-sm rounded-2xl sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Tournament?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel &quot;{t.name}&quot;, refund all entry fees,
              and notify participants. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="h-10 w-full sm:w-auto">
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="h-10 w-full bg-destructive hover:bg-destructive sm:w-auto"
            >
              {cancelling ? "Cancelling…" : "Yes, Cancel Tournament"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove participant confirmation */}
      <AlertDialog
        open={!!removeDialogUserId}
        onOpenChange={(open) => !open && setRemoveDialogUserId(null)}
      >
        <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-sm rounded-2xl sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Participant?</AlertDialogTitle>
            <AlertDialogDescription>
              This participant will be removed and their slot freed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {t.participants.find((p) => p.userId === removeDialogUserId)
            ?.entryFeePaid ? (
            <div className="flex items-center gap-3 px-6 py-2">
              <Switch
                id="refundToggle"
                checked={removeRefund}
                onCheckedChange={setRemoveRefund}
              />
              <Label htmlFor="refundToggle" className="cursor-pointer">
                Refund entry fee (
                {
                  t.participants.find((p) => p.userId === removeDialogUserId)
                    ?.entryFeePaid
                }
                c) to wallet
              </Label>
            </div>
          ) : null}
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="h-10 w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveParticipant}
              disabled={removing}
              className="h-10 w-full bg-destructive hover:bg-destructive sm:w-auto"
            >
              {removing ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}