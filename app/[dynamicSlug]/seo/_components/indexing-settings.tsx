"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel } from "@/components/ui/field";
import { Muted } from "@/components/ui/typography";
import { toast } from "sonner";
import { Save, Key, RefreshCw, Send, CheckCircle, XCircle, Globe } from "lucide-react";

export default function IndexingSettings() {
  const [config, setConfig] = useState<any>({
    googleServiceAccountJson: "",
    indexNowKey: "",
    autoSubmitGoogle: false,
    autoSubmitIndexNow: false,
  });
  
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/seo/indexing").then((r) => r.json());
      if (res.config) setConfig(res.config);
      if (res.logs) setLogs(res.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const setVal = (key: string, val: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: val }));
  };

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/seo/indexing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error(await res.text());
      toast.success("Indexing configuration saved successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleManualSubmit() {
    if (!manualUrl) {
      toast.error("Please enter a URL to submit");
      return;
    }
    
    setManualSubmitting(true);
    try {
      const res = await fetch("/api/admin/seo/indexing/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: manualUrl }),
      });

      if (!res.ok) throw new Error(await res.text());
      toast.success("URL submitted successfully!");
      setManualUrl("");
      loadData(); // Refresh logs
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setManualSubmitting(false);
    }
  }

  let serviceAccountEmail = "";
  if (config.googleServiceAccountJson) {
    try {
      const parsed = JSON.parse(config.googleServiceAccountJson);
      if (parsed && typeof parsed === "object" && typeof parsed.client_email === "string") {
        serviceAccountEmail = parsed.client_email;
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
        <RefreshCw className="animate-spin" /> Loading configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      
      {/* Configuration Cards Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Google Indexing API Card */}
        <Card className="card-settings">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-4 border-b pb-4">
              <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">Google Indexing API</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Instantly notify Google of content changes</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-background/60 border border-border/10">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">Auto-Submit to Google</p>
                  <Muted className="text-xs">Automatically ping Google on new/updated content.</Muted>
                </div>
                <Switch 
                  checked={config.autoSubmitGoogle} 
                  onCheckedChange={(v) => setVal("autoSubmitGoogle", v)} 
                />
              </div>
              
              <Field>
                <FieldLabel>Service Account JSON <span className="text-muted-foreground font-normal">(Required)</span></FieldLabel>
                <Textarea
                  className="min-h-[160px] font-mono text-xs"
                  placeholder='{"type": "service_account", ...}'
                  value={config.googleServiceAccountJson || ""}
                  onChange={(e) => setVal("googleServiceAccountJson", e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                  Requires enabling the Indexing API in Google Cloud Console and adding your service account email as an Owner in Google Search Console.
                </p>
                {serviceAccountEmail && (
                  <div className="mt-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400 leading-relaxed font-sans">
                    <p className="font-semibold">Service Account Email detected:</p>
                    <code className="block mt-1 p-1.5 bg-background border border-emerald-500/20 rounded-lg font-mono select-all break-all text-emerald-600 dark:text-emerald-300">{serviceAccountEmail}</code>
                    <p className="mt-1 text-[10px] text-emerald-600/90 dark:text-emerald-400/80">Copy this email and add it as an <strong>Owner</strong> (Delegated Owner) in your Google Search Console settings.</p>
                  </div>
                )}
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* IndexNow API Card */}
        <Card className="card-settings">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-4 border-b pb-4">
              <div className="h-10 w-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">IndexNow Protocol</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Notify Bing, Yandex, Naver & Seznam</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-background/60 border border-border/10">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">Auto-Submit to IndexNow</p>
                  <Muted className="text-xs">Automatically ping IndexNow endpoints for updates.</Muted>
                </div>
                <Switch 
                  checked={config.autoSubmitIndexNow} 
                  onCheckedChange={(v) => setVal("autoSubmitIndexNow", v)} 
                />
              </div>
              
              <Field>
                <FieldLabel>Active IndexNow Key</FieldLabel>
                <div className="bg-white border border-border rounded-xl px-4 py-3 font-mono text-xs break-all text-muted-foreground shadow-3xs">
                  {config.indexNowKey || "Not configured. Set INDEXNOW_KEY in your .env file."}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                  To change this key, update the <code className="bg-background px-1 py-0.5 rounded border">INDEXNOW_KEY</code> variable in your server&apos;s environment config or <code className="bg-background px-1 py-0.5 rounded border">.env</code> file.
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  This validation key is dynamically served at <code className="bg-background px-1.5 py-0.5 rounded border">/api/indexnow-key</code> to verify your ownership of the domain.
                </p>
              </Field>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} className="min-h-11 px-6 bg-primary hover:bg-primary/95 text-white">
          {saving ? <RefreshCw className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Configuration
        </Button>
      </div>

      <hr className="border-border/30 my-6" />

      {/* Manual Submission Widget */}
      <div className="space-y-3">
        <h3 className="text-base font-bold font-lora tracking-tight text-foreground">Manual URL Submission</h3>
        <Card className="card-settings bg-card/60">
          <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-semibold text-foreground">Target URL to Index</label>
              <Input 
                type="url" 
                placeholder="https://www.1onlysarkar.shop/tournaments/example-tournament" 
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
              />
            </div>
            <Button onClick={handleManualSubmit} disabled={manualSubmitting || !manualUrl} className="min-h-11 px-6 bg-foreground text-background hover:bg-foreground/90">
              {manualSubmitting ? <RefreshCw className="animate-spin w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Submit URL
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Submission Logs List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold font-lora tracking-tight text-foreground">Recent Submission Logs</h3>
          <Button variant="outline" size="sm" onClick={loadData} className="h-8 border-border/60 hover:bg-accent/40">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Logs
          </Button>
        </div>
        
        <Card className="card-list overflow-hidden border border-border/40 rounded-2xl shadow-3xs">
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-background border-b border-border/40 text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Time</th>
                  <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Target API</th>
                  <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">URL</th>
                  <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider w-1/3">Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 bg-white">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground font-ibm">
                      No indexing submissions logged yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-muted-foreground font-ibm">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold font-ibm text-foreground">
                        {log.api}
                      </td>
                      <td className="px-5 py-3.5 truncate max-w-[200px] text-xs font-ibm">
                        <a href={log.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          {log.url}
                        </a>
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        {log.status === "success" ? (
                          <span className="inline-flex items-center text-green-600 font-semibold gap-1 font-ibm">
                            <CheckCircle className="w-3.5 h-3.5" /> Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-red-500 font-semibold gap-1 font-ibm">
                            <XCircle className="w-3.5 h-3.5" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[11px] font-mono truncate max-w-[300px] text-muted-foreground">
                        {log.response}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

    </div>
  );
}
