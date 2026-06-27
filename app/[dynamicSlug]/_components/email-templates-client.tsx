"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail, Plus, Pencil, Trash2, Loader2, Copy, Send,
  CheckCircle, XCircle, Search, Filter, LayoutTemplate,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";

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

const CATEGORIES = ["all", "auth", "wallet", "tournaments", "notifications", "marketing", "system"];
const CATEGORY_COLORS: Record<string, string> = {
  auth: "bg-blue-500/10 text-blue-600",
  wallet: "bg-emerald-500/10 text-emerald-600",
  tournaments: "bg-amber-500/10 text-amber-600",
  notifications: "bg-purple-500/10 text-purple-600",
  marketing: "bg-rose-500/10 text-rose-600",
  system: "bg-muted text-muted-foreground",
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

  // Test send dialog
  const [testDialog, setTestDialog] = useState(false);
  const [testTemplateId, setTestTemplateId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  async function loadTemplates() {
    setLoading(true);
    const data = await fetch("/api/admin/email-templates").then((r) => r.json());
    setTemplates(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  const setF = <K extends keyof typeof emptyForm>(key: K, val: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  async function handleCreate() {
    if (!form.name || !form.subject) {
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
      await loadTemplates();
      router.push(`/${adminSlug}/email-templates/${data.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error creating template.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/email-templates/${id}`, { method: "DELETE" });
    toast.success("Template deleted.");
    await loadTemplates();
    router.refresh();
  }

  async function handleDuplicate(id: string) {
    const res = await fetch(`/api/admin/email-templates/${id}/duplicate`, { method: "POST" });
    const data = await res.json();
    if (data.ok) {
      toast.success(`Duplicated as "${data.name}"`);
      await loadTemplates();
    } else {
      toast.error("Duplication failed.");
    }
  }

  async function handleToggleActive(t: Template) {
    await fetch(`/api/admin/email-templates/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    toast.success(`Template ${!t.isActive ? "activated" : "deactivated"}.`);
    await loadTemplates();
  }

  function openTest(id: string) {
    setTestTemplateId(id);
    setTestEmail("");
    setTestDialog(true);
  }

  async function handleTest() {
    if (!testEmail || !testTemplateId) return;
    setTestLoading(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${testTemplateId}/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message ?? "Test email sent!");
        setTestDialog(false);
      } else {
        toast.error(data.error ?? "Test failed.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setTestLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let list = templates;
    if (categoryFilter !== "all") list = list.filter((t) => t.category === categoryFilter);
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
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="header-admin">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <LayoutTemplate className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Email Templates</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage transactional email templates with visual, HTML, or React Email editors.
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="card-widget p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Total</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.total}</p>
        </Card>
        <Card className="card-widget p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Active</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.active}</p>
        </Card>
        <Card className="card-widget p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Inactive</p>
          <p className="mt-1 text-2xl font-bold text-muted-foreground">{stats.inactive}</p>
        </Card>
        <Card className="card-widget p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Categories</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {stats.byCategory.filter((c) => c.count > 0).length}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c === "all" ? "All Categories" : c.charAt(0).toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-list animate-pulse p-5">
              <div className="flex items-start gap-4">
                <div className="h-9 w-9 rounded-lg bg-accent/60 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-accent/60" />
                  <div className="h-3 w-64 rounded bg-accent/40" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="card-list">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-base font-semibold text-foreground">
              {templates.length === 0 ? "No templates yet" : "No templates match your filter"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {templates.length === 0
                ? "Create your first email template to get started."
                : "Try adjusting your search or category filter."}
            </p>
            {templates.length === 0 && (
              <Button className="mt-5" onClick={() => setCreateDialog(true)}>
                <Plus className="h-4 w-4" />
                Create First Template
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="card-list overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th>Template</th>
                <th className="hidden md:table-cell">Category</th>
                <th className="hidden lg:table-cell">Editor</th>
                <th className="hidden sm:table-cell">Updated</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const varCount = t.variables
                  ? (() => { try { return JSON.parse(t.variables).length; } catch { return 0; } })()
                  : 0;
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 rounded-lg bg-primary/10 p-1.5 shrink-0">
                          <Mail className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate max-w-[180px]">
                            {t.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {t.subject}
                          </p>
                          {varCount > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {varCount} variable{varCount !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                          CATEGORY_COLORS[t.category] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {t.category}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground capitalize">
                        {t.editorType.replace("_", " ")}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(t.updatedAt), "dd MMM yyyy")}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(t)}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${
                          t.isActive
                            ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {t.isActive ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {t.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/${adminSlug}/email-templates/${t.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Open designer">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Send test email"
                          onClick={() => openTest(t.id)}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Duplicate"
                          onClick={() => handleDuplicate(t.id)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => handleDelete(t.id, t.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Email Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setF("name", e.target.value)}
                placeholder="e.g. welcome_email"
              />
              <p className="text-xs text-muted-foreground">Used as a unique identifier. No spaces — use underscores.</p>
            </div>
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={form.subject}
                onChange={(e) => setF("subject", e.target.value)}
                placeholder="Welcome to {{site_name}}!"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setF("category", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.slice(1).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Editor Type</Label>
                <Select value={form.editorType} onValueChange={(v) => setF("editorType", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="html">HTML Editor</SelectItem>
                    <SelectItem value="visual">Visual Builder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setF("description", e.target.value)}
                placeholder="Brief description of when this template is used"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-background/60 border border-border/10 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Active on create</p>
                <p className="text-xs text-muted-foreground">Inactive templates won&apos;t be sent</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => setF("isActive", v)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Creating..." : "Create & Open Designer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test send dialog */}
      <Dialog open={testDialog} onOpenChange={setTestDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Enter a recipient to send a rendered preview of this template with sample values.
            </p>
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                onKeyDown={(e) => e.key === "Enter" && handleTest()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialog(false)}>Cancel</Button>
            <Button onClick={handleTest} disabled={testLoading || !testEmail}>
              {testLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {testLoading ? "Sending..." : "Send Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
