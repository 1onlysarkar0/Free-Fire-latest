"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Loader2,
  Globe,
  Info,
  Search,
  Sparkles,
  Play,
  RefreshCw,
  Pencil,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SeoRow,
  KNOWN_PAGES,
  getIconByName,
  getScoreColor,
  getScoreBadge,
} from "@/lib/seo/helpers";

interface Props {
  initialData: SeoRow[];
  dynamicSlug: string;
}

export default function SeoPage({ initialData, dynamicSlug }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<SeoRow[]>(initialData);
  const [loading, setLoading] = useState(false);

  const [robotsRules, setRobotsRules] = useState<string>("[]");
  const [robotsSaving, setRobotsSaving] = useState(false);

  const [bulkRegenerating, setBulkRegenerating] = useState(false);
  const [bulkAuditing, setBulkAuditing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetch("/api/admin/seo").then((r) => r.json());
      if (Array.isArray(data)) setRows(data);

      const robots = await fetch("/api/admin/seo/robots").then((r) => r.json());
      if (robots && robots.rules) {
        setRobotsRules(JSON.stringify(robots.rules, null, 2));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (id === "global") {
      toast.error("Cannot delete global SEO config.");
      return;
    }
    if (!confirm(`Delete SEO config for "${id}"?`)) return;

    await fetch(`/api/admin/seo/${id}`, { method: "DELETE" });
    toast.success("Deleted.");
    load();
    router.refresh();
  }

  async function handleSaveRobots() {
    setRobotsSaving(true);
    try {
      let parsed = [];
      try {
        parsed = JSON.parse(robotsRules);
      } catch {
        throw new Error("Robots rules must be valid JSON array of objects.");
      }

      const res = await fetch("/api/admin/seo/robots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: parsed }),
      });

      if (!res.ok) throw new Error(await res.text());
      toast.success("Robots.txt configuration saved successfully!");
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Failed to save robots rules."
      );
    } finally {
      setRobotsSaving(false);
    }
  }

  async function triggerBulkRegenerate() {
    if (
      !confirm(
        "Regenerate SEO configs for all tournaments? Existing custom tournament SEO will be updated."
      )
    )
      return;

    setBulkRegenerating(true);
    try {
      const res = await fetch("/api/admin/seo/bulk-regenerate", {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(`Regenerated SEO config for ${data.count} tournaments!`);
        load();
      } else {
        throw new Error(data.error);
      }
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Failed to bulk regenerate."
      );
    } finally {
      setBulkRegenerating(false);
    }
  }

  async function triggerAudit(pageId: string) {
    try {
      const res = await fetch("/api/admin/seo/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });

      if (res.ok) {
        toast.success(`Audit completed for ${pageId}!`);
        load();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function triggerBulkAudit() {
    setBulkAuditing(true);
    try {
      let count = 0;

      for (const row of rows) {
        const res = await fetch("/api/admin/seo/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: row.id }),
        });

        if (res.ok) count++;
      }

      toast.success(`Audited ${count} pages successfully!`);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bulk audit failed.");
    } finally {
      setBulkAuditing(false);
    }
  }

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.id === "global") return -1;
      if (b.id === "global") return 1;

      const aKnown = !!KNOWN_PAGES[a.id];
      const bKnown = !!KNOWN_PAGES[b.id];

      if (aKnown && !bKnown) return -1;
      if (!aKnown && bKnown) return 1;

      return a.id.localeCompare(b.id);
    });
  }, [rows]);

  function PageInfo({ row }: { row: SeoRow }) {
    const info = KNOWN_PAGES[row.id];
    const iconName = row.iconName || "Globe";

    if (info) {
      const Icon = info.icon;
      return (
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">
              {info.label}
            </div>
            <div className="truncate font-mono text-xs text-muted-foreground">
              {info.path}
            </div>
          </div>
        </div>
      );
    }

    if (row.id.startsWith("tournament-")) {
      const TIcon = getIconByName(iconName);
      return (
        <div className="flex min-w-0 items-center gap-2.5">
          <TIcon className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">
              Tournament Page
            </div>
            <div className="truncate font-mono text-xs text-muted-foreground">
              {row.id.replace("tournament-", "")}
            </div>
          </div>
        </div>
      );
    }

    if (row.id.startsWith("page-")) {
      const PIcon = getIconByName(iconName);
      return (
        <div className="flex min-w-0 items-center gap-2.5">
          <PIcon className="h-4 w-4 shrink-0 text-blue-600" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">
              Custom Page
            </div>
            <div className="truncate font-mono text-xs text-muted-foreground">
              {row.id.replace("page-", "")}
            </div>
          </div>
        </div>
      );
    }

    const FIcon = getIconByName(iconName);
    return (
      <div className="flex min-w-0 items-center gap-2.5">
        <FIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="truncate font-mono text-xs font-bold text-muted-foreground">
            {row.id}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6">
      <div className="rounded-xl border bg-background p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 md:gap-4">
            <Search className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                SEO Dashboard
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Manage search engine optimization, live auditing, schema
                validation, and dynamic OG images.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={triggerBulkAudit}
              disabled={bulkAuditing}
              className="w-full sm:w-auto"
            >
              {bulkAuditing ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              <span className="hidden sm:inline">Audit All</span>
              <span className="sm:hidden">Audit Pages</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={triggerBulkRegenerate}
              disabled={bulkRegenerating}
              className="w-full border-primary/20 text-primary hover:bg-primary/5 sm:w-auto"
            >
              {bulkRegenerating ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-4 w-4" />
              )}
              <span className="hidden lg:inline">Regenerate Tournament SEO</span>
              <span className="lg:hidden">Regenerate</span>
            </Button>

            <Link href={`/${dynamicSlug}/seo/new`} className="w-full sm:w-auto">
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Page SEO
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Tabs defaultValue="pages" className="space-y-4 md:space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="grid min-w-[320px] grid-cols-2">
            <TabsTrigger value="pages">SEO Pages ({rows.length})</TabsTrigger>
            <TabsTrigger value="robots">Robots.txt Rules</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pages" className="space-y-4 md:space-y-6">
          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 md:p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="space-y-1 text-xs text-primary/80">
              <p className="font-semibold">Unified Database SEO Strategy:</p>
              <p>
                Each page loads its individual configuration override. Any
                column left empty automatically inherits the values set in the{" "}
                <strong>Global Fallback</strong> config. Tournaments and custom
                pages are indexed and managed here.
              </p>
            </div>
          </div>

          {loading && rows.length === 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx} className="flex flex-col p-5 space-y-4 animate-pulse border border-border/30 rounded-2xl bg-card">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1 mr-3">
                      <div className="h-5 bg-muted rounded-md w-2/3" />
                      <div className="h-4 bg-muted rounded-md w-1/2" />
                    </div>
                    <div className="h-6 bg-muted rounded-full w-14 shrink-0" />
                  </div>
                  <div className="h-4 bg-muted rounded-md w-3/4" />
                  <div className="flex gap-2">
                    <div className="h-5 bg-muted rounded-md w-12" />
                    <div className="h-5 bg-muted rounded-md w-20" />
                  </div>
                  <div className="border-t border-border/10 pt-4 flex gap-2 justify-between">
                    <div className="h-8 bg-muted rounded-lg w-16" />
                    <div className="flex gap-1">
                      <div className="h-8 bg-muted rounded-lg w-8" />
                      <div className="h-8 bg-muted rounded-lg w-8" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : !loading && sortedRows.length === 0 ? (
            <Card className="p-10 border border-border/40 rounded-2xl shadow-xs">
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <Globe className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-semibold text-muted-foreground font-ibm">No SEO configs found</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sortedRows.map((row) => (
                <Card
                  key={row.id}
                  className="group relative flex flex-col overflow-hidden bg-card/75 border border-border/40 shadow-xs rounded-2xl transition-all duration-300 hover:shadow-md hover:border-primary/30 hover:scale-[1.01] hover:bg-card"
                >
                  <div className="flex flex-1 flex-col gap-3.5 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <PageInfo row={row} />
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold shadow-3xs ${getScoreColor(
                          row.seoScore
                        )}`}
                      >
                        {getScoreBadge(row.seoScore)}
                      </span>
                    </div>

                    {row.metaTitle ? (
                      <p className="line-clamp-2 text-xs font-medium text-muted-foreground break-words font-ibm leading-relaxed">
                        {row.metaTitle}
                      </p>
                    ) : (
                      <p className="text-xs italic text-muted-foreground/40 font-ibm">
                        Using fallback
                      </p>
                    )}

                    <div className="flex min-h-[20px] flex-wrap items-center gap-1.5 pt-1">
                      {row.robots && (
                        <code className="rounded border border-border/20 bg-background/50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-muted-foreground break-all leading-normal">
                          {row.robots}
                        </code>
                      )}

                      {row.ogImageDynamic && (
                        <Badge className="border-0 bg-green-50 text-[10px] font-bold text-green-700 shadow-3xs">
                          OG: {row.ogImageTemplate?.toUpperCase() || "DYNAMIC"}
                        </Badge>
                      )}

                      {row.id === "global" && (
                        <Badge
                          variant="secondary"
                          className="border-0 bg-primary/10 text-[10px] font-bold text-primary/80 shadow-3xs"
                        >
                          GLOBAL
                        </Badge>
                      )}

                      {!KNOWN_PAGES[row.id] && row.id !== "global" && (
                        <Badge
                          variant="secondary"
                          className="border-0 bg-blue-50 text-[10px] font-bold text-blue-700 shadow-3xs"
                        >
                          {row.id.startsWith("tournament-")
                            ? "TOURNAMENT"
                            : "PAGE"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 border-t border-border/30 bg-accent/20 px-4 py-2.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs font-bold text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                      onClick={() => triggerAudit(row.id)}
                    >
                      <Play className="mr-1 h-3.5 w-3.5 text-primary" />
                      Audit
                    </Button>

                    <div className="flex-1" />

                    <Link href={`/${dynamicSlug}/seo/${row.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        title="Edit Config"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Link>

                    {row.id !== "global" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 p-0 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                        onClick={() => handleDelete(row.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="robots" className="space-y-4">
          <Card className="space-y-4 p-4 md:p-6">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Configure Robots.txt Directives
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Define crawler rules in structured JSON. The sitemap and content
                signals are automatically appended below.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Rules JSON Array
              </label>
              <textarea
                value={robotsRules}
                onChange={(e) => setRobotsRules(e.target.value)}
                rows={12}
                className="w-full resize-y rounded-lg border bg-background px-3 py-2 font-mono text-xs transition-shadow focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder='[\n  { "userAgent": "*", "allow": ["/"], "disallow": ["/dashboard"] }\n]'
              />
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  Each object needs userAgent, and optional allow/disallow
                  string arrays.
                </span>
              </div>

              <Button
                onClick={handleSaveRobots}
                disabled={robotsSaving}
                size="sm"
                className="w-full sm:w-auto"
              >
                {robotsSaving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Save Rules
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}