"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Save, X, Eye, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { Muted } from "@/components/ui/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface Template { id: string; name: string; subject: string; bodyHtml: string; variables: string | null; description: string | null; }

const emptyForm = { name: "", subject: "", bodyHtml: "", variables: "", description: "" };

export default function EmailTemplatesClient({ initialData }: { initialData: Template[] }) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>(initialData ?? []);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const data = await fetch("/api/admin/email-templates").then(r => r.json());
    setTemplates(data);
    setLoading(false);
  }

  function openCreate() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(t: Template) {
    setEditing(t);
    setForm({ name: t.name, subject: t.subject, bodyHtml: t.bodyHtml, variables: t.variables || "", description: t.description || "" });
    setOpen(true);
  }

  const setF = (key: keyof typeof emptyForm, v: string) => setForm(p => ({ ...p, [key]: v }));

  async function handleSave() {
    if (!form.name || !form.subject) { toast.error("Name and subject are required."); return; }
    setSaving(true);
    try {
      const payload = { ...form, variables: form.variables || null, description: form.description || null };
      const res = editing
        ? await fetch(`/api/admin/email-templates/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/admin/email-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      toast.success(editing ? "Template updated." : "Template created.");
      setOpen(false);
      load();
      router.refresh();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    await fetch(`/api/admin/email-templates/${id}`, { method: "DELETE" });
    toast.success("Template deleted.");
    load();
    router.refresh();
  }

  return (
    <div className="w-full min-w-0 p-4 md:p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Email Templates</h1>
              <p className="text-sm text-muted-foreground mt-0.5">HTML templates with {"{{variable}}"} placeholders for transactional emails.</p>
            </div>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4" />New Template</Button>
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl bg-accent/40 shadow-sm animate-pulse p-5">
                <div className="flex items-start gap-4">
                  <div className="h-9 w-9 rounded-lg bg-accent/60 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 rounded bg-accent/60" />
                    <div className="h-3 w-64 rounded bg-accent/40" />
                    <div className="flex gap-2 mt-2">
                      <div className="h-5 w-20 rounded bg-accent/40" />
                      <div className="h-5 w-24 rounded bg-accent/40" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center bg-background px-6 py-10 text-center rounded-2xl border">
            <Mail className="mb-4 h-6 w-6 text-foreground" />
            <h4 className="text-sm font-semibold text-foreground">No email templates yet</h4>
            <Muted className="mt-1 text-sm">Create your first email template to get started.</Muted>
          </div>
        ) : (
          <div className="grid gap-3">
            {templates.map(t => {
              let vars: string[] = [];
              if (t.variables) {
                try { vars = JSON.parse(t.variables) as string[]; }
                catch { if (typeof t.variables === "string") vars = t.variables.split(",").map(s => s.trim()).filter(Boolean); }
              }
              return (
                <Card key={t.id} className="rounded-2xl bg-accent/60 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="h-9 w-9 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 text-pink-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{t.name}</span>
                        {t.description && <span className="text-xs text-muted-foreground">— {t.description}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Subject: {t.subject}</p>
                      {vars.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {vars.map(v => <Badge key={v} variant="secondary" className="text-[10px] font-mono">{`{{${v}}}`}</Badge>)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{editing ? `Edit: ${editing.name}` : "New Email Template"}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
              <div className="grid grid-cols-2 gap-4">
                <Field><FieldLabel>Template Name *</FieldLabel><Input value={form.name} onChange={e => setF("name", e.target.value)} placeholder="welcome" /></Field>
                <Field><FieldLabel>Description</FieldLabel><Input value={form.description} onChange={e => setF("description", e.target.value)} placeholder="Sent on user registration" /></Field>
                <div className="col-span-2"><Field><FieldLabel>Subject *</FieldLabel><Input value={form.subject} onChange={e => setF("subject", e.target.value)} placeholder="Welcome to {{siteName}}!" /></Field></div>
                <div className="col-span-2"><Field><FieldLabel>Variables (comma-separated or JSON array)</FieldLabel><Input value={form.variables} onChange={e => setF("variables", e.target.value)} placeholder='userName, siteName, dashboardUrl  or  ["userName","siteName"]' /></Field></div>
              </div>
              <Tabs defaultValue="edit">
                <TabsList className="mb-2">
                  <TabsTrigger value="edit">HTML Editor</TabsTrigger>
                  <TabsTrigger value="preview"><Eye className="h-3.5 w-3.5 mr-1" />Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="edit">
                  <textarea
                    value={form.bodyHtml}
                    onChange={e => setF("bodyHtml", e.target.value)}
                    rows={16}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 resize-y transition-shadow"
                    placeholder="<!DOCTYPE html>..."
                  />
                </TabsContent>
                <TabsContent value="preview">
                  <div className="border rounded-lg overflow-hidden h-64">
                    <iframe srcDoc={form.bodyHtml} className="w-full h-full border-0" title="Email Preview" sandbox="allow-same-origin" />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            <DialogFooter className="shrink-0 pt-2 border-t">
              <Button variant="outline" onClick={() => setOpen(false)}><X className="h-4 w-4 mr-1" />Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                {editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
