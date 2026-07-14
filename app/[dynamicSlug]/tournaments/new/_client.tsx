"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft,
  Plus,
  Info,
  Gamepad2,
  Users,
  Trophy,
  Clock,
  FileText,
  Shield,
  Calendar,
  MapPin,
  Loader2,
  Check,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// ─────────────────────────────────────────────────────────────────────────────
// TODO: These should be fetched from API / site_config to be fully DB-driven
// For now, keeping as constants but UI is ready to accept dynamic data
// ─────────────────────────────────────────────────────────────────────────────
const GAME_MODES = ["battle_royale", "clash_squad", "lone_wolf"];
const TEAM_FORMATS = ["solo", "duo", "squad"];
const MAP_OPTIONS = ["Bermuda", "Purgatory", "Kalahari", "Alpine", "Nexterra"];

function toDatetimeLocal(d: Date) {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

interface ContentTemplate {
  id: string;
  name: string;
  type: string;
  contentHtml: string;
  contentMarkdown: string;
}

function slotPreview(format: string, value: number): string {
  if (format === "duo") {
    return `${value} teams × 2 = ${value * 2} spots`;
  }
  if (format === "squad") {
    return `${value} teams × 4 = ${value * 4} spots`;
  }
  return `${value} player slots`;
}

interface NewTournamentClientProps {
  dynamicSlug: string;
}

export default function NewTournamentClient({ dynamicSlug }: NewTournamentClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [descTemplates, setDescTemplates] = useState<ContentTemplate[]>([]);
  const [rulesTemplates, setRulesTemplates] = useState<ContentTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  const [form, setForm] = useState(() => {
    const defaultStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const defaultDeadline = new Date(Date.now() + 22 * 60 * 60 * 1000);
    return {
      name: "",
      type: "FREE" as "FREE" | "PAID",
      joiningFee: 0,
      prizePool: 0,
      gameMode: "battle_royale",
      teamFormat: "solo" as "solo" | "duo" | "squad",
      maps: [] as string[],
      totalSlots: 48,
      startTime: toDatetimeLocal(defaultStart),
      registrationDeadline: toDatetimeLocal(defaultDeadline),
      endTime: "",
      descriptionTemplateId: "",
      rulesTemplateId: "",
      descriptionHtml: "",
      descriptionMarkdown: "",
      rulesHtml: "",
      rulesMarkdown: "",
    };
  });

  useEffect(() => {
    setLoadingTemplates(true);
    Promise.all([
      fetch("/api/admin/content-templates?type=DESCRIPTION").then((r) => r.json()),
      fetch("/api/admin/content-templates?type=RULES").then((r) => r.json()),
    ])
      .then(([descData, rulesData]) => {
        setDescTemplates(Array.isArray(descData) ? descData : descData.data ?? []);
        setRulesTemplates(Array.isArray(rulesData) ? rulesData : rulesData.data ?? []);
      })
      .catch(() => {
        toast.error("Failed to load templates");
      })
      .finally(() => setLoadingTemplates(false));
  }, []);

  const set = useCallback(<K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const toggleMap = useCallback((map: string) => {
    setForm((f) => ({
      ...f,
      maps: f.maps.includes(map) ? f.maps.filter((m) => m !== map) : [...f.maps, map],
    }));
  }, []);

  const applyDescTemplate = useCallback(
    (id: string) => {
      if (id === "none" || !id) {
        setForm((f) => ({
          ...f,
          descriptionTemplateId: "",
          descriptionHtml: "",
          descriptionMarkdown: "",
        }));
        return;
      }
      const t = descTemplates.find((t) => t.id === id);
      if (t) {
        setForm((f) => ({
          ...f,
          descriptionTemplateId: id,
          descriptionHtml: t.contentHtml,
          descriptionMarkdown: t.contentMarkdown,
        }));
      }
    },
    [descTemplates]
  );

  const applyRulesTemplate = useCallback(
    (id: string) => {
      if (id === "none" || !id) {
        setForm((f) => ({
          ...f,
          rulesTemplateId: "",
          rulesHtml: "",
          rulesMarkdown: "",
        }));
        return;
      }
      const t = rulesTemplates.find((t) => t.id === id);
      if (t) {
        setForm((f) => ({
          ...f,
          rulesTemplateId: id,
          rulesHtml: t.contentHtml,
          rulesMarkdown: t.contentMarkdown,
        }));
      }
    },
    [rulesTemplates]
  );

  const slotHint = useMemo(() => slotPreview(form.teamFormat, Number(form.totalSlots)), [form.teamFormat, form.totalSlots]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Tournament name is required");
    if (!form.startTime) return toast.error("Start time is required");
    if (!form.registrationDeadline) return toast.error("Registration deadline is required");

    setSaving(true);
    try {
      const rawSlots =
        form.teamFormat === "duo"
          ? Number(form.totalSlots) * 2
          : form.teamFormat === "squad"
            ? Number(form.totalSlots) * 4
            : Number(form.totalSlots);

      const payload = {
        name: form.name,
        type: form.type,
        joiningFee: Number(form.joiningFee),
        prizePool: Number(form.prizePool),
        gameMode: form.gameMode,
        teamFormat: form.teamFormat,
        maps: form.maps,
        totalSlots: rawSlots,
        startTime: new Date(form.startTime).toISOString(),
        registrationDeadline: new Date(form.registrationDeadline).toISOString(),
        endTime: form.endTime ? new Date(form.endTime).toISOString() : null,
        descriptionHtml: form.descriptionHtml || null,
        descriptionMarkdown: form.descriptionMarkdown || null,
        rulesHtml: form.rulesHtml || null,
        rulesMarkdown: form.rulesMarkdown || null,
      };

      const res = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && (data.success || data.id)) {
        toast.success("Tournament created successfully!");
        router.push(`/${dynamicSlug}/tournaments/${data.id}`);
        router.refresh();
      } else {
        toast.error(data.error || "Failed to create tournament");
        setSaving(false);
      }
    } catch {
      toast.error("Failed to create tournament");
      setSaving(false);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-4 pb-8 sm:space-y-6">
      {/* ─── Sticky Header ─── */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="px-3 pb-4 pt-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/${dynamicSlug}/tournaments`} prefetch={true}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-foreground sm:text-lg">
                  New Tournament
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Create a new tournament. Slots will be generated automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Form Content ─── */}
      <div className="px-3 sm:px-4 md:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-5xl space-y-4 sm:space-y-5">

          {/* Basic Info */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Gamepad2 className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-sm font-semibold text-foreground sm:text-base">
                Basic Information
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-xs font-medium sm:text-sm">
                  Tournament Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Sunday Showdown #12"
                  className="mt-1.5 h-10"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-medium sm:text-sm">Game Mode <span className="text-destructive">*</span></Label>
                  <Select value={form.gameMode} onValueChange={(v) => set("gameMode", v)}>
                    <SelectTrigger className="mt-1.5 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GAME_MODES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium sm:text-sm">Team Format <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.teamFormat}
                    onValueChange={(v: "solo" | "duo" | "squad") => {
                      setForm((f) => {
                        let defaultSlots = 12;
                        if (v === "solo") defaultSlots = 48;
                        else if (v === "duo") defaultSlots = 24;
                        else if (v === "squad") defaultSlots = 12;
                        return { ...f, teamFormat: v, totalSlots: defaultSlots };
                      });
                    }}
                  >
                    <SelectTrigger className="mt-1.5 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_FORMATS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium sm:text-sm">Maps</Label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {MAP_OPTIONS.map((map) => (
                    <button
                      key={map}
                      type="button"
                      onClick={() => toggleMap(map)}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.98] ${form.maps.includes(map)
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-muted/40 text-muted-foreground hover:border-muted-foreground/30 hover:bg-accent"
                        }`}
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {map}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium sm:text-sm">
                  {form.teamFormat === "solo" ? "Total Slots (players)" : "Total Teams"} <span className="text-destructive">*</span>
                </Label>
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={form.totalSlots}
                    onChange={(e) => set("totalSlots", Number(e.target.value))}
                    className="h-10 sm:w-32"
                  />
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-primary/10 bg-primary/5 px-3 py-2 text-xs font-medium text-primary sm:text-sm">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>{slotHint}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/10">
                <Trophy className="h-4 w-4 text-success" />
              </div>
              <h2 className="text-sm font-semibold text-foreground sm:text-base">
                Pricing & Prize
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.type === "PAID"}
                    onCheckedChange={(v) => set("type", v ? "PAID" : "FREE")}
                    id="paidToggle"
                  />
                  <Label htmlFor="paidToggle" className="cursor-pointer text-sm font-medium">
                    Paid Tournament
                  </Label>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${form.type === "PAID"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                    }`}
                >
                  {form.type}
                </span>
              </div>

              {form.type === "PAID" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-medium sm:text-sm">Entry Fee (coins) <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.joiningFee}
                      onChange={(e) => set("joiningFee", Number(e.target.value))}
                      className="mt-1.5 h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium sm:text-sm">Total Prize Pool (coins)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.prizePool}
                      onChange={(e) => set("prizePool", Number(e.target.value))}
                      className="mt-1.5 h-10"
                    />
                  </div>
                </div>
              )}

              {form.type === "FREE" && (
                <div>
                  <Label className="text-xs font-medium sm:text-sm">Prize Pool (coins)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.prizePool}
                    onChange={(e) => set("prizePool", Number(e.target.value))}
                    className="mt-1.5 h-10"
                    placeholder="Optional prize for free tournaments"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info/10">
                <Clock className="h-4 w-4 text-info" />
              </div>
              <h2 className="text-sm font-semibold text-foreground sm:text-base">
                Schedule
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium sm:text-sm">
                  Registration Deadline <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={form.registrationDeadline}
                  onChange={(e) => set("registrationDeadline", e.target.value)}
                  className="mt-1.5 h-10"
                />
              </div>
              <div>
                <Label className="text-xs font-medium sm:text-sm">
                  Start Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => set("startTime", e.target.value)}
                  className="mt-1.5 h-10"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label className="text-xs font-medium sm:text-sm">End Time (optional)</Label>
              <Input
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                className="mt-1.5 h-10"
              />
            </div>
          </div>

          {/* Templates */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10">
                <FileText className="h-4 w-4 text-warning" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground sm:text-base">
                  Rules & Description
                </h2>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Select from pre-built content templates
                </p>
              </div>
            </div>

            {loadingTemplates ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading templates...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-medium sm:text-sm">Description Template</Label>
                  <Select
                    value={form.descriptionTemplateId}
                    onValueChange={applyDescTemplate}
                    disabled={descTemplates.length === 0}
                  >
                    <SelectTrigger className="mt-1.5 h-10">
                      <SelectValue
                        placeholder={descTemplates.length === 0 ? "No templates" : "— None —"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {descTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.descriptionTemplateId && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-success">
                      <Check className="h-3 w-3" /> Template applied
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-medium sm:text-sm">Rules Template</Label>
                  <Select
                    value={form.rulesTemplateId}
                    onValueChange={applyRulesTemplate}
                    disabled={rulesTemplates.length === 0}
                  >
                    <SelectTrigger className="mt-1.5 h-10">
                      <SelectValue
                        placeholder={rulesTemplates.length === 0 ? "No templates" : "— None —"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {rulesTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.rulesTemplateId && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-success">
                      <Check className="h-3 w-3" /> Template applied
                    </p>
                  )}
                </div>
              </div>
            )}

            {!loadingTemplates && descTemplates.length === 0 && rulesTemplates.length === 0 && (
              <div className="mt-4 rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    No templates found. Create them in the <strong>Content Templates</strong> section first.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <Button
              type="submit"
              disabled={saving}
              className="h-11 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating…</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Create Tournament</span>
                </>
              )}
            </Button>
            <Link href={`/${dynamicSlug}/tournaments`} prefetch={true} className="w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full sm:w-auto"
              >
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}