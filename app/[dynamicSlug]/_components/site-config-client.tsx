"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Muted } from "@/components/ui/typography";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface SiteConfigData {
  logoUrl: string; logoSrc: string; logoAlt: string; logoTitle: string;
  authLoginText: string; authLoginUrl: string; authSignupText: string; authSignupUrl: string;
  authPanelImageUrl: string; authPanelColor: string;
  copyrightText: string;
  heroHeadline: string; heroSubheadline: string;
  heroCtaPrimaryText: string; heroCtaPrimaryUrl: string;
  heroCtaSecondaryText: string; heroCtaSecondaryUrl: string;
  heroBadgeText: string; heroBadgeUrl: string;
  contactEmail: string; companyAddress: string; jurisdictionName: string;
  adminSlug: string;
}

export default function SiteConfigClient({ initialData }: { initialData: SiteConfigData }) {
  const router = useRouter();
  const [data, setData] = useState<SiteConfigData>(initialData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initialData) {
      fetch("/api/admin/site-config").then(r => r.json()).then((d) => {
        setData({
          logoUrl: d.logoUrl ?? "", logoSrc: d.logoSrc ?? "", logoAlt: d.logoAlt ?? "", logoTitle: d.logoTitle ?? "",
          authLoginText: d.authLoginText ?? "", authLoginUrl: d.authLoginUrl ?? "",
          authSignupText: d.authSignupText ?? "", authSignupUrl: d.authSignupUrl ?? "",
          authPanelImageUrl: d.authPanelImageUrl ?? "", authPanelColor: d.authPanelColor ?? "#FF5A1F",
          copyrightText: d.copyrightText ?? "",
          heroHeadline: d.heroHeadline ?? "", heroSubheadline: d.heroSubheadline ?? "",
          heroCtaPrimaryText: d.heroCtaPrimaryText ?? "", heroCtaPrimaryUrl: d.heroCtaPrimaryUrl ?? "",
          heroCtaSecondaryText: d.heroCtaSecondaryText ?? "", heroCtaSecondaryUrl: d.heroCtaSecondaryUrl ?? "",
          heroBadgeText: d.heroBadgeText ?? "", heroBadgeUrl: d.heroBadgeUrl ?? "",
          contactEmail: d.contactEmail ?? "", companyAddress: d.companyAddress ?? "",
          jurisdictionName: d.jurisdictionName ?? "", adminSlug: d.adminSlug ?? "admin",
        });
      });
    }
  }, [initialData]);

  const set = (key: keyof SiteConfigData) => (val: string) =>
    setData(prev => prev ? { ...prev, [key]: val } : prev);

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Site configuration saved successfully.");
      router.refresh();
    } catch (e: unknown) {
      toast.error("Save failed: " + (e instanceof Error ? e.message : String(e)));
    } finally { setSaving(false); }
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
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Site Configuration</h1>
            <p className="text-sm text-muted-foreground mt-0.5">All changes are saved directly to the database.</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card className="card-settings">
        <Tabs defaultValue="branding">
          <TabsList className="w-full justify-start rounded-none border-b bg-accent/40 h-auto p-0 flex-wrap overflow-x-auto">
            {[["branding","Branding"],["hero","Hero"],["auth","Auth Panel"],["footer","Footer"],["contact","Contact"],["admin","Admin Access"]].map(([v,l]) => (
              <TabsTrigger key={v} value={v} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-4 py-3 text-sm font-medium whitespace-nowrap">{l}</TabsTrigger>
            ))}
          </TabsList>
          <div className="p-4 md:p-6">
            <TabsContent value="branding" className="mt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field><FieldLabel>Logo URL (click destination)</FieldLabel><Input value={data.logoUrl} onChange={e => set("logoUrl")(e.target.value)} placeholder="/" /></Field>
              <Field><FieldLabel>Logo Image Src</FieldLabel><Input value={data.logoSrc} onChange={e => set("logoSrc")(e.target.value)} placeholder="/assets/favicon.png" /></Field>
              <Field><FieldLabel>Logo Alt Text</FieldLabel><Input value={data.logoAlt} onChange={e => set("logoAlt")(e.target.value)} /></Field>
              <Field><FieldLabel>Site Name / Logo Title</FieldLabel><Input value={data.logoTitle} onChange={e => set("logoTitle")(e.target.value)} /></Field>
              <Field><FieldLabel>Login Button Text</FieldLabel><Input value={data.authLoginText} onChange={e => set("authLoginText")(e.target.value)} /></Field>
              <Field><FieldLabel>Login Button URL</FieldLabel><Input value={data.authLoginUrl} onChange={e => set("authLoginUrl")(e.target.value)} /></Field>
              <Field><FieldLabel>Sign Up Button Text</FieldLabel><Input value={data.authSignupText} onChange={e => set("authSignupText")(e.target.value)} /></Field>
              <Field><FieldLabel>Sign Up Button URL</FieldLabel><Input value={data.authSignupUrl} onChange={e => set("authSignupUrl")(e.target.value)} /></Field>
            </TabsContent>
            <TabsContent value="hero" className="mt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Field><FieldLabel>Headline</FieldLabel><Input value={data.heroHeadline} onChange={e => set("heroHeadline")(e.target.value)} /></Field></div>
              <div className="md:col-span-2"><Field><FieldLabel>Subheadline</FieldLabel><textarea value={data.heroSubheadline} onChange={e => set("heroSubheadline")(e.target.value)} rows={3} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none transition-shadow" /></Field></div>
              <Field><FieldLabel>Primary CTA Text</FieldLabel><Input value={data.heroCtaPrimaryText} onChange={e => set("heroCtaPrimaryText")(e.target.value)} /></Field>
              <Field><FieldLabel>Primary CTA URL</FieldLabel><Input value={data.heroCtaPrimaryUrl} onChange={e => set("heroCtaPrimaryUrl")(e.target.value)} /></Field>
              <Field><FieldLabel>Secondary CTA Text</FieldLabel><Input value={data.heroCtaSecondaryText} onChange={e => set("heroCtaSecondaryText")(e.target.value)} /></Field>
              <Field><FieldLabel>Secondary CTA URL</FieldLabel><Input value={data.heroCtaSecondaryUrl} onChange={e => set("heroCtaSecondaryUrl")(e.target.value)} /></Field>
              <Field><FieldLabel>Badge Text</FieldLabel><Input value={data.heroBadgeText} onChange={e => set("heroBadgeText")(e.target.value)} /></Field>
              <Field><FieldLabel>Badge URL</FieldLabel><Input value={data.heroBadgeUrl} onChange={e => set("heroBadgeUrl")(e.target.value)} /></Field>
            </TabsContent>
            <TabsContent value="auth" className="mt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Field><FieldLabel>Auth Panel Image URL</FieldLabel><Input value={data.authPanelImageUrl} onChange={e => set("authPanelImageUrl")(e.target.value)} placeholder="https://..." /></Field></div>
              <Field><FieldLabel>Auth Panel Accent Color</FieldLabel><Input value={data.authPanelColor} onChange={e => set("authPanelColor")(e.target.value)} placeholder="#FF5A1F" /></Field>
              <div className="flex items-end gap-3">
                <div className="h-9 w-9 rounded-lg border" style={{ backgroundColor: data.authPanelColor }} />
                <Muted className="text-xs">Color preview</Muted>
              </div>
            </TabsContent>
            <TabsContent value="footer" className="mt-0 grid grid-cols-1 gap-4">
              <Field><FieldLabel>Copyright Text</FieldLabel><Input value={data.copyrightText} onChange={e => set("copyrightText")(e.target.value)} placeholder="© 2025 1onlysarkar. All rights reserved." /></Field>
            </TabsContent>
            <TabsContent value="contact" className="mt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field><FieldLabel>Contact Email</FieldLabel><Input value={data.contactEmail} onChange={e => set("contactEmail")(e.target.value)} placeholder="contact@example.com" /></Field>
              <Field><FieldLabel>Jurisdiction Name</FieldLabel><Input value={data.jurisdictionName} onChange={e => set("jurisdictionName")(e.target.value)} placeholder="India" /></Field>
              <div className="md:col-span-2"><Field><FieldLabel>Company Address</FieldLabel><textarea value={data.companyAddress} onChange={e => set("companyAddress")(e.target.value)} rows={2} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none transition-shadow" /></Field></div>
            </TabsContent>
            <TabsContent value="admin" className="mt-0 space-y-4">
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-700 dark:text-amber-300">
                <p className="font-semibold mb-1">Admin Panel Gateway Slug</p>
                <p className="text-xs leading-relaxed">
                  Configure the URL path used to access the admin panel. Visiting <strong>/{data.adminSlug || "admin"}</strong> will directly open the admin dashboard.
                  Change this to something unique to prevent discovery of your admin panel URL.
                </p>
              </div>
              <div className="max-w-md">
                <Field>
                  <FieldLabel>Admin Access Slug</FieldLabel>
                  <Input value={data.adminSlug} onChange={e => set("adminSlug")(e.target.value)} placeholder="admin" />
                  <Muted className="text-xs">Access the admin panel via: /{data.adminSlug || "admin"}</Muted>
                </Field>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
