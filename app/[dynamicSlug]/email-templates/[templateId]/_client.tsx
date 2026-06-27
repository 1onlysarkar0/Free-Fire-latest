"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Send, Eye, Copy, Loader2, Code2, Paintbrush2,
  Mail, Settings, Variable, LayoutTemplate, AlertTriangle, Check
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface UnlayerEditor {
  exportHtml: (cb: (data: { design: unknown; html: string }) => void) => void;
  addEventListener: (event: string, cb: () => void) => void;
  ready: (cb: () => void) => void;
  loadDesign: (design: unknown) => void;
}

interface WindowWithUnlayer extends Window {
  unlayer?: {
    createEditor: (options: {
      id: string;
      displayMode: string;
      appearance: { theme: string };
    }) => UnlayerEditor;
  };
}

export interface TemplateData {
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

const CATEGORIES = ["auth", "wallet", "tournaments", "notifications", "marketing", "system"];

function renderTemplateLocal(html: string, variables: Record<string, string>): string {
  let rendered = html;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
    rendered = rendered.replaceAll(`{{ ${key} }}`, value);
  }
  return rendered;
}

export default function EmailDesignerClient({
  template: initialTemplate,
  adminSlug,
}: {
  template: TemplateData;
  adminSlug: string;
}) {
  const router = useRouter();
  const [template, setTemplate] = useState(initialTemplate);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sub-tabs for the Design Tab: 'visual' | 'code' | 'preview'
  const [activeSubTab, setActiveSubTab] = useState<"visual" | "code" | "preview">("visual");

  // HTML editor content
  const [htmlContent, setHtmlContent] = useState(initialTemplate.bodyHtml);

  // Variables schema (JSON array of {key, description, sample})
  const [variablesSchema, setVariablesSchema] = useState(
    initialTemplate.variablesSchema ?? "[]"
  );

  // Unlayer script loading state
  const [unlayerLoaded, setUnlayerLoaded] = useState(false);
  const unlayerRef = useRef<UnlayerEditor | null>(null);

  // Local compiled preview HTML
  const [previewHtml, setPreviewHtml] = useState("");

  // Test send dialog
  const [testDialog, setTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  const markDirty = useCallback(() => setDirty(true), []);

  function setField<K extends keyof TemplateData>(key: K, val: TemplateData[K]) {
    setTemplate((t) => ({ ...t, [key]: val }));
    markDirty();
  }

  // Load the official Unlayer script dynamically on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as unknown as WindowWithUnlayer;

    if (win.unlayer) {
      setUnlayerLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://editor.unlayer.com/embed.js?2";
    script.async = true;
    script.onload = () => {
      setUnlayerLoaded(true);
    };
    script.onerror = () => {
      toast.error("Failed to load visual editor script. Check your internet connection.");
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Initialize Unlayer instance when loaded and visual mode is active
  const initUnlayer = useCallback(() => {
    if (typeof window === "undefined") return;
    const win = window as unknown as WindowWithUnlayer;
    if (!win.unlayer) return;

    const container = document.getElementById("editor-container");
    if (!container) return;
    container.innerHTML = ""; // Clear loader text

    try {
      const editor = win.unlayer.createEditor({
        id: "editor-container",
        displayMode: "email",
        appearance: { theme: "light" },
      });

      unlayerRef.current = editor;

      editor.addEventListener("design:updated", () => {
        setDirty(true);
      });

      editor.ready(() => {
        if (template.designJson) {
          try {
            editor.loadDesign(JSON.parse(template.designJson));
          } catch {
            // invalid JSON — skip
          }
        }
      });
    } catch (err) {
      console.error("Error creating unlayer editor:", err);
    }
  }, [template.designJson]);

  // Handle mounting container
  useEffect(() => {
    if (unlayerLoaded && activeSubTab === "visual") {
      const timer = setTimeout(() => {
        initUnlayer();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [unlayerLoaded, activeSubTab, initUnlayer]);

  // Synchronize the design blocks to raw HTML
  const syncFromVisual = useCallback((): Promise<{ html: string; designJson: string | null }> => {
    return new Promise((resolve) => {
      if (unlayerRef.current) {
        unlayerRef.current.exportHtml((data: { design: unknown; html: string }) => {
          const designStr = JSON.stringify(data.design);
          setHtmlContent(data.html);
          setTemplate(t => ({ ...t, bodyHtml: data.html, designJson: designStr }));
          resolve({ html: data.html, designJson: designStr });
        });
      } else {
        resolve({ html: htmlContent, designJson: template.designJson });
      }
    });
  }, [htmlContent, template.designJson]);

  // Generate sample preview payload
  const getRenderedHtmlLocal = useCallback((rawHtml: string) => {
    const samplePayload: Record<string, string> = {
      siteName: "1onlysarkar",
    };
    if (variablesSchema) {
      try {
        const schema = JSON.parse(variablesSchema) as Array<{ key: string; sample?: string }>;
        for (const v of schema) {
          samplePayload[v.key] = v.sample ?? `{{${v.key}}}`;
        }
      } catch {}
    }
    return renderTemplateLocal(rawHtml, samplePayload);
  }, [variablesSchema]);

  // Handle switching editor tabs
  async function handleSubTabChange(tab: "visual" | "code" | "preview") {
    if (activeSubTab === "visual" && (tab === "code" || tab === "preview")) {
      const { html } = await syncFromVisual();
      if (tab === "preview") {
        setPreviewHtml(getRenderedHtmlLocal(html));
      }
    } else if (activeSubTab === "code" && tab === "preview") {
      setPreviewHtml(getRenderedHtmlLocal(htmlContent));
    }
    setActiveSubTab(tab);
  }

  // Final HTML exporter helper
  async function getExportedHtml(): Promise<{ html: string; designJson: string | null }> {
    if (activeSubTab === "visual" && unlayerRef.current) {
      return syncFromVisual();
    }
    return { html: htmlContent, designJson: template.designJson };
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { html, designJson } = await getExportedHtml();
      const res = await fetch(`/api/admin/email-templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          subject: template.subject,
          previewText: template.previewText,
          bodyHtml: html,
          designJson: designJson,
          category: template.category,
          editorType: "visual", // Unlayer visual editor is the primary editor type
          isActive: template.isActive,
          variablesSchema,
          description: template.description,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Template saved successfully.");
      setDirty(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error saving template.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicate() {
    const res = await fetch(`/api/admin/email-templates/${template.id}/duplicate`, { method: "POST" });
    const data = await res.json();
    if (data.ok) {
      toast.success(`Duplicated as "${data.name}"`);
      router.push(`/${adminSlug}/email-templates/${data.id}`);
    } else {
      toast.error("Duplication failed.");
    }
  }

  async function handleTest() {
    if (!testEmail) return;
    setTestLoading(true);
    try {
      const { html } = await getExportedHtml();
      // Save changes first
      await fetch(`/api/admin/email-templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bodyHtml: html,
          designJson: template.designJson,
          subject: template.subject,
        }),
      });

      const res = await fetch(`/api/admin/email-templates/${template.id}/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message ?? "Test email sent!");
        setTestDialog(false);
      } else {
        toast.error(data.error ?? "Failed to send.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setTestLoading(false);
    }
  }

  return (
    <div className="w-full min-w-0">
      {/* Top Action Bar */}
      <div className="flex flex-col gap-3 border-b border-border/10 pb-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/${adminSlug}/email-templates`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Templates
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <LayoutTemplate className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">{template.name}</p>
              <p className="text-xs text-muted-foreground leading-tight capitalize mt-0.5">
                Visual Designer · {template.category}
              </p>
            </div>
          </div>
          {dirty && (
            <span className="text-xs text-amber-600 font-medium ml-2">Unsaved changes</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setTestDialog(true)}>
            <Send className="h-4 w-4" />
            Send Test
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate}>
            <Copy className="h-4 w-4" />
            Duplicate
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="design" className="w-full">
        <TabsList className="mb-6 flex h-auto gap-1 rounded-2xl bg-accent/60 p-1 w-fit">
          <TabsTrigger value="design" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Paintbrush2 className="h-3.5 w-3.5" />
            Design Workspace
          </TabsTrigger>
          <TabsTrigger value="meta" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Mail className="h-3.5 w-3.5" />
            Subject Line
          </TabsTrigger>
          <TabsTrigger value="variables" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Variable className="h-3.5 w-3.5" />
            Variables Config
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* DESIGN TAB */}
        <TabsContent value="design" className="space-y-4 outline-none">
          {/* Visual / Code / Preview Switcher */}
          <div className="flex items-center justify-between bg-accent/40 rounded-2xl p-2 border border-border/10">
            <p className="text-xs text-muted-foreground ml-2 font-medium">
              {activeSubTab === "visual" ? "Visual Drag & Drop Designer" : activeSubTab === "code" ? "Raw HTML Code Editor" : "Live Local Preview"}
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant={activeSubTab === "visual" ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs font-semibold"
                onClick={() => handleSubTabChange("visual")}
              >
                <Paintbrush2 className="h-3.5 w-3.5 mr-1" />
                Visual
              </Button>
              <Button
                variant={activeSubTab === "code" ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs font-semibold"
                onClick={() => handleSubTabChange("code")}
              >
                <Code2 className="h-3.5 w-3.5 mr-1" />
                Code
              </Button>
              <Button
                variant={activeSubTab === "preview" ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs font-semibold"
                onClick={() => handleSubTabChange("preview")}
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                Preview
              </Button>
            </div>
          </div>

          {/* Sub Tab Contents */}
          <div className="min-h-[600px] w-full">
            {activeSubTab === "visual" && (
              <div className="rounded-2xl border border-border/20 overflow-hidden bg-white shadow-xs">
                {!unlayerLoaded ? (
                  <div className="flex h-[600px] items-center justify-center bg-accent/20">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Loading designer engine...</p>
                    </div>
                  </div>
                ) : (
                  <div
                    id="editor-container"
                    style={{ height: 750 }}
                    className="w-full bg-white"
                  >
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSubTab === "code" && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-amber-800">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">Warning: Design Overwrite</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Edits to the raw HTML below are supported, but they cannot be converted back into visual drag-and-drop blocks. 
                      If you switch back to the Visual Designer, any HTML changes you make here will be overwritten by the visual design blocks on save.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Raw Template HTML</Label>
                  <textarea
                    value={htmlContent}
                    onChange={(e) => { setHtmlContent(e.target.value); markDirty(); }}
                    className="w-full rounded-2xl border border-border/20 bg-accent/40 p-4 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                    style={{ minHeight: 600 }}
                    spellCheck={false}
                  />
                </div>
              </div>
            )}

            {activeSubTab === "preview" && (
              <div className="rounded-2xl border border-border/20 overflow-hidden bg-white shadow-xs h-[750px] flex flex-col">
                <div className="bg-accent/30 border-b border-border/10 px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
                  <p>Rendered Email Client Preview (Sample Data Applied)</p>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">
                    <Check className="h-3 w-3 mr-1" /> Ready
                  </Badge>
                </div>
                <div className="flex-1 bg-white">
                  <iframe
                    srcDoc={previewHtml}
                    className="h-full w-full"
                    title="Live Email Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* SUBJECT & PREVIEW TEXT TAB */}
        <TabsContent value="meta">
          <Card className="card-settings p-6 space-y-5">
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={template.subject}
                onChange={(e) => setField("subject", e.target.value)}
                placeholder="Welcome to {{siteName}}!"
              />
              <p className="text-xs text-muted-foreground">
                Shown in the email inbox as the subject. Supports {"{{variable}}"} placeholders.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Preview Text</Label>
              <Input
                value={template.previewText ?? ""}
                onChange={(e) => setField("previewText", e.target.value || null)}
                placeholder="Brief summary shown below subject in inbox..."
              />
              <p className="text-xs text-muted-foreground">
                The short text shown below the subject line in most email clients.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Description (internal)</Label>
              <Input
                value={template.description ?? ""}
                onChange={(e) => setField("description", e.target.value || null)}
                placeholder="When is this template used?"
              />
            </div>
          </Card>
        </TabsContent>

        {/* VARIABLES TAB */}
        <TabsContent value="variables">
          <Card className="card-settings p-6 space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Variables Schema</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                JSON array defining the variables used in this template.
                Format: <code className="text-xs bg-accent px-1 rounded">{"[{\"key\":\"user_name\",\"description\":\"User display name\",\"sample\":\"John\"}]"}</code>
              </p>
            </div>
            <textarea
              value={variablesSchema}
              onChange={(e) => { setVariablesSchema(e.target.value); markDirty(); }}
              className="w-full rounded-2xl border border-border/20 bg-accent/40 p-4 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
              style={{ minHeight: 200 }}
              spellCheck={false}
              placeholder='[{"key":"userName","description":"User name","sample":"John"}]'
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Fields per variable:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><code>key</code> — variable name (used as {"{{key}}"} in template)</li>
                <li><code>description</code> — human-readable description</li>
                <li><code>sample</code> — sample value used in preview/test emails</li>
              </ul>
            </div>
          </Card>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings">
          <Card className="card-settings p-6 space-y-5">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={template.category}
                onValueChange={(v) => setField("category", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-background/60 border border-border/10 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Inactive templates are skipped when sending emails</p>
              </div>
              <Switch
                checked={template.isActive}
                onCheckedChange={(v) => setField("isActive", v)}
              />
            </div>

            <div className="rounded-xl bg-background/60 border border-border/10 px-4 py-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Info</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Template ID</p>
                  <code className="text-xs font-mono text-foreground">{template.id}</code>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Name (key)</p>
                  <code className="text-xs font-mono text-foreground">{template.name}</code>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Send Dialog */}
      <Dialog open={testDialog} onOpenChange={setTestDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This will save and then send the current template with sample variable values.
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

// Simple Badge component fallback in case it is not imported from ui
function Badge({ children, className, variant }: { children: React.ReactNode; className?: string; variant?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${className}`}>
      {children}
    </span>
  );
}
