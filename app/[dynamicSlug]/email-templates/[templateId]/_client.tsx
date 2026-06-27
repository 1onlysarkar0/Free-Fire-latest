"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft, Save, Send, Eye, EyeOff, Copy, Loader2, CheckCircle,
  XCircle, Code2, Paintbrush2, Mail, Settings, Variable, History,
  LayoutTemplate,
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

// Dynamic import for Unlayer visual editor (no SSR)
const EmailEditor = dynamic(() => import("react-email-editor").then(m => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] items-center justify-center rounded-2xl bg-accent/40">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading visual editor…</p>
      </div>
    </div>
  ),
});

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

  // Visual editor ref
  const emailEditorRef = useRef<{ exportHtml: (cb: (data: { design: unknown; html: string }) => void) => void } | null>(null);

  // Preview dialog
  const [previewDialog, setPreviewDialog] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Test send dialog
  const [testDialog, setTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  const markDirty = useCallback(() => setDirty(true), []);

  function setField<K extends keyof TemplateData>(key: K, val: TemplateData[K]) {
    setTemplate((t) => ({ ...t, [key]: val }));
    markDirty();
  }

  async function getExportedHtml(): Promise<{ html: string; designJson: string | null }> {
    if (template.editorType === "visual" && emailEditorRef.current) {
      return new Promise((resolve) => {
        emailEditorRef.current!.exportHtml((data) => {
          resolve({
            html: data.html,
            designJson: JSON.stringify(data.design),
          });
        });
      });
    }
    return { html: htmlContent, designJson: null };
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
          designJson: designJson ?? template.designJson,
          category: template.category,
          editorType: template.editorType,
          isActive: template.isActive,
          variablesSchema,
          description: template.description,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Template saved.");
      setDirty(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error saving template.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    setPreviewLoading(true);
    setPreviewDialog(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${template.id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: {} }),
      });
      const data = await res.json();
      setPreviewHtml(data.html ?? "");
    } catch {
      toast.error("Preview failed.");
      setPreviewDialog(false);
    } finally {
      setPreviewLoading(false);
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
      // Save first
      const { html } = await getExportedHtml();
      await fetch(`/api/admin/email-templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyHtml: html }),
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
              <p className="text-xs text-muted-foreground leading-tight capitalize">
                {template.editorType.replace("_", " ")} · {template.category}
              </p>
            </div>
          </div>
          {dirty && (
            <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePreview}>
            <Eye className="h-4 w-4" />
            Preview
          </Button>
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
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="design" className="w-full">
        <TabsList className="mb-6 flex h-auto gap-1 rounded-2xl bg-accent/60 p-1">
          <TabsTrigger value="design" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            {template.editorType === "visual" ? <Paintbrush2 className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
            Design
          </TabsTrigger>
          <TabsTrigger value="meta" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Mail className="h-3.5 w-3.5" />
            Subject
          </TabsTrigger>
          <TabsTrigger value="variables" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Variable className="h-3.5 w-3.5" />
            Variables
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* DESIGN TAB */}
        <TabsContent value="design">
          {template.editorType === "visual" ? (
            <div className="rounded-2xl border border-border/20 overflow-hidden">
              <EmailEditor
                ref={emailEditorRef as never}
                onReady={() => {
                  if (template.designJson && emailEditorRef.current) {
                    try {
                      (emailEditorRef.current as unknown as { loadDesign: (d: unknown) => void }).loadDesign(JSON.parse(template.designJson));
                    } catch {
                      // invalid JSON — start fresh
                    }
                  }
                }}
                style={{ height: 700 }}
                options={{
                  appearance: { theme: "light" },
                  tools: { image: { enabled: true } },
                }}
              />
            </div>
          ) : template.editorType === "react_email" ? (
            <Card className="card-settings p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                  <Code2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">React Email Template</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    This template is rendered from a React component in the codebase.
                    You can edit the subject, preview text, and variables below.
                    To modify the HTML structure, edit the component file directly.
                  </p>
                </div>
              </div>
              {template.templateKey && (
                <div className="rounded-xl bg-background/60 border border-border/10 px-4 py-3">
                  <p className="text-xs text-muted-foreground">Template key</p>
                  <code className="text-sm font-mono font-semibold text-foreground">{template.templateKey}</code>
                </div>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">HTML Editor</p>
                <p className="text-xs text-muted-foreground">Use {"{{variable}}"} for dynamic values</p>
              </div>
              <textarea
                value={htmlContent}
                onChange={(e) => { setHtmlContent(e.target.value); markDirty(); }}
                className="w-full rounded-2xl border border-border/20 bg-accent/40 p-4 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                style={{ minHeight: 500 }}
                spellCheck={false}
              />
            </div>
          )}
        </TabsContent>

        {/* SUBJECT & PREVIEW TEXT TAB */}
        <TabsContent value="meta">
          <Card className="card-settings p-6 space-y-5">
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={template.subject}
                onChange={(e) => setField("subject", e.target.value)}
                placeholder="Welcome to {{site_name}}!"
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
              placeholder='[{"key":"user_name","description":"User display name","sample":"John"}]'
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
            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="space-y-2">
                <Label>Editor Type</Label>
                <Select
                  value={template.editorType}
                  onValueChange={(v) => setField("editorType", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="html">HTML Editor</SelectItem>
                    <SelectItem value="visual">Visual Builder (Unlayer)</SelectItem>
                    <SelectItem value="react_email">React Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

      {/* Preview Dialog */}
      <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
        <DialogContent className="max-w-3xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Email Preview — {template.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-xl border border-border/20 bg-white">
            {previewLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <iframe
                srcDoc={previewHtml}
                className="h-full w-full rounded-xl"
                style={{ minHeight: 500 }}
                title="Email preview"
                sandbox="allow-same-origin"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
