"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Eye, EyeOff, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel } from "@/components/ui/field";
import { Muted } from "@/components/ui/typography";

export interface SmtpData {
  host: string; port: number; username: string; password: string;
  fromName: string; fromEmail: string; secure: boolean; enabled: boolean;
}

export default function SmtpClient({ initialData }: { initialData: SmtpData }) {
  const router = useRouter();
  const [data, setData] = useState<SmtpData>(initialData);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!initialData) {
      fetch("/api/admin/smtp").then(r => r.json()).then(setData);
    }
  }, [initialData]);

  const set = (key: keyof SmtpData, val: unknown) => setData(p => p ? { ...p, [key]: val } : p);

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/smtp", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error(await res.text());
      toast.success("SMTP configuration saved.");
      router.refresh();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  if (!data) return (
    <div className="w-full">
      <div className="card-list animate-pulse p-8">
        <div className="space-y-4">
          <div className="h-8 w-48 rounded bg-accent/60" />
          <div className="h-4 w-72 rounded bg-accent/40" />
          <div className="grid grid-cols-2 gap-4 mt-6">
            {[1,2,3,4].map(i => <div key={i} className="h-12 rounded-xl bg-accent/60" />)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="header-admin">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">SMTP Configuration</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Credentials stored securely in the database.</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card className="card-settings">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between p-4 rounded-xl bg-background/60 border border-border/10">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">Email Sending Enabled</p>
              <Muted className="text-xs">Toggle off to disable all outbound emails.</Muted>
            </div>
            <Switch checked={data.enabled} onCheckedChange={v => set("enabled", v)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field>
              <FieldLabel>SMTP Host</FieldLabel>
              <Input value={data.host} onChange={e => set("host", e.target.value)} placeholder="smtp.gmail.com" />
            </Field>
            <Field>
              <FieldLabel>Port</FieldLabel>
              <Input type="number" value={data.port} onChange={e => set("port", Number(e.target.value))} placeholder="587" />
            </Field>
            <Field>
              <FieldLabel>Username</FieldLabel>
              <Input value={data.username} onChange={e => set("username", e.target.value)} placeholder="your@email.com" />
            </Field>
            <Field>
              <FieldLabel>Password / App Password</FieldLabel>
              <div className="relative">
                <Input type={showPass ? "text" : "password"} value={data.password} onChange={e => set("password", e.target.value)} placeholder="••••••••••••" className="pr-10" />
                <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field>
              <FieldLabel>From Name</FieldLabel>
              <Input value={data.fromName} onChange={e => set("fromName", e.target.value)} placeholder="1onlysarkar" />
            </Field>
            <Field>
              <FieldLabel>From Email</FieldLabel>
              <Input value={data.fromEmail} onChange={e => set("fromEmail", e.target.value)} placeholder="noreply@example.com" />
            </Field>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-background/60 border border-border/10">
            <Switch checked={data.secure} onCheckedChange={v => set("secure", v)} id="secure" />
            <div className="space-y-0.5">
              <label htmlFor="secure" className="text-sm font-medium cursor-pointer">Use SSL/TLS (secure)</label>
              <Muted className="text-xs">Enable for port 465, disable for 587 (STARTTLS).</Muted>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
