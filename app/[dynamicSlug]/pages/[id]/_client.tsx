"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Eye, EyeOff, Trash2, AlertTriangle, FileEdit, Maximize2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import FullscreenEditor from "@/components/fullscreen-editor";

interface CustomPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: string;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogImage: string | null;
  robots: string | null;
}

interface EditPageClientProps {
  id: string;
  initialData: CustomPage;
  dynamicSlug: string;
}

export default function EditPageClient({ id, initialData, dynamicSlug: panelSlug }: EditPageClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [title, setTitle] = useState(initialData.title);
  const [slug, setSlug] = useState(initialData.slug);
  const [content, setContent] = useState(initialData.content);
  const [published, setPublished] = useState(initialData.status === "published");
  const [metaTitle, setMetaTitle] = useState(initialData.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(initialData.metaDescription ?? "");
  const [metaKeywords, setMetaKeywords] = useState(initialData.metaKeywords ?? "");
  const [ogImage, setOgImage] = useState(initialData.ogImage ?? "");
  const [robots, setRobots] = useState(initialData.robots ?? "index, follow");
  const [editorOpen, setEditorOpen] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          content,
          status: published ? "published" : "draft",
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          metaKeywords: metaKeywords || null,
          ogImage: ogImage || null,
          robots: robots || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Page saved.");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/admin/pages/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Page deleted.");
      router.push(`/${panelSlug}/pages`);
    } else {
      toast.error("Failed to delete.");
      setDeleting(false);
    }
  }

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/${panelSlug}/pages`} prefetch={true}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-foreground font-lora truncate">{title || "Edit Page"}</h1>
          <p className="text-base text-muted-foreground mt-1 font-ibm">
            Accessible at <code className="bg-muted px-1 rounded text-sm">/{slug}</code>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
            <Switch checked={published} onCheckedChange={setPublished} />
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              {published
                ? <><Eye className="h-3.5 w-3.5 text-foreground" />Published</>
                : <><EyeOff className="h-3.5 w-3.5 text-foreground" />Draft</>}
            </span>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save
          </Button>
        </div>
      </div>

      {/* Title & Slug */}
      <div className="bg-card rounded-xl border border-border p-4 md:p-6 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Page Title *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} className="h-10 text-base font-medium" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">URL Slug *</Label>
          <div className="flex items-center">
            <div className="flex items-center h-9 px-3 bg-muted/50 border border-border rounded-l-lg text-sm text-muted-foreground border-r-0 shrink-0">/</div>
            <Input value={slug} onChange={e => setSlug(e.target.value)} className="h-9 text-sm rounded-l-none font-mono" />
          </div>
        </div>
      </div>

      {/* Editor Trigger */}
      <div className="bg-card rounded-xl border border-border p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <FileEdit className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Page Content</h3>
            <p className="text-sm text-muted-foreground">Write, format, and preview your custom page content.</p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => setEditorOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white w-full md:w-auto"
        >
          <Maximize2 className="h-4 w-4 mr-2" />
          Open Fullscreen Editor
        </Button>
      </div>

      {/* SEO */}
      <div className="bg-card rounded-xl border border-border p-4 md:p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">SEO / Social Sharing (optional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meta Title</Label>
            <Input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="Defaults to page title" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">OG Image URL</Label>
            <Input value={ogImage} onChange={e => setOgImage(e.target.value)} placeholder="https://…" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meta Keywords</Label>
            <Input value={metaKeywords} onChange={e => setMetaKeywords(e.target.value)}
              placeholder="Comma-separated keywords" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Robots Directive</Label>
            <Input value={robots} onChange={e => setRobots(e.target.value)}
              placeholder="index, follow" className="h-9 text-sm" />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meta Description</Label>
            <Textarea value={metaDescription} onChange={e => setMetaDescription(e.target.value)}
              className="resize-none min-h-16 text-sm" />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-card rounded-xl border border-destructive/20 p-4 md:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-foreground" />
          <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
        </div>
        {!deleteConfirm ? (
          <Button variant="outline"
            className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive gap-2"
            onClick={() => setDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4" />Delete this page permanently
          </Button>
        ) : (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-3">
            <p className="text-sm font-semibold text-destructive">This will permanently delete this page. Are you sure?</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(false)} className="flex-1">Cancel</Button>
              <Button size="sm" onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-destructive hover:bg-destructive text-white gap-1">
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete Permanently
              </Button>
            </div>
          </div>
        )}
      </div>

      <FullscreenEditor
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={title}
        content={content}
        setContent={setContent}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
