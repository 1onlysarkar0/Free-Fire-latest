"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Save, Loader2, Plus, Trash2,
  RefreshCw, CreditCard, Settings, FileText, BarChart3, Inbox, HelpCircle, Copy, Check, ShieldCheck, Zap, Server
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel } from "@/components/ui/field";
import { Muted } from "@/components/ui/typography";
import { QRCodeSVG } from "qrcode.react";
import dynamic from "next/dynamic";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });
import { MarkdownRenderer } from "@/components/markdown-renderer";

interface PaymentConfigData {
  trustedSenders: string[];
  upiId: string;
  upiName: string;
  pageContent: string;
  enabled: boolean;
}

interface VerificationRow {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  claimedAmount: number;
  verifiedAmount: number | null;
  utrNumber: string;
  status: string;
  emailSender: string | null;
  ipAddress: string | null;
  failReason: string | null;
  createdAt: string;
  verifiedAt: string | null;
}

interface PaymentInboxItem {
  id: string;
  utrHash: string;
  utrNumber: string;
  amount: number;
  sender: string;
  emailMessageId?: string;
  isClaimed: boolean;
  receivedAt: string;
}

interface Props {
  initialConfig: PaymentConfigData | null;
  canEdit: boolean;
  canViewLogs: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  verified: { label: "Verified", className: "bg-success/10 text-success" },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive" },
  duplicate_utr: { label: "Duplicate UTR", className: "bg-warning/15 text-warning" },
  amount_mismatch: { label: "Amount Mismatch", className: "bg-warning/15 text-warning" },
  email_not_found: { label: "Not Found", className: "bg-muted text-muted-foreground" },
  pending: { label: "Pending", className: "bg-info/10 text-info" },
};

type ActiveTab = "settings" | "content" | "inbox" | "logs";
type SettingsTab = "guide" | "sources" | "upi" | "system";

const defaultConfig: PaymentConfigData = {
  trustedSenders: [
    "alerts@paytm.com",
    "noreply@alerts.sbi.co.in",
    "alerts@hdfcbank.net",
    "notify@idfcfirstbank.com",
    "alerts@axisbank.com",
    "noreply@icicibank.com",
    "alerts@yesbank.in",
  ],
  upiId: "",
  upiName: "",
  pageContent: "",
  enabled: false,
};

