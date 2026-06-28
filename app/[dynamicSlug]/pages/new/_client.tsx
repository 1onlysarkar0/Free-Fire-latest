"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useParams } from "next/navigation";
import { Maximize2, FileEdit } from "lucide-react";
import FullscreenEditor from "@/components/fullscreen-editor";

function slugify(str: string) {
  return str.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function NewPageEditorPage() {
  const router = useRouter();
  const params = useParams();
  const panelSlug = params.dynamicSlug as string;
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [robots, setRobots] = useState("index, follow");
  const [slugManual, setSlugManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    if (!slugManual) setSlug(slugify(title));
  }, [title, slugManual]);

  async function handleSave() {
    if (!title.trim()) { toast.error("Title is required."); return; }
    if (!slug.trim()) { toast.error("Slug is required."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, slug, content,
          status: published ? "published" : "draft",
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          metaKeywords: metaKeywords || null,
          ogImage: ogImage || null,
          robots: robots || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Page created successfully.");
      router.push(`/${panelSlug}/pages`);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/${panelSlug}/pages`} prefetch={false}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground font-lora">New Custom Page</h1>
          <p className="text-base text-muted-foreground mt-1 font-ibm">
            Accessible at <code className="bg-muted px-1 rounded text-sm">/{slug || "your-slug"}</code>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
            <Switch checked={published} onCheckedChange={setPublished} />
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
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
          <Input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. About Us, Rules, Contact…"
            className="h-10 text-base font-medium" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">URL Slug *</Label>
          <div className="flex items-center">
            <div className="flex items-center h-9 px-3 bg-muted/50 border border-border rounded-l-lg text-sm text-muted-foreground border-r-0 shrink-0">
              /
            </div>
            <Input
              value={slug}
              onChange={e => { setSlugManual(true); setSlug(e.target.value); }}
              onFocus={() => setSlugManual(true)}
              placeholder="your-page-slug"
              className="h-9 text-sm rounded-l-none font-mono"
            />
          </div>
          {!slugManual && <p className="text-xs text-muted-foreground">Auto-generated from title. Click to customize.</p>}
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

      {/* SEO Section */}
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
              placeholder="Brief description for search engines…"
              className="resize-none min-h-16 text-sm" />
          </div>
        </div>
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
