"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Copy,
  Send,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  LayoutTemplate,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

export interface Template {
  id: string;
  name: string;
  subject: string;
  previewText: string | null;
  bodyHtml: string;
  designJson: string | null;
  templateKey: string | null;
  variables: string | null;
  variablesSchema: string | null;
  description: string | null;
  category: string;
  editorType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ─── TODO: Fetch from API / site_config for full DB-driven ─── */
const CATEGORIES = [
  "all",
  "auth",
  "wallet",
  "tournaments",
  "notifications",
  "marketing",
  "system",
];

const CATEGORY_COLORS: Record<string, string> = {
  auth: "bg-blue-500/10 text-blue-600 border-blue-200/50",
  wallet: "bg-emerald-500/10 text-emerald-600 border-emerald-200/50",
  tournaments: "bg-amber-500/10 text-amber-600 border-amber-200/50",
  notifications: "bg-purple-500/10 text-purple-600 border-purple-200/50",
  marketing: "bg-rose-500/10 text-rose-600 border-rose-200/50",
  system: "bg-muted/80 text-muted-foreground border-border",
};

const CATEGORY_ICONS: Record<string, string> = {
  auth: "🔐",
  wallet: "💰",
  tournaments: "🏆",
  notifications: "🔔",
  marketing: "📢",
  system: "⚙️",
};

const emptyForm = {
  name: "",
  subject: "",
  previewText: "",
  description: "",
  category: "system",
  editorType: "html",
  isActive: true,
};

export default function EmailTemplatesClient({
  initialTemplates,
  adminSlug,
}: {
  initialTemplates: Template[];
  adminSlug: string;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>(initialTemplates ?? []);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Create dialog
  const [createDialog, setCreateDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete dialog (replaced confirm with proper AlertDialog)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });
  const [deleting, setDeleting] = useState(false);

  // Test send dialog
  const [testDialog, setTestDialog] = useState(false);
  const [testTemplateId, setTestTemplateId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/email-templates");
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  const setF = useCallback(
    <K extends keyof typeof emptyForm>(key: K, val: (typeof emptyForm)[K]) => {
      setForm((f) => ({ ...f, [key]: val }));
    },
    []
  );

  const handleCreate = useCallback(async () => {
    if (!form.name.trim() || !form.subject.trim()) {
      toast.error("Name and subject are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, bodyHtml: "" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast.success("Template created. Opening designer...");
      setCreateDialog(false);
      setForm(emptyForm);
      await loadTemplates();
      router.push(`/${adminSlug}/email-templates/${data.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error creating template.");
    } finally {
      setSaving(false);
    }
  }, [form, adminSlug, router, loadTemplates]);

  const handleDelete = useCallback(async () => {
    if (!deleteDialog.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${deleteDialog.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Template deleted.");
      await loadTemplates();
      router.refresh();
    } catch {
      toast.error("Failed to delete template.");
    } finally {
      setDeleting(false);
      setDeleteDialog({ open: false, id: "", name: "" });
    }
  }, [deleteDialog.id, loadTemplates, router]);

  const handleDuplicate = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/admin/email-templates/${id}/duplicate`, {
          method: "POST",
        });
        const data = await res.json();
        if (data.ok) {
          toast.success(`Duplicated as "${data.name}"`);
          await loadTemplates();
        } else {
          toast.error("Duplication failed.");
        }
      } catch {
        toast.error("Duplication failed.");
      }
    },
    [loadTemplates]
  );

  const handleToggleActive = useCallback(
    async (t: Template) => {
      try {
        const res = await fetch(`/api/admin/email-templates/${t.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !t.isActive }),
        });
        if (!res.ok) throw new Error("Update failed");
        toast.success(`Template ${!t.isActive ? "activated" : "deactivated"}.`);
        await loadTemplates();
      } catch {
        toast.error("Failed to update status.");
      }
    },
    [loadTemplates]
  );

  const openTest = useCallback((id: string) => {
    setTestTemplateId(id);
    setTestEmail("");
    setTestDialog(true);
  }, []);

  const handleTest = useCallback(async () => {
    if (!testEmail || !testTemplateId) return;
    setTestLoading(true);
    try {
      const res = await fetch(
        `/api/admin/email-templates/${testTemplateId}/send-test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: testEmail }),
        }
      );
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message ?? "Test email sent!");
        setTestDialog(false);
        setTestEmail("");
      } else {
        toast.error(data.error ?? "Test failed.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setTestLoading(false);
    }
  }, [testEmail, testTemplateId]);