export default function PaymentAdminClient({ initialConfig, canEdit, canViewLogs }: Props) {
  const router = useRouter();
  const [config, setConfig] = useState<PaymentConfigData>(initialConfig || defaultConfig);
  const [saving, setSaving] = useState(false);
  const [newSender, setNewSender] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("settings");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("guide");
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [previewContent, setPreviewContent] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Payment Inbox State
  const [inboxItems, setInboxItems] = useState<PaymentInboxItem[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [inboxPage, setInboxPage] = useState(1);
  const [inboxTotalPages, setInboxTotalPages] = useState(1);
  const [manualUtr, setManualUtr] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualSender, setManualSender] = useState("");
  const [addingInbox, setAddingInbox] = useState(false);
  const [deletingInboxId, setDeletingInboxId] = useState<string | null>(null);

  const set = <K extends keyof PaymentConfigData>(key: K, val: PaymentConfigData[K]) =>
    setConfig((p) => ({ ...p, [key]: val }));

  useEffect(() => {
    if (activeTab === "logs" && canViewLogs) loadVerifications(1);
    if (activeTab === "inbox") loadInbox(1);
  }, [activeTab, canViewLogs]);

  async function loadInbox(page: number) {
    setLoadingInbox(true);
    try {
      const res = await fetch(`/api/admin/payment-inbox?page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setInboxItems(data.data || []);
        setInboxPage(page);
        setInboxTotalPages(data.totalPages ?? 1);
      }
    } catch {
      toast.error("Failed to load payment inbox");
    } finally {
      setLoadingInbox(false);
    }
  }

  async function handleAddManualInbox() {
    if (!manualUtr.trim() || !manualAmount.trim()) {
      toast.error("Please enter UTR number and Amount.");
      return;
    }
    const amt = Number(manualAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Amount must be a valid number.");
      return;
    }

    setAddingInbox(true);
    try {
      const res = await fetch("/api/admin/payment-inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utrNumber: manualUtr.trim(),
          amount: amt,
          sender: manualSender.trim() || "manual@admin",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to add manual UTR");
        return;
      }

      toast.success(data.message || "Manual UTR entry added!");
      setManualUtr("");
      setManualAmount("");
      setManualSender("");
      loadInbox(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error adding UTR");
    } finally {
      setAddingInbox(false);
    }
  }

  async function handleDeleteInboxItem(id: string) {
    if (!confirm("Are you sure you want to delete this UTR entry from the pre-parsed inbox?")) {
      return;
    }

    setDeletingInboxId(id);
    try {
      const res = await fetch(`/api/admin/payment-inbox?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to delete entry");
        return;
      }

      toast.success("UTR entry deleted!");
      setInboxItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error deleting entry");
    } finally {
      setDeletingInboxId(null);
    }
  }

  async function loadVerifications(page: number) {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/admin/payment-verifications?page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setVerifications(data.data || []);
        setLogsPage(page);
        setLogsTotalPages(data.totalPages ?? 1);
      }
    } finally {
      setLoadingLogs(false);
    }
  }

  async function handleSave() {
    if (!canEdit) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/payment-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          trustedSenders: config.trustedSenders.filter((s) => s.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Payment configuration saved.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function addSender() {
    const trimmed = newSender.trim().toLowerCase();
    if (!trimmed || config.trustedSenders.includes(trimmed)) return;
    if (config.trustedSenders.length >= 10) {
      toast.error("Maximum 10 trusted senders allowed.");
      return;
    }
    set("trustedSenders", [...config.trustedSenders, trimmed]);
    setNewSender("");
  }

  function removeSender(email: string) {
    set("trustedSenders", config.trustedSenders.filter((s) => s !== email));
  }

  const workerCodeSnippet = `export default {
  async email(message, env, ctx) {
    const payload = {
      from: message.from,
      to: message.to,
      subject: message.headers.get("subject") || "",
      body: await new Response(message.raw).text(),
    };

    ctx.waitUntil(
      fetch("https://${typeof window !== "undefined" ? window.location.host : "app.1onlysarkar.shop"}/api/webhooks/email-ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${env.EMAIL_WEBHOOK_SECRET || "YOUR_SECRET_TOKEN"}\`,
        },
        body: JSON.stringify(payload),
      })
    );
  },
};`;

  function copyWorkerCode() {
    navigator.clipboard.writeText(workerCodeSnippet);
    setCopiedCode(true);
    toast.success("Cloudflare Worker script copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 3000);
  }

  const tabs: { key: ActiveTab; label: string; icon: React.ElementType }[] = [
    { key: "settings", label: "Settings & Guide", icon: Settings },
    { key: "content", label: "Payment Page UI", icon: FileText },
    { key: "inbox", label: "Payment Inbox", icon: Inbox },
    ...(canViewLogs ? [{ key: "logs" as ActiveTab, label: "Verification Logs", icon: BarChart3 }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Automatic UPI Payment Gateway
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Zero-Maintenance Cloudflare Webhook Ingestion with 50ms UTR Auto-Verification.
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleSave} disabled={saving} className="gap-2 shrink-0">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Configuration
          </Button>
        )}
      </div>

      {/* Main Container Card */}
      <Card className="overflow-hidden border border-border/50 bg-card shadow-sm">
        {/* Navigation Bar */}
        <div className="border-b bg-muted/40 p-2 sm:p-3">
          <div className="flex flex-wrap gap-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === key
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-4 md:p-6">
            {/* ── SETTINGS TAB ── */}
            {activeTab === "settings" && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(["guide", "sources", "upi", "system"] as SettingsTab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSettingsTab(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                        settingsTab === t
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-background text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {t === "guide" ? "Cloudflare & Forwarding Setup Guide" : t === "sources" ? "Payment Sources" : t === "upi" ? "UPI Setup" : "System"}
                    </button>
                  ))}
                </div>

                {/* Cloudflare & Forwarding Setup Guide */}
                {settingsTab === "guide" && (
                  <div className="space-y-6 max-w-4xl">
                    {/* Top Overview Banner */}
                    <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20 p-5 text-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-primary flex items-center gap-2 text-base">
                          <Zap className="h-5 w-5 text-primary" />
                          100% Free &amp; Unlimited Real-Time Webhook Architecture
                        </h3>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/20">
                          <ShieldCheck className="h-3.5 w-3.5" /> Zero IMAP Banning Risk
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Bank alerts are forwarded from Gmail to Cloudflare Email Routing. A lightweight Cloudflare Worker instantly posts the email data to your webhook in real time using non-blocking <code>ctx.waitUntil()</code>. Original emails stay 100% safe in your Gmail inbox!
                      </p>
                    </div>

                    {/* Step-by-Step Step Cards */}
                    <div className="space-y-5 text-sm">
                      {/* Step 1 */}
                      <div className="rounded-2xl border p-5 bg-background shadow-xs space-y-3">
                        <h4 className="font-bold text-foreground flex items-center gap-2 text-base">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-xs">1</span>
                          Cloudflare Email Routing Setup
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Follow this exact path in your Cloudflare Dashboard:
                        </p>
                        <div className="p-3 bg-muted/60 rounded-xl border text-xs font-mono text-foreground flex items-center gap-2">
                          <Server className="h-4 w-4 text-primary shrink-0" />
                          <span>Dashboard → Compute → Email Service → Email Routing</span>
                        </div>
                        <ol className="list-decimal list-inside space-y-2 text-xs text-muted-foreground pl-1">
                          <li><strong>Onboard Domain:</strong> If not already enabled, click <em>Onboard Domain</em> and enable Email Routing.</li>
                          <li><strong>Open Routing Rules:</strong> Select your domain (<code>1onlysarkar.shop</code>) → Click on <strong>Routing Rules</strong> tab.</li>
                          <li><strong>Create Rule:</strong> Click <strong>Create routing rule</strong>.</li>
                          <li><strong>Rule Settings:</strong>
                            <ul className="list-disc list-inside pl-4 pt-1 space-y-1 text-foreground/90">
                              <li>Email pattern: <code>pay</code></li>
                              <li>Domain: <code>1onlysarkar.shop</code> (creates <code>pay@1onlysarkar.shop</code>)</li>
                              <li>Action: Choose <strong>Send to a Worker</strong></li>
                              <li>Worker: Select your Email Worker (created in Step 2)</li>
                            </ul>
                          </li>
                          <li>Click <strong>Save</strong>.</li>
                        </ol>
                      </div>

                      {/* Step 2 */}
                      <div className="rounded-2xl border p-5 bg-background shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                          <h4 className="font-bold text-foreground flex items-center gap-2 text-base">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-xs">2</span>
                            Create Cloudflare Worker Code
                          </h4>
                          <Button size="sm" variant="default" onClick={copyWorkerCode} className="gap-1.5 text-xs shrink-0">
                            {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedCode ? "Copied Script!" : "Copy Worker Script"}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Go to <strong>Cloudflare Dashboard → Workers &amp; Pages → Create Worker</strong> (or via local <code>wrangler</code>). Paste the optimized code below:
                        </p>
                        <pre className="p-4 bg-slate-950 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800 leading-relaxed">
                          {workerCodeSnippet}
                        </pre>
                        <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground border">
                          <strong>💡 Environment Variables Note:</strong> In Cloudflare Worker Settings → Variables → Add <code>EMAIL_WEBHOOK_SECRET</code> secret variable containing your secret token (e.g. <code>6*x@vACW2H84&amp;eULIpyqDkJ3F)u9nV$dET%</code>).
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="rounded-2xl border p-5 bg-background shadow-xs space-y-3">
                        <h4 className="font-bold text-foreground flex items-center gap-2 text-base">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-xs">3</span>
                          Gmail Auto-Forwarding Rule (Original Emails Preserved)
                        </h4>
                        <ol className="list-decimal list-inside space-y-2 text-xs text-muted-foreground pl-1">
                          <li>Go to <strong>Gmail Settings → Forwarding and POP/IMAP → Add a forwarding address</strong>.</li>
                          <li>Enter your Cloudflare email: <code>pay@1onlysarkar.shop</code>.</li>
                          <li>Confirm verification link sent to Cloudflare Worker log / destination inbox.</li>
                          <li>Ensure <strong>&quot;Keep Gmail&apos;s copy in the Inbox&quot;</strong> is selected so original emails remain in your mailbox.</li>
                          <li><strong>Forward ONLY Bank Emails:</strong> Create a Gmail Filter:
                            <div className="my-1.5 p-2.5 bg-muted rounded-lg font-mono text-[11px] text-foreground border">
                              From: (alerts@paytm.com OR noreply@alerts.sbi.co.in OR alerts@hdfcbank.net OR no-reply@famapp.in)
                            </div>
                            Check <em>&quot;Forward it to: pay@1onlysarkar.shop&quot;</em> and click <strong>Create Filter</strong>.
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Sources */}
                {settingsTab === "sources" && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Trusted Sender Emails</h3>
                      <Muted className="text-xs mt-0.5">The system ingests emails ONLY from these verified senders.</Muted>
                    </div>
                    <div className="space-y-2 max-w-lg">
                      {config.trustedSenders.map((email) => (
                        <div key={email} className="flex items-center gap-2 rounded-xl bg-background/60 px-3 py-2 border">
                          <span className="text-sm font-mono flex-1">{email}</span>
                          {canEdit && (
                            <button onClick={() => removeSender(email)} className="text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {canEdit && config.trustedSenders.length < 10 && (
                      <div className="flex gap-2 max-w-lg">
                        <Input placeholder="new-bank-alert@bank.com" value={newSender} onChange={(e) => setNewSender(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSender()} />
                        <Button variant="outline" onClick={addSender} className="gap-1 shrink-0">
                          <Plus className="h-4 w-4" /> Add
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* UPI Setup */}
                {settingsTab === "upi" && (
                  <div className="space-y-5 max-w-lg">
                    <Field>
                      <FieldLabel>UPI ID (VPA)</FieldLabel>
                      <Input placeholder="yourname@upi / 9876543210@paytm" value={config.upiId} onChange={(e) => set("upiId", e.target.value)} disabled={!canEdit} />
                      <Muted className="text-xs">Dynamic QR codes generate automatically using this VPA.</Muted>
                    </Field>

                    <Field>
                      <FieldLabel>UPI Merchant / Account Name</FieldLabel>
                      <Input placeholder="Saurabh Sarkar" value={config.upiName} onChange={(e) => set("upiName", e.target.value)} disabled={!canEdit} />
                      <Muted className="text-xs">Security filter: Emails must contain this name to be processed.</Muted>
                    </Field>

                    {config.upiId && (
                      <div className="pt-2">
                        <Muted className="text-xs font-semibold uppercase tracking-wider mb-2 block">Live QR Preview</Muted>
                        <div className="p-4 bg-white rounded-xl border w-fit shadow-sm">
                          <QRCodeSVG value={`upi://pay?pa=${encodeURIComponent(config.upiId)}&pn=${encodeURIComponent(config.upiName)}`} size={140} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* System Controls */}
                {settingsTab === "system" && (
                  <div className="space-y-5 max-w-lg">
                    <div className="flex items-center justify-between rounded-xl border p-4 bg-background">
                      <div>
                        <p className="font-medium text-sm text-foreground">Enable Payment Gateway</p>
                        <Muted className="text-xs">Allow users to top-up wallet via auto-verified UPI.</Muted>
                      </div>
                      <Switch checked={config.enabled} onCheckedChange={(val) => set("enabled", val)} disabled={!canEdit} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── CONTENT TAB ── */}
            {activeTab === "content" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Custom Instructions (Markdown)</span>
                  <Button variant="ghost" size="sm" onClick={() => setPreviewContent(!previewContent)}>
                    {previewContent ? "Edit Code" : "Live Preview"}
                  </Button>
                </div>

                {previewContent ? (
                  <div className="p-4 border rounded-xl bg-background min-h-[250px]">
                    <MarkdownRenderer content={config.pageContent || "*No instructions set.*"} />
                  </div>
                ) : (
                  <div data-color-mode="auto" className="rounded-xl overflow-hidden border">
                    <MDEditor value={config.pageContent} onChange={(val) => set("pageContent", val || "")} height={350} />
                  </div>
                )}
              </div>
            )}

            {/* ── INBOX TAB ── */}
            {activeTab === "inbox" && (
              <div className="space-y-6">
                {/* Add Manual UTR Section */}
                {canEdit && (
                  <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Plus className="h-4 w-4 text-primary" />
                      Add Manual UTR Entry
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input placeholder="UTR Number (e.g. 420420458140)" value={manualUtr} onChange={(e) => setManualUtr(e.target.value)} />
                      <Input type="number" placeholder="Amount (₹)" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} />
                      <Input placeholder="Sender (Optional)" value={manualSender} onChange={(e) => setManualSender(e.target.value)} />
                    </div>
                    <Button onClick={handleAddManualInbox} disabled={addingInbox} size="sm" className="gap-2">
                      {addingInbox ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Add to Pre-Parsed Inbox
                    </Button>
                  </div>
                )}

                {/* Inbox List */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Pre-Parsed Pending Payments</h3>
                  <Button variant="outline" size="sm" onClick={() => loadInbox(1)} disabled={loadingInbox} className="gap-1.5">
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingInbox ? "animate-spin" : ""}`} />
                    Refresh Inbox
                  </Button>
                </div>

                {loadingInbox ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : inboxItems.length === 0 ? (
                  <div className="text-center p-8 border rounded-xl bg-background/50">
                    <p className="text-sm text-muted-foreground">No pending pre-parsed payments in inbox.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b text-muted-foreground uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="p-3">UTR Number</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Sender</th>
                          <th className="p-3">Received At</th>
                          {canEdit && <th className="p-3 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {inboxItems.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-mono font-medium">{item.utrNumber}</td>
                            <td className="p-3 font-semibold text-green-600 dark:text-green-400">₹{item.amount}</td>
                            <td className="p-3">{item.sender}</td>
                            <td className="p-3 text-muted-foreground">{new Date(item.receivedAt).toLocaleString()}</td>
                            {canEdit && (
                              <td className="p-3 text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteInboxItem(item.id)} disabled={deletingInboxId === item.id} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                  {deletingInboxId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── VERIFICATION LOGS TAB ── */}
            {activeTab === "logs" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Audit & Verification Logs</h3>
                  <Button variant="outline" size="sm" onClick={() => loadVerifications(1)} disabled={loadingLogs} className="gap-1.5">
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
                    Refresh Logs
                  </Button>
                </div>

                {loadingLogs ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : verifications.length === 0 ? (
                  <div className="text-center p-8 border rounded-xl bg-background/50">
                    <p className="text-sm text-muted-foreground">No verification logs found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b text-muted-foreground uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="p-3">User</th>
                          <th className="p-3">Claimed Amt</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Fail Reason</th>
                          <th className="p-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {verifications.map((row) => {
                          const st = STATUS_CONFIG[row.status] || { label: row.status, className: "bg-muted text-muted-foreground" };
                          return (
                            <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                              <td className="p-3">
                                <div className="font-medium text-foreground">{row.userName || "Unknown"}</div>
                                <div className="text-[11px] text-muted-foreground">{row.userEmail}</div>
                              </td>
                              <td className="p-3 font-semibold">₹{row.claimedAmount}</td>
                              <td className="p-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${st.className}`}>
                                  {st.label}
                                </span>
                              </td>
                              <td className="p-3 text-muted-foreground max-w-xs truncate">{row.failReason || "—"}</td>
                              <td className="p-3 text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
