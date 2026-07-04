"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useParams } from "next/navigation";
import { Maximize2, FileEdit } from "lucide-react";
import FullscreenEditor from "@/components/fullscreen-editor";

export default function NewPageEditorPage() {
  const router = useRouter();
  const params = useParams();
  const panelSlug = params.dynamicSlug as string;
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  async function handleSave() {
    if (!slug.trim()) { toast.error("Slug is required."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug, content,
          status: published ? "published" : "draft",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create page");
      toast.success("Page created successfully.");
      if (published && data.seoConfigId) {
        router.push(`/${panelSlug}/seo/${data.seoConfigId}`);
      } else {
        router.push(`/${panelSlug}/pages`);
      }
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/${panelSlug}/pages`} prefetch={true}><ArrowLeft className="h-4 w-4" /></Link>
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

      {/* Slug */}
      <div className="bg-card rounded-xl border border-border p-4 md:p-6 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">URL Slug *</Label>
          <div className="flex items-center">
            <div className="flex items-center h-9 px-3 bg-muted/50 border border-border rounded-l-lg text-sm text-muted-foreground border-r-0 shrink-0">
              /
            </div>
            <Input
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="your-page-slug"
              className="h-9 text-sm rounded-l-none font-mono"
            />
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

      {/* SEO hint */}
      <div className="bg-card rounded-xl border border-border p-4 md:p-6">
        <p className="text-sm text-muted-foreground">
          After saving, configure SEO settings (meta title, description, OG image, etc.) from the{" "}
          <Link href={`/${panelSlug}/seo`} className="text-primary underline underline-offset-2 hover:text-primary/80">
            SEO Configuration
          </Link>{" "}
          page. Published pages will automatically appear there.
        </p>
      </div>

      <FullscreenEditor
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={slug || "New Page"}
        content={content}
        setContent={setContent}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
