"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
import {
  ArrowLeft, Save, Send, Copy, Loader2, Code2,
  Mail, Settings, Variable, LayoutTemplate
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

  // HTML editor content
  const [htmlContent, setHtmlContent] = useState(initialTemplate.bodyHtml);

  // Variables schema (JSON array of {key, description, sample})
  const [variablesSchema, setVariablesSchema] = useState(
    initialTemplate.variablesSchema ?? "[]"
  );

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

  // Generate sample preview payload
  const getRenderedHtmlLocal = useCallback((rawHtml: string) => {
    const samplePayload: Record<string, string> = {
      siteName: "1OnlySarkar",
      siteLogo: "/assets/logo.webp",
      copyrightText: `© ${new Date().getFullYear()} 1OnlySarkar. All rights reserved.`,
      contactEmail: "support@1onlysarkar.shop",
      companyAddress: "New Delhi, India",
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

  // Update preview when HTML or variables changes
  useEffect(() => {
    setPreviewHtml(getRenderedHtmlLocal(htmlContent));
  }, [htmlContent, getRenderedHtmlLocal]);

  // Callback ref to write to iframe document on mount and updates
  const setIframeRef = useCallback((node: HTMLIFrameElement | null) => {
    if (node) {
      try {
        const doc = node.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(previewHtml || "<html><body><p style='color:#666;font-family:sans-serif;'>Generating preview...</p></body></html>");
          doc.close();
        }
      } catch (err) {
        console.error("Iframe write error:", err);
      }
    }
  }, [previewHtml]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          subject: template.subject,
          previewText: template.previewText,
          bodyHtml: htmlContent,
          designJson: null, // Clear visual editor JSON since visual editor is removed
          category: template.category,
          editorType: "html",
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
      // Save changes first
      await fetch(`/api/admin/email-templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bodyHtml: htmlContent,
          designJson: null,
          editorType: "html",
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
      <div className="sticky top-0 z-30 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 bg-background/95 backdrop-blur-md border-b border-border/10 pb-4 mb-6 pt-4 -mt-4 md:pt-6 md:-mt-6 lg:pt-8 lg:-mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                HTML Editor · {template.category}
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
            <Code2 className="h-3.5 w-3.5" />
            HTML Workspace
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
        <TabsContent value="design" className="outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* HTML Editor Column */}
            <div className="lg:col-span-6 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">Edit HTML Source Code</Label>
                <span className="text-xs text-muted-foreground">Supports global & template variables</span>
              </div>
              <div className="rounded-2xl border border-border/20 overflow-hidden bg-white p-2 min-h-[600px] lg:min-h-[700px]">
                <Editor
                  height="680px"
                  defaultLanguage="html"
                  value={htmlContent}
                  onChange={(val) => {
                    if (val !== undefined) {
                      setHtmlContent(val);
                      markDirty();
                    }
                  }}
                  theme="light"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    wordWrap: "on",
                    automaticLayout: true,
                    tabSize: 2,
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
            </div>

            {/* Live Preview Column */}
            <div className="lg:col-span-6 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">Live Desktop Preview</Label>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">
                  Active
                </Badge>
              </div>
              <div className="rounded-2xl border border-border/20 overflow-hidden bg-white shadow-xs min-h-[600px] lg:min-h-[700px] flex flex-col">
                <div className="bg-accent/30 border-b border-border/10 px-4 py-2 text-xs text-muted-foreground">
                  Rendered Email Client Preview (Sample Variables Evaluated)
                </div>
                <div className="flex-1 bg-white">
                  <iframe
                    ref={setIframeRef}
                    className="h-full w-full min-h-[550px] lg:min-h-[650px]"
                    title="Live Email Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>
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
            <div className="rounded-2xl border border-border/20 overflow-hidden bg-white p-2 min-h-[220px]">
              <Editor
                height="200px"
                defaultLanguage="json"
                value={variablesSchema}
                onChange={(val) => {
                  if (val !== undefined) {
                    setVariablesSchema(val);
                    markDirty();
                  }
                }}
                theme="light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  wordWrap: "on",
                  automaticLayout: true,
                  tabSize: 2,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
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
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${className}`}>
      {children}
    </span>
  );
}