  const filtered = useMemo(() => {
    let list = templates;
    if (categoryFilter !== "all")
      list = list.filter((t) => t.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [templates, categoryFilter, search]);

  const stats = useMemo(
    () => ({
      total: templates.length,
      active: templates.filter((t) => t.isActive).length,
      inactive: templates.filter((t) => !t.isActive).length,
      byCategory: CATEGORIES.slice(1).map((c) => ({
        category: c,
        count: templates.filter((t) => t.category === c).length,
      })),
    }),
    [templates]
  );

  return (
    <div className="w-full min-w-0 space-y-4 pb-8 sm:space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="px-3 pb-4 pt-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:h-10 sm:w-10">
                <LayoutTemplate className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-foreground sm:text-lg">
                  Email Templates
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Manage transactional email templates
                </p>
              </div>
            </div>
            <Button
              onClick={() => setCreateDialog(true)}
              className="h-10 gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Template</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === "all"
                      ? "All Categories"
                      : `${CATEGORY_ICONS[c] ?? "•"} ${c.charAt(0).toUpperCase() + c.slice(1)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ═══ STATS ═══ */}
      <div className="px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Total",
              value: stats.total,
              color: "text-foreground",
            },
            {
              label: "Active",
              value: stats.active,
              color: "text-emerald-600",
            },
            {
              label: "Inactive",
              value: stats.inactive,
              color: "text-muted-foreground",
            },
            {
              label: "Categories",
              value: stats.byCategory.filter((c) => c.count > 0).length,
              color: "text-foreground",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="card-widget rounded-2xl border border-border/50 bg-card p-3 sm:p-4"
            >
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground sm:text-xs">
                {stat.label}
              </p>
              <p
                className={`mt-1 text-xl font-bold sm:text-2xl ${stat.color}`}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ TEMPLATE LIST ═══ */}
      <div className="px-3 sm:px-4 md:px-6 lg:px-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-border bg-card p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-muted sm:w-48" />
                    <div className="h-3 w-48 rounded bg-muted/60 sm:w-64" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
            <Mail className="mb-4 h-6 w-6 text-muted-foreground/50" />
            <h3 className="text-sm font-semibold text-foreground sm:text-base">
              {templates.length === 0
                ? "No templates yet"
                : "No templates match your filter"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {templates.length === 0
                ? "Create your first email template to get started."
                : "Try adjusting your search or category filter."}
            </p>
            {templates.length === 0 && (
              <Button
                className="mt-5 h-10 gap-2"
                onClick={() => setCreateDialog(true)}
              >
                <Plus className="h-4 w-4" />
                Create First Template
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Table header - desktop only */}
            <div className="hidden rounded-t-2xl border border-b-0 border-border bg-muted/40 px-4 py-2.5 sm:grid sm:grid-cols-[1fr,120px,100px,100px,140px] sm:items-center">
              <span className="text-xs font-medium text-muted-foreground">
                Template
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                Category
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                Updated
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                Status
              </span>
              <span className="text-right text-xs font-medium text-muted-foreground">
                Actions
              </span>
            </div>

            {filtered.map((t) => {
              const varCount = t.variables
                ? (() => {
                  try {
                    return JSON.parse(t.variables).length;
                  } catch {
                    return 0;
                  }
                })()
                : 0;

              return (
                <div
                  key={t.id}
                  className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md sm:grid sm:grid-cols-[1fr,120px,100px,100px,140px] sm:items-center sm:gap-4 sm:rounded-none sm:border-t-0 sm:p-4 sm:shadow-none sm:first:rounded-t-none sm:last:rounded-b-2xl sm:hover:shadow-none"
                >
                  {/* Template info */}
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:h-9 sm:w-9">
                      <Mail className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
                          {t.name}
                        </h3>
                        {/* Category badge - mobile only */}
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize sm:hidden ${CATEGORY_COLORS[t.category] ??
                            "bg-muted text-muted-foreground border-border"
                            }`}
                        >
                          {CATEGORY_ICONS[t.category] ?? "•"} {t.category}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground sm:text-sm">
                        {t.subject}
                      </p>
                      {varCount > 0 && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground/70 sm:text-xs">
                          {varCount} variable{varCount !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Category - desktop */}
                  <div className="hidden sm:block">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${CATEGORY_COLORS[t.category] ??
                        "bg-muted text-muted-foreground border-border"
                        }`}
                    >
                      {CATEGORY_ICONS[t.category] ?? "•"}
                      <span>{t.category}</span>
                    </span>
                  </div>

                  {/* Updated date - desktop */}
                  <div className="hidden sm:block">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(t.updatedAt), "dd MMM yyyy")}
                    </span>
                  </div>

                  {/* Status toggle */}
                  <div className="flex items-center justify-between gap-3 sm:justify-start">
                    <button
                      onClick={() => handleToggleActive(t)}
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors sm:px-2.5 sm:py-1 ${t.isActive
                          ? "border border-emerald-200/50 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                          : "border border-border bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                      {t.isActive ? (
                        <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      ) : (
                        <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      )}
                      <span className="hidden sm:inline">
                        {t.isActive ? "Active" : "Inactive"}
                      </span>
                      <span className="sm:hidden">
                        {t.isActive ? "On" : "Off"}
                      </span>
                    </button>
                    {/* Mobile: show date here */}
                    <span className="text-[11px] text-muted-foreground sm:hidden">
                      {format(new Date(t.updatedAt), "dd MMM")}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-1 border-t border-border pt-3 sm:justify-end sm:border-0 sm:pt-0">
                    <Link
                      href={`/${adminSlug}/email-templates/${t.id}`}
                      className="sm:hidden"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 px-3 text-xs"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Button>
                    </Link>
                    <div className="hidden items-center gap-1 sm:flex">
                      <Link
                        href={`/${adminSlug}/email-templates/${t.id}`}
                        prefetch={true}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                          title="Open designer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                        title="Send test email"
                        onClick={() => openTest(t.id)}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                        title="Duplicate"
                        onClick={() => handleDuplicate(t.id)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Delete"
                        onClick={() =>
                          setDeleteDialog({ open: true, id: t.id, name: t.name })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {/* Mobile secondary actions */}
                    <div className="flex items-center gap-1 sm:hidden">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openTest(t.id)}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDuplicate(t.id)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() =>
                          setDeleteDialog({ open: true, id: t.id, name: t.name })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ CREATE DIALOG ═══ */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md rounded-2xl sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              New Email Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Template Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setF("name", e.target.value)}
                placeholder="e.g. welcome_email"
                className="h-10"
              />
              <p className="text-[11px] text-muted-foreground sm:text-xs">
                Used as a unique identifier. No spaces — use underscores.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Subject Line</Label>
              <Input
                value={form.subject}
                onChange={(e) => setF("subject", e.target.value)}
                placeholder="Welcome to {{site_name}}!"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setF("category", v)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.slice(1).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_ICONS[c] ?? "•"} {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Description (optional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setF("description", e.target.value)}
                placeholder="Brief description of when this template is used"
                className="h-10"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Active on create</p>
                <p className="text-[11px] text-muted-foreground sm:text-xs">
                  Inactive templates won&apos;t be sent
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setF("isActive", v)}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialog(false);
                setForm(emptyForm);
              }}
              className="h-10 w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="h-10 w-full sm:w-auto"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Creating..." : "Create & Open Designer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE ALERT DIALOG ═══ */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          !open && setDeleteDialog({ open: false, id: "", name: "" })
        }
      >
        <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-sm rounded-2xl sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Template?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteDialog.name}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="h-10 w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="h-10 w-full bg-destructive hover:bg-destructive sm:w-auto"
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ TEST SEND DIALOG ═══ */}
      <Dialog open={testDialog} onOpenChange={setTestDialog}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-sm rounded-2xl sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Send Test Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Enter a recipient to send a rendered preview of this template with
              sample values.
            </p>
            <div className="space-y-2">
              <Label className="text-sm">Recipient Email</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="h-10"
                onKeyDown={(e) => e.key === "Enter" && handleTest()}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setTestDialog(false);
                setTestEmail("");
              }}
              className="h-10 w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTest}
              disabled={testLoading || !testEmail}
              className="h-10 w-full sm:w-auto"
            >
              {testLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {testLoading ? "Sending..." : "Send Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}