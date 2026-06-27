"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, Save, X, Quote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export interface AuthContent { id: string; quote: string; subtext: string; }

const PAGE_LABELS: Record<string, string> = {
  "sign-in": "Sign In", "sign-up": "Sign Up", "forgot-password": "Forgot Password",
  "reset-password": "Reset Password", "complete-profile": "Complete Profile",
};

export default function AuthContentClient({ initialData }: { initialData: AuthContent[] }) {
  const router = useRouter();
  const [items, setItems] = useState<AuthContent[]>(initialData ?? []);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<AuthContent | null>(null);
  const [form, setForm] = useState({ quote: "", subtext: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const data = await fetch("/api/admin/auth-content").then(r => r.json());
    setItems(data);
    setLoading(false);
  }

  function openEdit(item: AuthContent) {
    setEditing(item);
    setForm({ quote: item.quote, subtext: item.subtext });
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/auth-content/${editing.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Auth content updated.");
      setEditing(null);
      load();
      router.refresh();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="header-admin">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Quote className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Auth Page Content</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Left-panel quote and subtext for each authentication page.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card-widget animate-pulse p-5">
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-lg bg-accent/60 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-accent/60" />
                  <div className="h-3 w-64 rounded bg-accent/40" />
                  <div className="h-3 w-48 rounded bg-accent/40" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map(item => (
            <Card key={item.id} className="card-widget">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{(PAGE_LABELS[item.id] || item.id).slice(0,2).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-foreground">{PAGE_LABELS[item.id] || item.id}</span>
                    <span className="text-xs text-muted-foreground font-mono">/{item.id}</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">&quot;{item.quote}&quot;</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.subtext}</p>
                </div>
                <button onClick={() => openEdit(item)} className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground shrink-0">
                  <Pencil className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

        <Dialog open={!!editing} onOpenChange={v => !v && setEditing(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit — {editing ? (PAGE_LABELS[editing.id] || editing.id) : ""}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Field>
                <FieldLabel>Quote (headline text)</FieldLabel>
                <textarea
                  value={form.quote}
                  onChange={e => setForm(p => ({ ...p, quote: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none transition-shadow"
                />
              </Field>
              <Field>
                <FieldLabel>Subtext (supporting description)</FieldLabel>
                <textarea
                  value={form.subtext}
                  onChange={e => setForm(p => ({ ...p, subtext: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none transition-shadow"
                />
              </Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}><X className="h-4 w-4 mr-1" />Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
