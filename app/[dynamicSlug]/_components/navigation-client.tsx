"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Save, X, Menu } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { Muted } from "@/components/ui/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export interface NavItem {
  id: string; title: string; url: string; description: string | null;
  icon: string | null; parentId: string | null; order: number;
  isMobileExtra: boolean; isFooter: boolean; isSocial: boolean;
}

const empty: Omit<NavItem, "id"> = {
  title: "", url: "#", description: null, icon: null, parentId: null,
  order: 0, isMobileExtra: false, isFooter: false, isSocial: false,
};

function typeLabel(item: NavItem) {
  if (item.isSocial) return "Social";
  if (item.isFooter) return "Footer";
  if (item.isMobileExtra) return "Mobile";
  return "Header";
}

function typeBadgeColor(item: NavItem) {
  if (item.isSocial) return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400";
  if (item.isFooter) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (item.isMobileExtra) return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
  return "bg-success/20 text-success";
}

export default function NavigationClient({ initialData }: { initialData: NavItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<NavItem[]>(initialData ?? []);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NavItem | null>(null);
  const [form, setForm] = useState<Omit<NavItem, "id">>(empty);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const data = await fetch("/api/admin/navigation").then(r => r.json());
    setItems(data);
    setLoading(false);
  }

  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(item: NavItem) { setEditing(item); setForm({ ...item }); setOpen(true); }

  const setF = (key: keyof typeof form, val: unknown) => setForm(p => ({ ...p, [key]: val }));

  async function handleSave() {
    if (!form.title || !form.url) { toast.error("Title and URL are required."); return; }
    setSaving(true);
    try {
      const res = editing
        ? await fetch(`/api/admin/navigation/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        : await fetch("/api/admin/navigation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error(await res.text());
      toast.success(editing ? "Item updated." : "Item created.");
      setOpen(false);
      load();
      router.refresh();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this navigation item?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/navigation/${id}`, { method: "DELETE" });
      toast.success("Item deleted.");
      load();
      router.refresh();
    } catch { toast.error("Delete failed."); }
    finally { setDeleting(null); }
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="header-admin">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Menu className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Navigation Items</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage header, footer, social and mobile navigation links.</p>
          </div>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Add Item</Button>
      </div>

      {loading ? (
        <div className="card-list">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Order","Title","URL","Type","Actions"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {[1,2,3].map(i => (
                  <tr key={i} className="animate-pulse">
                    {[1,2,3,4,5].map(j => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-16 rounded bg-accent/60" /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center bg-background px-6 py-10 text-center rounded-2xl border">
          <Menu className="mb-4 h-6 w-6 text-foreground" />
          <h4 className="text-sm font-semibold text-foreground">No navigation items yet</h4>
          <Muted className="mt-1 text-sm">Create your first navigation item to get started.</Muted>
        </div>
      ) : (
        <Card className="card-list">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="w-14">Order</th>
                  <th>Title</th>
                  <th className="hidden sm:table-cell">URL</th>
                  <th className="w-28">Type</th>
                  <th className="w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {items.sort((a,b) => a.order - b.order).map(item => (
                  <tr key={item.id}>
                    <td>
                      <span className="font-mono text-xs text-muted-foreground bg-background/80 rounded px-1.5 py-0.5">{item.order}</span>
                    </td>
                    <td>
                      <p className="font-medium text-sm text-foreground truncate max-w-[200px]">{item.title}</p>
                      {item.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</p>}
                    </td>
                    <td className="hidden sm:table-cell">
                      <code className="text-xs bg-background/80 rounded px-1.5 py-0.5 text-muted-foreground font-mono">{item.url}</code>
                    </td>
                    <td>
                      <Badge variant="secondary" className={`text-[10px] ${typeBadgeColor(item)}`}>{typeLabel(item)}</Badge>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting === item.id}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          {deleting === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Navigation Item" : "Add Navigation Item"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Field><FieldLabel>Title *</FieldLabel><Input value={form.title} onChange={e => setF("title", e.target.value)} placeholder="Home" /></Field></div>
                <div className="col-span-2"><Field><FieldLabel>URL *</FieldLabel><Input value={form.url} onChange={e => setF("url", e.target.value)} placeholder="/page" /></Field></div>
                <Field><FieldLabel>Icon (Lucide name)</FieldLabel><Input value={form.icon || ""} onChange={e => setF("icon", e.target.value || null)} placeholder="Home" /></Field>
                <Field><FieldLabel>Order</FieldLabel><Input type="number" value={form.order} onChange={e => setF("order", Number(e.target.value))} /></Field>
                <div className="col-span-2"><Field><FieldLabel>Description</FieldLabel><Input value={form.description || ""} onChange={e => setF("description", e.target.value || null)} /></Field></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([["isFooter","Footer Nav"],["isSocial","Social Icon"],["isMobileExtra","Mobile Only"]] as [keyof typeof form, string][]).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2 p-3 rounded-xl bg-background/60 border">
                    <Switch checked={form[key] as boolean} onCheckedChange={v => setF(key, v)} id={key} />
                    <label htmlFor={key} className="text-xs cursor-pointer">{label}</label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}><X className="h-4 w-4 mr-1" />Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                {editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
