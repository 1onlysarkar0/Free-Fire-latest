"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mail, Plus, Pencil, Trash2, Loader2, CheckCircle2, XCircle,
  Star, StarOff, Send, Eye, EyeOff, Server, Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export interface SmtpProvider {
  id: string;
  label: string;
  providerType: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProviderForm {
  label: string;
  providerType: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  isDefault: boolean;
  isActive: boolean;
}

const PROVIDER_PRESETS: Record<string, Partial<ProviderForm>> = {
  gmail_smtp: { host: "smtp.gmail.com", port: 587, secure: false },
  resend_smtp: { host: "smtp.resend.com", port: 465, secure: true, username: "resend" },
};

const EMPTY_FORM: ProviderForm = {
  label: "",
  providerType: "gmail_smtp",
  host: "",
  port: 587,
  secure: false,
  username: "",
  password: "",
  fromName: "",
  fromEmail: "",
  replyTo: "",
  isDefault: false,
  isActive: true,
};

export default function SmtpProvidersClient({
  initialProviders,
}: {
  initialProviders: SmtpProvider[];
}) {
  const router = useRouter();
  const [providers, setProviders] = useState<SmtpProvider[]>(initialProviders);
  const [loading, setLoading] = useState(false);

  // Modals
  const [providerDialog, setProviderDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Test dialog
  const [testDialog, setTestDialog] = useState(false);
  const [testProviderId, setTestProviderId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  async function loadProviders() {
    setLoading(true);
    const data = await fetch("/api/admin/smtp-providers").then((r) => r.json());
    setProviders(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowPass(false);
    setProviderDialog(true);
  }

  function openEdit(p: SmtpProvider) {
    setEditingId(p.id);
    setForm({
      label: p.label,
      providerType: p.providerType,
      host: p.host,
      port: p.port,
      secure: p.secure,
      username: p.username,
      password: p.password, // masked from server
      fromName: p.fromName,
      fromEmail: p.fromEmail,
      replyTo: p.replyTo ?? "",
      isDefault: p.isDefault,
      isActive: p.isActive,
    });
    setShowPass(false);
    setProviderDialog(true);
  }

  function applyPreset(type: string) {
    const preset = PROVIDER_PRESETS[type] ?? {};
    setForm((f) => ({ ...f, providerType: type, ...preset }));
  }

  const setF = useCallback(
    <K extends keyof typeof EMPTY_FORM>(key: K, val: (typeof EMPTY_FORM)[K]) =>
      setForm((f) => ({ ...f, [key]: val })),
    []
  );

  async function handleSave() {
    if (!form.label || !form.host || !form.username || !form.fromEmail) {
      toast.error("Label, host, username, and from email are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, replyTo: form.replyTo || null };
      const res = editingId
        ? await fetch(`/api/admin/smtp-providers/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/smtp-providers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error(await res.text());
      toast.success(editingId ? "Provider updated." : "Provider added.");
      setProviderDialog(false);
      await loadProviders();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error saving provider.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Delete provider "${label}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/smtp-providers/${id}`, { method: "DELETE" });
    toast.success("Provider deleted.");
    await loadProviders();
    router.refresh();
  }

  async function handleSetDefault(id: string) {
    await fetch(`/api/admin/smtp-providers/${id}/default`, { method: "POST" });
    toast.success("Default provider updated.");
    await loadProviders();
    router.refresh();
  }

  function openTest(id: string) {
    setTestProviderId(id);
    setTestEmail("");
    setTestDialog(true);
  }

  async function handleTest() {
    if (!testEmail || !testProviderId) return;
    setTestLoading(true);
    try {
      const res = await fetch(`/api/admin/smtp-providers/${testProviderId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message ?? "Test email sent!");
        setTestDialog(false);
      } else {
        toast.error(data.error ?? "Test failed.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setTestLoading(false);
    }
  }

  const defaultProvider = providers.find((p) => p.isDefault);

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="header-admin">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Server className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">SMTP Providers</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure multiple email sending providers. One can be set as default.
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Provider
        </Button>
      </div>

      {/* Active default banner */}
      {defaultProvider && (
        <div className="flex items-center gap-3 rounded-2xl border border-border/20 bg-primary/5 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm font-medium text-foreground">
            Default provider:{" "}
            <span className="font-semibold">{defaultProvider.label}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              ({defaultProvider.fromEmail})
            </span>
          </p>
        </div>
      )}

      {/* Provider list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="card-list animate-pulse p-5">
              <div className="h-4 w-48 rounded bg-accent/60" />
            </div>
          ))}
        </div>
      ) : providers.length === 0 ? (
        <Card className="card-list">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-base font-semibold text-foreground">No SMTP providers yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a Gmail or Resend provider to enable email sending.
            </p>
            <Button className="mt-5" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add First Provider
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <div
              key={p.id}
              className={`card-list p-5 transition-all ${p.isDefault ? "ring-2 ring-primary/20" : ""}`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="mt-0.5 rounded-lg bg-primary/10 p-2 shrink-0">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{p.label}</p>
                      {p.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          <Star className="h-3 w-3" />
                          Default
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.isActive
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                        {p.providerType === "resend_smtp" ? "Resend" : "Gmail SMTP"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.fromName} &lt;{p.fromEmail}&gt; · {p.host}:{p.port}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {!p.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleSetDefault(p.id)}
                    >
                      <Star className="h-3 w-3" />
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => openTest(p.id)}
                  >
                    <Send className="h-3 w-3" />
                    Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => openEdit(p)}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleDelete(p.id, p.label)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Provider Dialog */}
      <Dialog open={providerDialog} onOpenChange={setProviderDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Provider" : "Add SMTP Provider"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Provider Type */}
            <div className="space-y-2">
              <Label>Provider Type</Label>
              <Select
                value={form.providerType}
                onValueChange={(v) => applyPreset(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail_smtp">Gmail SMTP</SelectItem>
                  <SelectItem value="resend_smtp">Resend SMTP</SelectItem>
                </SelectContent>
              </Select>
              {form.providerType === "resend_smtp" && (
                <p className="text-xs text-muted-foreground">
                  Pre-filled with Resend defaults. Get your API key at resend.com and use it as the password.
                </p>
              )}
            </div>

            {/* Label */}
            <div className="space-y-2">
              <Label>Label / Name</Label>
              <Input
                value={form.label}
                onChange={(e) => setF("label", e.target.value)}
                placeholder="e.g. Gmail Main Account"
              />
            </div>

            {/* Host + Port */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label>SMTP Host</Label>
                <Input
                  value={form.host}
                  onChange={(e) => setF("host", e.target.value)}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input
                  type="number"
                  value={form.port}
                  onChange={(e) => setF("port", Number(e.target.value))}
                  placeholder="587"
                />
              </div>
            </div>

            {/* Username + Password */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setF("username", e.target.value)}
                  placeholder={form.providerType === "resend_smtp" ? "resend" : "your@gmail.com"}
                  readOnly={form.providerType === "resend_smtp"}
                />
              </div>
              <div className="space-y-2">
                <Label>Password / API Key</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setF("password", e.target.value)}
                    placeholder={form.providerType === "resend_smtp" ? "re_••••" : "App password"}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* From Name + From Email */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>From Name</Label>
                <Input
                  value={form.fromName}
                  onChange={(e) => setF("fromName", e.target.value)}
                  placeholder="Tournament Platform"
                />
              </div>
              <div className="space-y-2">
                <Label>From Email</Label>
                <Input
                  value={form.fromEmail}
                  onChange={(e) => setF("fromEmail", e.target.value)}
                  placeholder="noreply@example.com"
                  type="email"
                />
              </div>
            </div>

            {/* Reply-To */}
            <div className="space-y-2">
              <Label>Reply-To Email (optional)</Label>
              <Input
                value={form.replyTo}
                onChange={(e) => setF("replyTo", e.target.value)}
                placeholder="support@example.com"
                type="email"
              />
            </div>

            {/* SSL + Active + Default toggles */}
            <div className="space-y-3 rounded-xl bg-background/60 border border-border/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Use SSL/TLS</p>
                  <p className="text-xs text-muted-foreground">Enable for port 465, disable for 587 (STARTTLS)</p>
                </div>
                <Switch checked={form.secure} onCheckedChange={(v) => setF("secure", v)} />
              </div>
              <div className="flex items-center justify-between border-t border-border/10 pt-3">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">Inactive providers cannot send emails</p>
                </div>
                <Switch checked={form.isActive} onCheckedChange={(v) => setF("isActive", v)} />
              </div>
              <div className="flex items-center justify-between border-t border-border/10 pt-3">
                <div>
                  <p className="text-sm font-medium">Set as Default</p>
                  <p className="text-xs text-muted-foreground">This provider will be used for all outgoing emails</p>
                </div>
                <Switch checked={form.isDefault} onCheckedChange={(v) => setF("isDefault", v)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Provider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={testDialog} onOpenChange={setTestDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Enter a recipient email address. A test message will be sent via this provider.
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
            <Button variant="outline" onClick={() => setTestDialog(false)}>
              Cancel
            </Button>
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
