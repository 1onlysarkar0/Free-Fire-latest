"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Trash2,
  Loader2,
  Globe,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconPicker } from "@/components/ui/icon-picker";
import {
  SeoRow,
  SeoForm,
  emptyForm,
  KNOWN_PAGES,
  getScoreColor,
  getScoreBadge,
  auditSeo,
  SeoAuditResult,
} from "@/lib/seo/helpers";

interface Props {
  initialData: SeoRow;
  dynamicSlug: string;
  mode: "edit" | "create";
  siteUrl?: string;
  siteName?: string;
}

const textareaClassName =
  "min-h-[112px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors transition-shadow placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const selectClassName =
  "flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

function PreviewValue({
  value,
  fallback,
  className = "",
}: {
  value?: string | null;
  fallback: string;
  className?: string;
}) {
  const safe = value?.trim();

  return (
    <span className={safe ? className : `${className} text-muted-foreground`}>
      {safe || fallback}
    </span>
  );
}

export default function SeoEditClient({
  initialData,
  dynamicSlug,
  mode,
  siteUrl,
  siteName,
}: Props) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pageId, setPageId] = useState("");
  const [form, setForm] = useState<SeoForm>({ ...emptyForm });
  const [liveAudit, setLiveAudit] = useState<SeoAuditResult | null>(null);

  useEffect(() => {
    if (mode === "edit" && initialData) {
      const nextForm: SeoForm = { ...emptyForm };

      for (const key of Object.keys(emptyForm) as (keyof SeoForm)[]) {
        const value = initialData[key];
        if (value !== undefined && value !== null) {
          (nextForm as Record<string, unknown>)[key] = value;
        }
      }

      setForm(nextForm);
    }

    if (mode === "create") {
      setForm({ ...emptyForm });
    }
  }, [initialData, mode]);

  useEffect(() => {
    const id = mode === "create" ? pageId.trim() : initialData?.id || "";

    const result = auditSeo(id, {
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      metaKeywords: form.metaKeywords,
      ogTitle: form.ogTitle,
      ogDescription: form.ogDescription,
      ogImage: form.ogImage,
      canonicalUrl: form.canonicalUrl,
      robots: form.robots,
      structuredDataJson: form.structuredDataJson,
      schemaType: form.schemaType,
    });

    setLiveAudit(result);
  }, [form, mode, pageId, initialData]);

  const pageInfo = useMemo(
    () => (mode === "edit" ? KNOWN_PAGES[initialData.id] : null),
    [mode, initialData]
  );

  const seoId = mode === "edit" ? initialData.id : pageId.trim();

  const setF = <K extends keyof SeoForm>(key: K, value: SeoForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const clean = (value: unknown): string | boolean | null => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }

    if (typeof value === "boolean") return value;
    return null;
  };

  const getCharColor = (length: number, min: number, max: number) => {
    if (length === 0) return "text-muted-foreground";
    if (length >= min && length <= max) return "text-foreground";
    return "text-muted-foreground";
  };

  async function handleSave() {
    const id = mode === "create" ? pageId.trim() : initialData.id;

    if (!id) {
      toast.error("Page ID is required.");
      return;
    }

    setSaving(true);

    try {
      const payload: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(form)) {
        if (key === "seoScore" || key === "lastAudited") continue;
        payload[key] = clean(value);
      }

      if (liveAudit) {
        payload.seoScore = liveAudit.score;
      }

      const res =
        mode === "create"
          ? await fetch("/api/admin/seo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...payload }),
          })
          : await fetch(`/api/admin/seo/${initialData.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success(
        mode === "create" ? "SEO config created." : "SEO config updated."
      );

      router.push(`/${dynamicSlug}/seo`);
      router.refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error saving");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (initialData.id === "global") {
      toast.error("Cannot delete global SEO config.");
      return;
    }

    if (!window.confirm(`Delete SEO config for "${initialData.id}"?`)) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/seo/${initialData.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success("Deleted.");
      router.push(`/${dynamicSlug}/seo`);
      router.refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error deleting");
    } finally {
      setDeleting(false);
    }
  }

  const previewTitle = form.metaTitle?.trim() || form.ogTitle?.trim();
  const previewDescription =
    form.metaDescription?.trim() || form.ogDescription?.trim();
  const socialTitle = form.ogTitle?.trim() || form.metaTitle?.trim();
  const socialDescription =
    form.ogDescription?.trim() || form.metaDescription?.trim();

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
              <Link
                href={`/${dynamicSlug}/seo`}
                aria-label="Back to SEO configuration"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>

              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 shrink-0">
                  <div className="rounded-2xl border border-border bg-muted/60 p-2">
                    <IconPicker
                      value={form.iconName || ""}
                      onChange={(v) => setF("iconName", v)}
                      placeholder="Select icon"
                      className="w-full min-w-[132px] sm:w-[160px]"
                    />
                  </div>
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
                      {mode === "create"
                        ? "Create SEO config"
                        : `Edit ${pageInfo?.label || initialData.id}`}
                    </h1>

                    {seoId ? (
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {seoId}
                      </Badge>
                    ) : null}
                  </div>

                  {pageInfo ? (
                    <p className="text-sm text-muted-foreground">
                      {pageInfo.description}
                    </p>
                  ) : mode === "create" ? (
                    <p className="text-sm text-muted-foreground">
                      Add a page-specific SEO override using global theme styles only.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              {liveAudit ? (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Audit
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getScoreColor(
                      liveAudit.score
                    )}`}
                  >
                    {getScoreBadge(liveAudit.score)}
                  </span>
                </div>
              ) : null}

              {mode === "edit" && initialData.id !== "global" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full sm:w-auto"
                >
                  {deleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete
                </Button>
              ) : null}

              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/${dynamicSlug}/seo`)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {mode === "create" ? "Create" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        <div className="min-w-0 space-y-4 sm:space-y-6">
          {mode === "create" ? (
            <Card className="p-4 sm:p-5 lg:p-6">
              <Field>
                <FieldLabel>Page ID *</FieldLabel>
                <Input
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                  placeholder="page-slug"
                  className="font-mono"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Use the route slug or route key used by your SEO config.
                </p>
              </Field>
            </Card>
          ) : null}

          <Card className="min-w-0 overflow-hidden p-4 sm:p-5 lg:p-6">
            <Tabs defaultValue="meta" className="min-w-0">
              <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <TabsList className="inline-flex h-auto min-w-max gap-1 rounded-xl border border-border bg-muted p-1">
                  <TabsTrigger value="meta" className="px-4 text-xs sm:text-sm">
                    Meta
                  </TabsTrigger>
                  <TabsTrigger value="og" className="px-4 text-xs sm:text-sm">
                    Open Graph
                  </TabsTrigger>
                  <TabsTrigger value="twitter" className="px-4 text-xs sm:text-sm">
                    Twitter/X
                  </TabsTrigger>
                  <TabsTrigger value="schema" className="px-4 text-xs sm:text-sm">
                    Schema
                  </TabsTrigger>
                  <TabsTrigger value="technical" className="px-4 text-xs sm:text-sm">
                    Technical
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="meta" className="mt-6 space-y-5">
                <Field>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel>Meta title</FieldLabel>
                    <span
                      className={`text-xs font-medium tabular-nums ${getCharColor(
                        (form.metaTitle ?? "").length,
                        30,
                        60
                      )}`}
                    >
                      {(form.metaTitle ?? "").length} / 60
                    </span>
                  </div>
                  <Input
                    value={form.metaTitle ?? ""}
                    onChange={(e) => setF("metaTitle", e.target.value)}
                    placeholder="Enter title"
                  />
                </Field>

                <Field>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel>Meta description</FieldLabel>
                    <span
                      className={`text-xs font-medium tabular-nums ${getCharColor(
                        (form.metaDescription ?? "").length,
                        120,
                        160
                      )}`}
                    >
                      {(form.metaDescription ?? "").length} / 160
                    </span>
                  </div>
                  <textarea
                    value={form.metaDescription ?? ""}
                    onChange={(e) => setF("metaDescription", e.target.value)}
                    rows={5}
                    className={textareaClassName}
                    placeholder="Enter description"
                  />
                </Field>

                <Field>
                  <FieldLabel>Meta keywords</FieldLabel>
                  <Input
                    value={form.metaKeywords ?? ""}
                    onChange={(e) => setF("metaKeywords", e.target.value)}
                    placeholder="keyword-1, keyword-2"
                  />
                </Field>
              </TabsContent>

              <TabsContent value="og" className="mt-6 space-y-5">
                <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-foreground">
                      Dynamic OG image
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use generated OG artwork instead of a fixed image URL.
                    </p>
                  </div>

                  <Switch
                    checked={!!form.ogImageDynamic}
                    onCheckedChange={(checked) => setF("ogImageDynamic", checked)}
                  />
                </div>

                {form.ogImageDynamic ? (
                  <Field>
                    <FieldLabel>OG image template</FieldLabel>
                    <select
                      value={form.ogImageTemplate ?? ""}
                      onChange={(e) => setF("ogImageTemplate", e.target.value)}
                      className={selectClassName}
                    >
                      <option value="">Select template</option>
                      <option value="homepage">Homepage</option>
                      <option value="tournament">Tournament</option>
                      <option value="custom-page">Custom page</option>
                      <option value="auth-page">Auth page</option>
                    </select>
                  </Field>
                ) : null}

                <Field>
                  <FieldLabel>OG title</FieldLabel>
                  <Input
                    value={form.ogTitle ?? ""}
                    onChange={(e) => setF("ogTitle", e.target.value)}
                    placeholder="Optional override"
                  />
                </Field>

                <Field>
                  <FieldLabel>OG description</FieldLabel>
                  <textarea
                    value={form.ogDescription ?? ""}
                    onChange={(e) => setF("ogDescription", e.target.value)}
                    rows={5}
                    className={textareaClassName}
                    placeholder="Optional override"
                  />
                </Field>

                {!form.ogImageDynamic ? (
                  <Field>
                    <FieldLabel>OG image URL</FieldLabel>
                    <Input
                      value={form.ogImage ?? ""}
                      onChange={(e) => setF("ogImage", e.target.value)}
                      placeholder="https://example.com/image.png"
                    />
                  </Field>
                ) : null}

                <Field>
                  <FieldLabel>OG type</FieldLabel>
                  <Input
                    value={form.ogType ?? ""}
                    onChange={(e) => setF("ogType", e.target.value)}
                    placeholder="website"
                  />
                </Field>
              </TabsContent>

              <TabsContent value="twitter" className="mt-6 space-y-5">
                <Field>
                  <FieldLabel>Twitter card type</FieldLabel>
                  <Input
                    value={form.twitterCard ?? ""}
                    onChange={(e) => setF("twitterCard", e.target.value)}
                    placeholder="summary_large_image"
                  />
                </Field>

                <Field>
                  <FieldLabel>Twitter handle</FieldLabel>
                  <Input
                    value={form.twitterSite ?? ""}
                    onChange={(e) => setF("twitterSite", e.target.value)}
                    placeholder="@handle"
                  />
                </Field>

                <Field>
                  <FieldLabel>Twitter title</FieldLabel>
                  <Input
                    value={form.twitterTitle ?? ""}
                    onChange={(e) => setF("twitterTitle", e.target.value)}
                    placeholder="Optional override"
                  />
                </Field>

                <Field>
                  <FieldLabel>Twitter description</FieldLabel>
                  <textarea
                    value={form.twitterDescription ?? ""}
                    onChange={(e) => setF("twitterDescription", e.target.value)}
                    rows={5}
                    className={textareaClassName}
                    placeholder="Optional override"
                  />
                </Field>

                <Field>
                  <FieldLabel>Twitter image URL</FieldLabel>
                  <Input
                    value={form.twitterImage ?? ""}
                    onChange={(e) => setF("twitterImage", e.target.value)}
                    placeholder="https://example.com/image.png"
                  />
                </Field>
              </TabsContent>

              <TabsContent value="schema" className="mt-6 space-y-5">
                <Field>
                  <FieldLabel>Primary schema type</FieldLabel>
                  <select
                    value={form.schemaType ?? ""}
                    onChange={(e) => setF("schemaType", e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Select schema</option>
                    <option value="WebPage">WebPage</option>
                    <option value="SportsEvent">SportsEvent</option>
                    <option value="FAQPage">FAQPage</option>
                    <option value="HowTo">HowTo</option>
                    <option value="Organization">Organization</option>
                    <option value="Article">Article</option>
                  </select>
                </Field>

                <Field>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FieldLabel className="font-mono">
                      Custom JSON-LD schema
                    </FieldLabel>

                    {form.structuredDataJson ? (
                      <Badge variant="secondary" className="text-[11px]">
                        {liveAudit?.checks.find(
                          (c) => c.name === "Structured Data Valid"
                        )?.passed
                          ? "Valid JSON-LD"
                          : "Invalid JSON"}
                      </Badge>
                    ) : null}
                  </div>

                  <textarea
                    value={form.structuredDataJson ?? ""}
                    onChange={(e) => setF("structuredDataJson", e.target.value)}
                    rows={10}
                    className={`${textareaClassName} font-mono text-xs`}
                    placeholder='{"@context":"https://schema.org","@type":"WebPage"}'
                    spellCheck={false}
                  />
                </Field>
              </TabsContent>

              <TabsContent value="technical" className="mt-6 space-y-5">
                <Field>
                  <FieldLabel>Canonical URL</FieldLabel>
                  <Input
                    value={form.canonicalUrl ?? ""}
                    onChange={(e) => setF("canonicalUrl", e.target.value)}
                    placeholder="https://example.com/page"
                  />
                </Field>

                <Field>
                  <FieldLabel>Robots directive</FieldLabel>
                  <Input
                    value={form.robots ?? ""}
                    onChange={(e) => setF("robots", e.target.value)}
                    placeholder="index, follow"
                  />
                </Field>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Button
            variant="outline"
            type="button"
            className="w-full lg:hidden"
            onClick={() => setShowPreview((prev) => !prev)}
          >
            {showPreview ? (
              <EyeOff className="mr-2 h-4 w-4" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            {showPreview ? "Hide preview" : "Show preview"}
          </Button>

          <div className={`${showPreview ? "block" : "hidden"} space-y-4 lg:block`}>
            <Card className="space-y-3 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
                Search preview
              </div>

              <div className="space-y-1.5">
                <div className="break-all text-xs text-muted-foreground">
                  <PreviewValue value={siteUrl} fallback="Site URL not set" />
                  {seoId ? (
                    <span className="text-muted-foreground"> / {seoId}</span>
                  ) : null}
                </div>

                <div className="text-base font-semibold leading-snug text-foreground">
                  <PreviewValue
                    value={previewTitle}
                    fallback="Meta title not set"
                  />
                </div>

                <div className="text-sm leading-6 text-muted-foreground">
                  <PreviewValue
                    value={previewDescription}
                    fallback="Meta description not set"
                  />
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex min-h-[160px] items-center justify-center border-b border-border bg-muted p-4">
                {form.ogImageDynamic ? (
                  <div className="w-full space-y-2 text-center">
                    <Badge variant="secondary" className="mx-auto">
                      Dynamic OG
                    </Badge>
                    <div className="line-clamp-2 text-sm font-semibold text-foreground">
                      {socialTitle || "Title not set"}
                    </div>
                    <div className="line-clamp-3 text-xs text-muted-foreground">
                      {socialDescription || "Description not set"}
                    </div>
                  </div>
                ) : form.ogImage?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.ogImage}
                    alt="OG preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                    <Globe className="h-6 w-6" />
                    <span className="text-xs">No OG image configured</span>
                  </div>
                )}
              </div>

              <div className="space-y-1 p-4">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {siteName?.trim() || "Site name not set"}
                </div>
                <div className="line-clamp-1 text-sm font-semibold text-foreground">
                  {socialTitle || "Title not set"}
                </div>
                <div className="line-clamp-3 text-xs leading-5 text-muted-foreground">
                  {socialDescription || "Description not set"}
                </div>
              </div>
            </Card>

            {liveAudit ? (
              <Card className="space-y-4 p-4 sm:p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  SEO audit
                </div>

                <div className="space-y-3">
                  {liveAudit.checks.map((check, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {check.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-foreground" />
                        ) : check.severity === "critical" ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="text-sm font-medium text-foreground">
                          {check.name}
                        </div>
                        {!check.passed ? (
                          <div className="text-xs leading-5 text-muted-foreground">
                            {check.message}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}