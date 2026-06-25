"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LayoutTemplate, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

interface ContentTemplate {
  id: string;
  name: string;
  type: string;
  contentHtml: string;
  contentMarkdown: string;
  createdAt: string | Date;
}

export default function ContentTemplatesClient({ initialData }: { dynamicSlug: string; initialData: ContentTemplate[] }) {
  const [templates, setTemplates] = useState<ContentTemplate[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", type: "DESCRIPTION", contentHtml: "", contentMarkdown: "" });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content-templates");
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditingId(null);
    setForm({ name: "", type: "DESCRIPTION", contentHtml: "", contentMarkdown: "" });
    setDialogOpen(true);
  }

  function openEdit(template: ContentTemplate) {
    setEditingId(template.id);
    setForm({
      name: template.name,
      type: template.type,
      contentHtml: template.contentHtml,
      contentMarkdown: template.contentMarkdown,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error("Template name is required");
    setSaving(true);
    try {
      const url = editingId ? `/api/admin/content-templates/${editingId}` : "/api/admin/content-templates";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, contentHtml: form.contentHtml ?? "" }),
      });
      const data = await res.json();
      if (data.success || data.id) {
        toast.success(editingId ? "Template updated" : "Template created");
        setDialogOpen(false);
        load();
      } else {
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/content-templates/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Template deleted");
        setDeleteId(null);
        load();
      } else {
        toast.error(data.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete template");
    }
  }

  const descriptions = templates.filter((template) => template.type === "DESCRIPTION");
  const rules = templates.filter((template) => template.type === "RULES");

  return (
    <div className="w-full min-w-0 p-4 md:p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <LayoutTemplate className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Content Templates</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Reusable description and rules templates for tournaments.</p>
            </div>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />New Template</Button>
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl bg-accent/40 shadow-sm animate-pulse p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-accent/60" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 rounded bg-accent/60" />
                    <div className="h-3 w-64 rounded bg-accent/40" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {[{ label: "Description Templates", items: descriptions }, { label: "Rules Templates", items: rules }].map(({ label, items }) => (
              <div key={label}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</h2>
                  <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                </div>
                {items.length === 0 ? (
                  <div className="rounded-2xl bg-accent/40 border border-dashed border-accent/60 p-8 text-center text-sm text-muted-foreground">
                    No {label.toLowerCase()} yet
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {items.map((template) => (
                      <Card key={template.id} className="rounded-2xl bg-accent/60 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-foreground">{template.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {template.contentMarkdown || template.contentHtml?.replace(/<[^>]+>/g, " ").slice(0, 80) || "No content"}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0 ml-4">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(template)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteId(template.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Template" : "New Template"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Template Name *</FieldLabel>
                  <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Standard Battle Royale Rules" />
                </Field>
                <Field>
                  <FieldLabel>Type</FieldLabel>
                  <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DESCRIPTION">Description</SelectItem>
                      <SelectItem value="RULES">Rules</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Editor:</span>
                <Badge variant="secondary" className="text-xs">Markdown</Badge>
              </div>

              <textarea
                value={form.contentMarkdown}
                onChange={(event) => setForm((current) => ({ ...current, contentMarkdown: event.target.value }))}
                placeholder="Write in Markdown..."
                rows={12}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 resize-y transition-shadow"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template?</AlertDialogTitle>
              <AlertDialogDescription>This template will be permanently deleted.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
