"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Save, X, Globe, Home, LogIn, UserPlus, LayoutDashboard, KeyRound, Info, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { Muted } from "@/components/ui/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SeoRow {
  id: string; metaTitle: string | null; metaDescription: string | null; metaKeywords: string | null;
  ogTitle: string | null; ogDescription: string | null; ogImage: string | null; ogType: string | null;
  twitterCard: string | null; twitterSite: string | null; twitterTitle: string | null;
  twitterDescription: string | null; twitterImage: string | null;
  canonicalUrl: string | null; robots: string | null; structuredDataJson: string | null;
}

const emptyForm: Omit<SeoRow, "id"> = {
  metaTitle: "", metaDescription: "", metaKeywords: "", ogTitle: "", ogDescription: "",
  ogImage: "", ogType: "website", twitterCard: "summary_large_image", twitterSite: "",
  twitterTitle: "", twitterDescription: "", twitterImage: "", canonicalUrl: "",
  robots: "index, follow", structuredDataJson: "",
};

const KNOWN_PAGES: Record<string, { label: string; icon: React.ElementType; path: string; description: string }> = {
  global: { label: "Global Fallback", icon: Globe, path: "—", description: "Default SEO for all pages without a custom override" },
  home: { label: "Homepage", icon: Home, path: "/", description: "Main landing page" },
  "sign-in": { label: "Sign In", icon: LogIn, path: "/sign-in", description: "User login page" },
  "sign-up": { label: "Sign Up", icon: UserPlus, path: "/sign-up", description: "New account registration" },
  dashboard: { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", description: "Authenticated user dashboard" },
  "forgot-password": { label: "Forgot Password", icon: KeyRound, path: "/forgot-password", description: "Password reset request page" },
  "reset-password": { label: "Reset Password", icon: KeyRound, path: "/reset-password", description: "New password entry page" },
};

function PageInfo({ id }: { id: string }) {
  const info = KNOWN_PAGES[id];
  if (!info) return <span className="font-mono text-xs font-bold text-muted-foreground">{id}</span>;
  const Icon = info.icon;
  return (
    <div className="flex items-center gap-2">
      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">{info.label}</div>
        <div className="text-xs text-muted-foreground font-mono">{info.path}</div>
      </div>
    </div>
  );
}

export default function SeoPage({ initialData }: { initialData: SeoRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<SeoRow[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SeoRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [newId, setNewId] = useState("");
  const [form, setForm] = useState<Omit<SeoRow, "id">>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const data = await fetch("/api/admin/seo").then(r => r.json());
    setRows(data);
    setLoading(false);
  }
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() { setIsNew(true); setNewId(""); setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(row: SeoRow) {
    setIsNew(false); setEditing(row);
    const f: Omit<SeoRow, "id"> = { ...emptyForm };
    for (const k of Object.keys(emptyForm) as (keyof typeof emptyForm)[]) {
      f[k] = (row[k] as string | null) ?? "";
    }
    setForm(f);
    setOpen(true);
  }

  const setF = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));
  const clean = (v: string) => v.trim() || null;

  async function handleSave() {
    const id = isNew ? newId.trim() : editing!.id;
    if (!id) { toast.error("Page ID is required."); return; }
    setSaving(true);
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, clean(v as string)]));
      const res = isNew
        ? await fetch("/api/admin/seo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...payload }) })
        : await fetch(`/api/admin/seo/${editing!.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      toast.success(isNew ? "SEO config created." : "SEO config updated.");
      setOpen(false);
      load();
      router.refresh();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (id === "global") { toast.error("Cannot delete global SEO config."); return; }
    if (!confirm(`Delete SEO config for "${id}"?`)) return;
    await fetch(`/api/admin/seo/${id}`, { method: "DELETE" });
    toast.success("Deleted."); 
    load();
    router.refresh();
  }

  const sortedRows = [...rows].sort((a, b) => {
    if (a.id === "global") return -1;
    if (b.id === "global") return 1;
    const aKnown = !!KNOWN_PAGES[a.id];
    const bKnown = !!KNOWN_PAGES[b.id];
    if (aKnown && !bKnown) return -1;
    if (!aKnown && bKnown) return 1;
    return a.id.localeCompare(b.id);
  });

  return (
    <div className="w-full min-w-0 p-4 md:p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">SEO Configuration</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Per-page SEO settings. Null fields fall back to the Global row.</p>
            </div>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4" />Add Page SEO</Button>
        </div>

        {/* How it works info box */}
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-semibold">How SEO fallback works:</p>
            <p>Each page first checks its own row. Any field that is empty falls back to the <strong>Global</strong> row. The Global row is the default for the entire site.</p>
            <p>Page IDs must match the route slug (e.g., <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">home</code> for <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">/</code>).</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-accent/40 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-accent/60">
                    {["Page","Meta Title","Robots","OG Image","Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[1,2,3].map(i => (
                    <tr key={i} className="animate-pulse">
                      {[1,2,3,4,5].map(j => (
                        <td key={j} className="px-4 py-3"><div className="h-4 w-20 rounded bg-accent/60" /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <Card className="rounded-2xl bg-accent/40 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b bg-accent/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Page</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Meta Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground hidden md:table-cell">Robots</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground hidden lg:table-cell">OG Image</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedRows.map(row => (
                    <tr key={row.id} className="hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <PageInfo id={row.id} />
                          {row.id === "global" && <Badge variant="secondary" className="text-[10px]">GLOBAL</Badge>}
                          {!KNOWN_PAGES[row.id] && row.id !== "global" && <Badge variant="secondary" className="text-[10px]">CUSTOM</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[160px] text-xs">{row.metaTitle || <span className="text-muted-foreground/60 italic">Using global</span>}</td>
                      <td className="px-4 py-3 hidden md:table-cell"><code className="text-[11px] text-muted-foreground bg-background/80 rounded px-1.5 py-0.5">{row.robots || <span className="text-muted-foreground/60 italic">Using global</span>}</code></td>
                      <td className="px-4 py-3 text-xs hidden lg:table-cell">
                        {row.ogImage ? <Badge className="bg-success/20 text-success border-0">✓ Set</Badge> : <span className="text-muted-foreground/60 italic">Using global</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {row.id !== "global" && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {isNew ? "New SEO Config" : `Edit SEO — ${editing ? (KNOWN_PAGES[editing.id]?.label || editing.id) : ""}`}
              </DialogTitle>
              {editing && KNOWN_PAGES[editing.id] && (
                <p className="text-xs text-muted-foreground">{KNOWN_PAGES[editing.id].description} · Path: <code className="bg-muted px-1 rounded">{KNOWN_PAGES[editing.id].path}</code></p>
              )}
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-1">
              {isNew && (
                <div className="space-y-1.5 mb-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Page ID *</label>
                  <Input value={newId} onChange={e => setNewId(e.target.value)} placeholder='e.g. "home", "sign-in", "custom-page-slug"' className="font-mono" />
                  <Muted className="text-xs">Must match the URL slug. Use <code className="bg-muted px-1 rounded">home</code> for the homepage.</Muted>
                </div>
              )}
              <Tabs defaultValue="core">
                <TabsList className="mb-4 w-full grid grid-cols-4 h-auto">
                  <TabsTrigger value="core" className="text-xs py-1.5">Core Meta</TabsTrigger>
                  <TabsTrigger value="og" className="text-xs py-1.5">Open Graph</TabsTrigger>
                  <TabsTrigger value="twitter" className="text-xs py-1.5">Twitter/X</TabsTrigger>
                  <TabsTrigger value="technical" className="text-xs py-1.5">Technical</TabsTrigger>
                </TabsList>
                <TabsContent value="core" className="space-y-3">
                  <Field><FieldLabel>Meta Title</FieldLabel><Input value={form.metaTitle!} onChange={e => setF("metaTitle", e.target.value)} placeholder="Page Title — Site Name" /><Muted className="text-xs">Shown in browser tab and search results. 50–60 characters ideal.</Muted></Field>
                  <Field><FieldLabel>Meta Description</FieldLabel><textarea value={form.metaDescription!} onChange={e => setF("metaDescription", e.target.value)} rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none transition-shadow" placeholder="Brief description of this page..." /><Muted className="text-xs">Shown in search results. 150–160 characters ideal.</Muted></Field>
                  <Field><FieldLabel>Meta Keywords</FieldLabel><Input value={form.metaKeywords!} onChange={e => setF("metaKeywords", e.target.value)} placeholder="gaming, tournament, India" /><Muted className="text-xs">Comma-separated keywords.</Muted></Field>
                </TabsContent>
                <TabsContent value="og" className="space-y-3">
                  <Field><FieldLabel>OG Title</FieldLabel><Input value={form.ogTitle!} onChange={e => setF("ogTitle", e.target.value)} /><Muted className="text-xs">Shown when sharing on social media.</Muted></Field>
                  <Field><FieldLabel>OG Description</FieldLabel><textarea value={form.ogDescription!} onChange={e => setF("ogDescription", e.target.value)} rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none transition-shadow" /></Field>
                  <Field><FieldLabel>OG Image URL</FieldLabel><Input value={form.ogImage!} onChange={e => setF("ogImage", e.target.value)} placeholder="https://example.com/og-image.png" /><Muted className="text-xs">Recommended: 1200×630px.</Muted></Field>
                  <Field><FieldLabel>OG Type</FieldLabel><Input value={form.ogType!} onChange={e => setF("ogType", e.target.value)} placeholder="website" /></Field>
                </TabsContent>
                <TabsContent value="twitter" className="space-y-3">
                  <Field><FieldLabel>Twitter Card Type</FieldLabel><Input value={form.twitterCard!} onChange={e => setF("twitterCard", e.target.value)} placeholder="summary_large_image" /></Field>
                  <Field><FieldLabel>Twitter @handle</FieldLabel><Input value={form.twitterSite!} onChange={e => setF("twitterSite", e.target.value)} placeholder="@1onlysarkar" /></Field>
                  <Field><FieldLabel>Twitter Title</FieldLabel><Input value={form.twitterTitle!} onChange={e => setF("twitterTitle", e.target.value)} /></Field>
                  <Field><FieldLabel>Twitter Description</FieldLabel><textarea value={form.twitterDescription!} onChange={e => setF("twitterDescription", e.target.value)} rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none transition-shadow" /></Field>
                  <Field><FieldLabel>Twitter Image URL</FieldLabel><Input value={form.twitterImage!} onChange={e => setF("twitterImage", e.target.value)} placeholder="https://..." /></Field>
                </TabsContent>
                <TabsContent value="technical" className="space-y-3">
                  <Field><FieldLabel>Canonical URL</FieldLabel><Input value={form.canonicalUrl!} onChange={e => setF("canonicalUrl", e.target.value)} placeholder="https://1onlysarkar.shop/page" /></Field>
                  <Field><FieldLabel>Robots Directive</FieldLabel><Input value={form.robots!} onChange={e => setF("robots", e.target.value)} placeholder="index, follow" /></Field>
                  <Field><FieldLabel>Structured Data (JSON-LD)</FieldLabel><textarea value={form.structuredDataJson!} onChange={e => setF("structuredDataJson", e.target.value)} rows={6} className="w-full rounded-lg border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 resize-y transition-shadow" placeholder='{"@context":"https://schema.org","@type":"WebPage",...}' /></Field>
                </TabsContent>
              </Tabs>
            </div>
            <DialogFooter className="shrink-0 pt-2 border-t">
              <Button variant="outline" onClick={() => setOpen(false)}><X className="h-4 w-4 mr-1" />Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                {isNew ? "Create" : "Update"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
