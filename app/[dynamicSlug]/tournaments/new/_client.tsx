"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Plus, Info } from "lucide-react";
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
    return `${value} teams × 2 players = ${value * 2} player spots`;
  }
  if (format === "squad") {
    return `${value} teams × 4 players = ${value * 4} player spots`;
  }
  return `${value} individual player slots`;
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

  const defaultStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const defaultDeadline = new Date(Date.now() + 22 * 60 * 60 * 1000);

  const [form, setForm] = useState({
    name: "",
    type: "FREE",
    joiningFee: 0,
    prizePool: 0,
    gameMode: "battle_royale",
    teamFormat: "solo",
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
  });

  useEffect(() => {
    setLoadingTemplates(true);
    Promise.all([
      fetch("/api/admin/content-templates?type=DESCRIPTION").then(r => r.json()),
      fetch("/api/admin/content-templates?type=RULES").then(r => r.json()),
    ]).then(([descData, rulesData]) => {
      setDescTemplates(Array.isArray(descData) ? descData : (descData.data ?? []));
      setRulesTemplates(Array.isArray(rulesData) ? rulesData : (rulesData.data ?? []));
    }).catch(() => {}).finally(() => setLoadingTemplates(false));
  }, []);

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleMap(map: string) {
    set("maps", form.maps.includes(map) ? form.maps.filter((m) => m !== map) : [...form.maps, map]);
  }

  function applyDescTemplate(id: string) {
    const t = descTemplates.find(t => t.id === id);
    if (t) {
      set("descriptionTemplateId", id);
      set("descriptionHtml", t.contentHtml);
      set("descriptionMarkdown", t.contentMarkdown);
    }
  }

  function applyRulesTemplate(id: string) {
    const t = rulesTemplates.find(t => t.id === id);
    if (t) {
      set("rulesTemplateId", id);
      set("rulesHtml", t.contentHtml);
      set("rulesMarkdown", t.contentMarkdown);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Tournament name is required");
    if (!form.startTime) return toast.error("Start time is required");
    if (!form.registrationDeadline) return toast.error("Registration deadline is required");

    setSaving(true);
    try {
      const rawSlots = form.teamFormat === "duo"
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

      if (data.success) {
        toast.success("Tournament created!");
        router.push(`/${dynamicSlug}/tournaments/${data.id}`);
      } else {
        toast.error(data.error || "Failed to create tournament");
      }
    } catch {
      toast.error("Failed to create tournament");
    } finally {
      setSaving(false);
    }
  }

  const slotHint = slotPreview(form.teamFormat, Number(form.totalSlots));

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${dynamicSlug}/tournaments`} prefetch={true}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Tournament</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fill in the details below. Slots will be created automatically.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="font-semibold text-foreground">Basic Information</h2>

          <div>
            <Label htmlFor="name">Tournament Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Sunday Showdown #12"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gameMode">Game Mode *</Label>
              <Select value={form.gameMode} onValueChange={(v) => set("gameMode", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GAME_MODES.map((m) => (
                    <SelectItem key={m} value={m}>{m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="teamFormat">Team Format *</Label>
              <Select
                value={form.teamFormat}
                onValueChange={(v) => {
                  setForm((f) => {
                    let defaultSlots = 12;
                    if (v === "solo") defaultSlots = 48;
                    else if (v === "duo") defaultSlots = 24;
                    else if (v === "squad") defaultSlots = 12;
                    return { ...f, teamFormat: v, totalSlots: defaultSlots };
                  });
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEAM_FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Maps</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {MAP_OPTIONS.map((map) => (
                <button
                  key={map}
                  type="button"
                  onClick={() => toggleMap(map)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    form.maps.includes(map)
                      ? "bg-primary text-white border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-muted"
                  }`}
                >
                  {map}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="totalSlots">
              {form.teamFormat === "solo" ? "Total Slots (players) *" : "Total Teams *"}
            </Label>
            <div className="flex items-center gap-3 mt-1">
              <Input
                id="totalSlots"
                type="number"
                min={1}
                max={500}
                value={form.totalSlots}
                onChange={(e) => set("totalSlots", e.target.value)}
                className="w-32"
              />
              <div className="flex items-center gap-1.5 text-sm text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/10">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span>{slotHint}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="font-semibold text-foreground">Pricing & Prize</h2>

          <div className="flex items-center gap-3">
            <Switch
              checked={form.type === "PAID"}
              onCheckedChange={(v) => set("type", v ? "PAID" : "FREE")}
              id="paidToggle"
            />
            <Label htmlFor="paidToggle">Paid Tournament</Label>
          </div>

          {form.type === "PAID" && (
            <div>
              <Label htmlFor="joiningFee">Entry Fee (₹) *</Label>
              <Input
                id="joiningFee"
                type="number"
                min={0}
                value={form.joiningFee}
                onChange={(e) => set("joiningFee", e.target.value)}
                className="mt-1 w-40"
              />
            </div>
          )}

          <div>
            <Label htmlFor="prizePool">Total Prize Pool (₹)</Label>
            <Input
              id="prizePool"
              type="number"
              min={0}
              value={form.prizePool}
              onChange={(e) => set("prizePool", e.target.value)}
              className="mt-1 w-40"
            />
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="font-semibold text-foreground">Schedule</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="registrationDeadline">Registration Deadline *</Label>
              <Input
                id="registrationDeadline"
                type="datetime-local"
                value={form.registrationDeadline}
                onChange={(e) => set("registrationDeadline", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="w-64">
            <Label htmlFor="endTime">End Time (optional)</Label>
            <Input
              id="endTime"
              type="datetime-local"
              value={form.endTime}
              onChange={(e) => set("endTime", e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {/* Description & Rules — template dropdowns */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-5">
          <h2 className="font-semibold text-foreground">Rules / Description</h2>
          <p className="text-sm text-muted-foreground -mt-2">Select a pre-built template for description and rules. Templates are managed in the content templates section.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <Label>Description Template</Label>
              <Select
                value={form.descriptionTemplateId}
                onValueChange={applyDescTemplate}
                disabled={loadingTemplates}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={loadingTemplates ? "Loading…" : "— None (no description) —"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {descTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.descriptionTemplateId && (
                <p className="text-xs text-success mt-1.5 flex items-center gap-1">
                  ✓ Template applied
                </p>
              )}
            </div>

            <div>
              <Label>Rules Template</Label>
              <Select
                value={form.rulesTemplateId}
                onValueChange={applyRulesTemplate}
                disabled={loadingTemplates}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={loadingTemplates ? "Loading…" : "— None (no rules) —"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {rulesTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.rulesTemplateId && (
                <p className="text-xs text-success mt-1.5 flex items-center gap-1">
                  ✓ Template applied
                </p>
              )}
            </div>
          </div>

          {descTemplates.length === 0 && rulesTemplates.length === 0 && !loadingTemplates && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              No templates found. Create some in <strong>Content Templates</strong> section first, then come back to pick them here.
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-white">
            {saving ? (
              <>
                <span className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                Creating…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" /> Create Tournament
              </>
            )}
          </Button>
          <Link href={`/${dynamicSlug}/tournaments`} prefetch={true}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
