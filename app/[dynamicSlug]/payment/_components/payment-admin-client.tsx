"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Save, Loader2, Eye, EyeOff, Plus, Trash2,
  Wifi, WifiOff, CheckCircle, XCircle, RefreshCw,
  CreditCard, Settings, FileText, BarChart3, AlertTriangle,
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
const MDPreview = dynamic(() => import("@uiw/react-markdown-preview"), { ssr: false });

interface PaymentConfigData {
  gmailEmail: string;
  gmailAppPassword: string;
  trustedSenders: string[];
  checkDays: number;
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

type ActiveTab = "settings" | "content" | "logs";
type SettingsTab = "gmail" | "sources" | "upi" | "system";

const defaultConfig: PaymentConfigData = {
  gmailEmail: "",
  gmailAppPassword: "",
  trustedSenders: [
    "alerts@paytm.com",
    "noreply@alerts.sbi.co.in",
    "alerts@hdfcbank.net",
    "notify@idfcfirstbank.com",
    "alerts@axisbank.com",
    "noreply@icicibank.com",
    "alerts@yesbank.in",
  ],
  checkDays: 1,
  upiId: "",
  upiName: "",
  pageContent: "",
  enabled: false,
};

export default function PaymentAdminClient({ initialConfig, canEdit, canViewLogs }: Props) {
  const router = useRouter();
  const [config, setConfig] = useState<PaymentConfigData>(initialConfig || defaultConfig);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [newSender, setNewSender] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("settings");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("gmail");
  const [verifications, setVerifications] = useState<VerificationRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [previewContent, setPreviewContent] = useState(false);

  const set = <K extends keyof PaymentConfigData>(key: K, val: PaymentConfigData[K]) =>
    setConfig((p) => ({ ...p, [key]: val }));

  useEffect(() => {
    if (activeTab === "logs" && canViewLogs) loadVerifications(1);
  }, [activeTab, canViewLogs]);

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

  async function handleTestConnection() {
    if (!config.gmailEmail) {
      toast.error("Enter a Gmail address first.");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/payment-config/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gmailEmail: config.gmailEmail,
          gmailAppPassword: config.gmailAppPassword,
        }),
      });
      const data = await res.json();
      setTestResult({ success: data.success, message: data.message || data.error || "" });
    } catch {
      setTestResult({ success: false, message: "Network error during test." });
    } finally {
      setTesting(false);
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

  const tabs: { key: ActiveTab; label: string; icon: React.ElementType }[] = [
    { key: "settings", label: "Settings", icon: Settings },
    { key: "content", label: "Page Content", icon: FileText },
    ...(canViewLogs ? [{ key: "logs" as ActiveTab, label: "Verification Logs", icon: BarChart3 }] : []),
  ];

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="header-admin">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Payment Gateway</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configure UPI payments, Gmail IMAP verification, and page content.</p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      {/* Security Info Box */}
      <div className="rounded-2xl bg-info/10 dark:bg-info/5 border border-info/20 p-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-info shrink-0 mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-semibold text-info">Security Notes</p>
          <ul className="text-xs text-info/80 space-y-0.5 list-disc list-inside">
            <li>Payments are verified by checking your actual Gmail inbox via IMAP.</li>
            <li>Each UTR number can only be used <strong>ONCE</strong>.</li>
            <li>Only unread emails are processed — emails are marked read after verification.</li>
            <li>Rate limiting: max 5 verification attempts per user per 15 minutes.</li>
            <li>Never share your Gmail App Password. Use a dedicated Gmail account.</li>
          </ul>
        </div>
      </div>

      {/* Main Tabs */}
      <Card className="card-settings">
        <div className="flex gap-1 p-2 bg-accent/40 border-b">
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
                  {(["gmail", "sources", "upi", "system"] as SettingsTab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSettingsTab(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                        settingsTab === t
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-background text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {t === "gmail" ? "Gmail Setup" : t === "sources" ? "Payment Sources" : t === "upi" ? "UPI Setup" : "System"}
                    </button>
                  ))}
                </div>

                {/* Gmail Setup */}
                {settingsTab === "gmail" && (
                  <div className="space-y-5">
                    <div className="rounded-2xl bg-warning/10 dark:bg-warning/5 border border-warning/20 p-4 text-sm">
                      <p className="font-semibold text-warning mb-2">How to create a Gmail App Password:</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs text-warning/80">
                        <li>Go to <strong>myaccount.google.com</strong></li>
                        <li>Select <strong>Security → 2-Step Verification → App passwords</strong></li>
                        <li>Select &quot;Mail&quot; and &quot;Other device&quot; → name it after your app</li>
                        <li>Copy the 16-character password shown</li>
                        <li>Paste it in the App Password field below</li>
                      </ol>
                    </div>
                    <div className="space-y-4 max-w-lg">
                      <Field>
                        <FieldLabel>Gmail Address</FieldLabel>
                        <Input type="email" placeholder="payments@gmail.com" value={config.gmailEmail} onChange={(e) => set("gmailEmail", e.target.value)} disabled={!canEdit} />
                      </Field>
                      <Field>
                        <FieldLabel>App Password</FieldLabel>
                        <div className="relative">
                          <Input type={showPass ? "text" : "password"} placeholder="16-character app password" value={config.gmailAppPassword} onChange={(e) => set("gmailAppPassword", e.target.value)} disabled={!canEdit} className="pr-10" />
                          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <Muted className="text-xs">Leave blank to keep the existing password.</Muted>
                      </Field>
                      {canEdit && (
                        <div className="space-y-2">
                          <Button variant="outline" onClick={handleTestConnection} disabled={testing || !config.gmailEmail} className="gap-2">
                            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                            Test Gmail Connection
                          </Button>
                          {testResult && (
                            <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
                              testResult.success
                                ? "bg-success/10 text-green-800 border border-success/20"
                                : "bg-destructive/10 text-destructive border border-destructive/20"
                            }`}>
                              {testResult.success ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                              {testResult.message}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment Sources */}
                {settingsTab === "sources" && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Trusted Sender Emails</h3>
                      <Muted className="text-xs mt-0.5">The system checks <strong>UNREAD</strong> emails from these senders within the selected days.</Muted>
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
                        <Input placeholder="alerts@newbank.com" value={newSender} onChange={(e) => setNewSender(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSender()} />
                        <Button variant="outline" onClick={addSender} className="gap-1 shrink-0"><Plus className="h-4 w-4" /> Add</Button>
                      </div>
                    )}
                    <Field>
                      <FieldLabel>Check Window (Days Back)</FieldLabel>
                      <select value={config.checkDays} onChange={(e) => set("checkDays", parseInt(e.target.value))} disabled={!canEdit}
                        className="flex h-9 w-full max-w-xs rounded-lg border bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                        {[1, 2, 3, 5, 7].map((d) => (
                          <option key={d} value={d}>{d} {d === 1 ? "day" : "days"}</option>
                        ))}
                      </select>
                      <Muted className="text-xs">Only unread emails received within this window will be checked.</Muted>
                    </Field>
                  </div>
                )}

                {/* UPI Setup */}
                {settingsTab === "upi" && (
                  <div className="space-y-5">
                    <h3 className="text-sm font-semibold text-foreground">UPI Payment Details</h3>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Field>
                          <FieldLabel>UPI ID</FieldLabel>
                          <Input placeholder="yourname@paytm" value={config.upiId} onChange={(e) => set("upiId", e.target.value)} disabled={!canEdit} />
                          <Muted className="text-xs">e.g. name@paytm, name@ybl, name@okaxis</Muted>
                        </Field>
                        <Field>
                          <FieldLabel>Display Name</FieldLabel>
                          <Input placeholder="1onlysarkar" value={config.upiName} onChange={(e) => set("upiName", e.target.value)} disabled={!canEdit} />
                          <Muted className="text-xs">Shown as payee name on the QR code.</Muted>
                        </Field>
                      </div>
                      <div className="flex flex-col items-center justify-center">
                        {config.upiId ? (
                          <div className="text-center space-y-2">
                            <Muted className="text-xs font-medium uppercase tracking-[0.08em]">QR Preview</Muted>
                            <div className="p-3 bg-white rounded-xl border shadow-sm inline-block">
                              <QRPreview upiId={config.upiId} upiName={config.upiName} />
                            </div>
                            <p className="text-xs font-mono text-muted-foreground">{config.upiId}</p>
                          </div>
                        ) : (
                          <div className="text-center text-sm text-muted-foreground">Enter UPI ID to see QR preview</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* System Toggle */}
                {settingsTab === "system" && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-background/60 border max-w-lg">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">Payment System Enabled</p>
                        <Muted className="text-xs">When disabled, users see &quot;Payment unavailable&quot;.</Muted>
                      </div>
                      <Switch checked={config.enabled} onCheckedChange={(v) => set("enabled", v)} disabled={!canEdit} />
                    </div>
                    {config.enabled ? (
                      <div className="p-3 rounded-xl bg-success/10 border border-success/20 flex items-center gap-2 text-sm text-green-800 max-w-lg">
                        <CheckCircle className="h-4 w-4 shrink-0" />
                        Payment system is <strong>active</strong>.
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-background/60 border flex items-center gap-2 text-sm text-muted-foreground max-w-lg">
                        <WifiOff className="h-4 w-4 shrink-0" />
                        Payment system is <strong>disabled</strong>.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── PAGE CONTENT TAB ── */}
            {activeTab === "content" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Wallet Page Content</h3>
                    <Muted className="text-xs">Markdown content shown above the QR code on the wallet page.</Muted>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPreviewContent(!previewContent)} className="gap-2">
                    {previewContent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {previewContent ? "Edit" : "Preview"}
                  </Button>
                </div>
                {previewContent ? (
                  <div className="min-h-64 bg-background rounded-xl border p-6 prose prose-sm max-w-none">
                    <MDPreview source={config.pageContent} />
                  </div>
                ) : (
                  <div data-color-mode="light">
                    <MDEditor value={config.pageContent} onChange={(v) => set("pageContent", v || "")} height={400} preview="edit" />
                  </div>
                )}
              </div>
            )}

            {/* ── LOGS TAB ── */}
            {activeTab === "logs" && canViewLogs && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Payment Verification Log</h3>
                  <Button variant="outline" size="sm" onClick={() => loadVerifications(logsPage)} disabled={loadingLogs} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${loadingLogs ? "animate-spin" : ""}`} />Refresh
                  </Button>
                </div>

                {loadingLogs ? (
                  <div className="rounded-2xl bg-accent/40 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-accent/60">
                        {["User","UTR","Claimed","Verified","Status","Sender","Date"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody className="divide-y">
                        {[1,2,3].map(i => (
                          <tr key={i} className="animate-pulse">
                            {[1,2,3,4,5,6,7].map(j => (
                              <td key={j} className="px-4 py-3"><div className="h-4 w-16 rounded bg-accent/60" /></td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : verifications.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground rounded-2xl bg-accent/40">No verification attempts yet.</div>
                ) : (
                  <div className="rounded-2xl bg-accent/40 shadow-sm overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead className="bg-accent/60">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">User</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">UTR</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Claimed</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Verified</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Status</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground hidden md:table-cell">Sender</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground hidden lg:table-cell">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {verifications.map((v) => {
                          const statusCfg = STATUS_CONFIG[v.status] || { label: v.status, className: "bg-muted text-muted-foreground" };
                          return (
                            <tr key={v.id} className="hover:bg-accent/20 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-medium text-sm text-foreground">{v.userName || "—"}</p>
                                <p className="text-xs text-muted-foreground">{v.userEmail || v.userId}</p>
                              </td>
                              <td className="px-4 py-3">
                                <code className="text-xs bg-background/80 rounded px-1.5 py-0.5 font-mono">{v.utrNumber}</code>
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-sm">₹{v.claimedAmount}</td>
                              <td className="px-4 py-3 text-right">
                                {v.verifiedAmount != null ? <span className="text-success font-medium text-sm">₹{v.verifiedAmount}</span> : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.className}`}>{statusCfg.label}</span>
                                {v.failReason && <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">{v.failReason}</p>}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{v.emailSender || "—"}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                                {new Date(v.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={logsPage <= 1 || loadingLogs} onClick={() => loadVerifications(logsPage - 1)}>Previous</Button>
                  <span className="text-sm text-muted-foreground flex items-center px-2">Page {logsPage}</span>
                  <Button variant="outline" size="sm" disabled={logsPage >= logsTotalPages || loadingLogs} onClick={() => loadVerifications(logsPage + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>
        </Card>
    </div>
  );
}

function QRPreview({ upiId, upiName }: { upiId: string; upiName: string }) {
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName || "")}&cu=INR`;
  return <QRCodeSVG value={upiUrl} size={150} bgColor="#ffffff" fgColor="#000000" level="M" />;
}
