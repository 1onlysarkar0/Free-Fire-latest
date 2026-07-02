"use client";

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="monaco-loading flex h-full items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-xs text-muted-foreground">Loading editor…</span>
      </div>
    </div>
  ),
});

import {
  Save,
  Send,
  Copy,
  Loader2,
  Code2,
  Mail,
  Settings,
  Variable,
  LayoutTemplate,
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  PenLine,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

/** Database-driven site configuration — NO hardcoded fallbacks. */
export interface SiteConfig {
  siteName: string;
  logoUrl?: string | null;
  contactEmail?: string | null;
  companyAddress?: string | null;
  copyrightText?: string | null;
}

const CATEGORIES = [
  "auth",
  "wallet",
  "tournaments",
  "notifications",
  "marketing",
  "system",
] as const;

type PreviewMode = "desktop" | "tablet" | "mobile";

/* ------------------------------------------------------------------ */
/*  SSR-Safe Hooks                                                     */
/* ------------------------------------------------------------------ */

/** Returns true only after client-side mount. Prevents hydration mismatch. */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Media query that defaults to false on both server AND initial client render.
 *  Updates after mount via useEffect — no hydration mismatch. */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function renderTemplateLocal(
  html: string,
  variables: Record<string, string>
) {
  let rendered = html;
  for (const [key, value] of Object.entries(variables)) {
    const safe = String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    rendered = rendered.replaceAll(`{{${key}}}`, safe);
    rendered = rendered.replaceAll(`{{ ${key} }}`, safe);
  }
  return rendered;
}

/* Simple textarea fallback */
function SimpleEditor({
  value,
  onChange,
  language,
}: {
  value: string;
  onChange: (val: string) => void;
  language: "html" | "json";
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      className={cn(
        "simple-editor h-full w-full resize-none bg-background p-4 leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-primary/20",
        language === "json" ? "text-xs" : "text-sm"
      )}
      style={{ minHeight: "300px", tabSize: 2 }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EmailDesignerClient({
  template: initialTemplate,
  adminSlug,
  siteConfig,
}: {
  template: TemplateData;
  adminSlug: string;
  siteConfig: SiteConfig;
}) {
  const router = useRouter();
  const mounted = useMounted();

  /* Responsive — SSR safe (default false, updates after mount) */
  const isSmallScreen = useMediaQuery("(max-width: 767px)");
  const isTouch = useMediaQuery("(hover: none) and (pointer: coarse)");

  /* State */
  const [template, setTemplate] = useState(initialTemplate);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [monacoFailed, setMonacoFailed] = useState(false);

  const [htmlContent, setHtmlContent] = useState(initialTemplate.bodyHtml);
  const [variablesSchema, setVariablesSchema] = useState(
    initialTemplate.variablesSchema ?? "[]"
  );
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");

  const [testDialog, setTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("design");

  /* Resizable split — desktop only */
  const [splitPercent, setSplitPercent] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  /* Refs */
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* CRITICAL: Default to simple editor until mounted to avoid hydration mismatch.
     After mount, switch to Monaco if screen is large enough. */
  const useSimpleEditor = !mounted || isSmallScreen || isTouch || monacoFailed;

  const markDirty = useCallback(() => setDirty(true), []);

  const setField = useCallback(
    <K extends keyof TemplateData>(key: K, val: TemplateData[K]) => {
      setTemplate((t) => ({ ...t, [key]: val }));
      markDirty();
    },
    [markDirty]
  );

  /* ================================================================ */
  /*  PREVIEW ENGINE — 100% DATABASE DRIVEN, ZERO HARDCODED FALLBACKS  */
  /* ================================================================ */
  const getRenderedHtmlLocal = useCallback(
    (rawHtml: string) => {
      const sample: Record<string, string> = {
        siteName: siteConfig.siteName ?? "",
        siteLogo: siteConfig.logoUrl ?? "",
        copyrightText: siteConfig.copyrightText ?? `© ${new Date().getFullYear()}`,
        contactEmail: siteConfig.contactEmail ?? "",
        companyAddress: siteConfig.companyAddress ?? "",
      };

      if (variablesSchema) {
        try {
          const schema = JSON.parse(variablesSchema) as Array<{
            key: string;
            sample?: string;
          }>;
          for (const v of schema) {
            if (v?.key) sample[v.key] = v.sample ?? `{{${v.key}}}`;
          }
        } catch {
          /* ignore invalid JSON */
        }
      }
      return renderTemplateLocal(rawHtml, sample);
    },
    [variablesSchema, siteConfig]
  );

  /* Debounced preview generation */
  useEffect(() => {
    const t = setTimeout(() => {
      setPreviewHtml(getRenderedHtmlLocal(htmlContent));
    }, 300);
    return () => clearTimeout(t);
  }, [htmlContent, getRenderedHtmlLocal]);

  /* Auto-save draft to localStorage */
  useEffect(() => {
    if (!dirty) return;
    setAutoSaveStatus("saving");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          `email-draft-${template.id}`,
          JSON.stringify({
            htmlContent,
            variablesSchema,
            subject: template.subject,
            previewText: template.previewText,
            timestamp: Date.now(),
          })
        );
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2000);
      } catch {
        /* storage full — silently fail */
      }
    }, 3000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [dirty, htmlContent, variablesSchema, template.subject, template.previewText, template.id]);

  /* Keyboard shortcut: Ctrl/Cmd + S */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (dirty && !saving) handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, saving]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ================================================================ */
  /*  RESIZE DRAG — Mouse + Touch (Desktop only)                       */
  /* ================================================================ */
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(Math.max(pct, 25), 75));
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        handleMove(e.touches[0].clientX);
      }
    };
    const handleUp = () => setIsDragging(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", handleUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [isDragging]);

  /* ================================================================ */
  /*  API Handlers                                                     */
  /* ================================================================ */
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
          designJson: null,
          category: template.category,
          editorType: "html",
          isActive: template.isActive,
          variablesSchema,
          description: template.description,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Save failed");
      toast.success("Template saved successfully.");
      setDirty(false);
      setLastSaved(new Date());
      setAutoSaveStatus("idle");
      try {
        localStorage.removeItem(`email-draft-${template.id}`);
      } catch {
        /* ignore */
      }
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error saving template.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicate() {
    try {
      const res = await fetch(
        `/api/admin/email-templates/${template.id}/duplicate`,
        { method: "POST" }
      );
      const data = await res.json();
      if (data.ok) {
        toast.success(`Duplicated as "${data.name}"`);
        router.push(`/${adminSlug}/email-templates/${data.id}`);
      } else {
        toast.error(data.error || "Duplication failed.");
      }
    } catch {
      toast.error("Duplication failed.");
    }
  }

  async function handleTest() {
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setTestLoading(true);
    try {
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
      const res = await fetch(
        `/api/admin/email-templates/${template.id}/send-test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: testEmail }),
        }
      );
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message ?? "Test email sent!");
        setTestDialog(false);
        setTestEmail("");
      } else {
        toast.error(data.error ?? "Failed to send test email.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setTestLoading(false);
    }
  }

  /* ================================================================ */
  /*  Derived UI                                                       */
  /* ================================================================ */
  const previewFrameClass = useMemo(() => {
    switch (previewMode) {
      case "mobile":
        return "preview-frame mx-auto w-full max-w-[390px]";
      case "tablet":
        return "preview-frame mx-auto w-full max-w-[768px]";
      default:
        return "preview-frame w-full";
    }
  }, [previewMode]);

  const isValidEmail = useMemo(
    () =>
      testEmail.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail),
    [testEmail]
  );

  /* Status badge — HYDRATION SAFE: only show time after mount */
  const statusBadge = useMemo(() => {
    if (saving)
      return (
        <span className="status-badge inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary sm:text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving…
        </span>
      );
    if (dirty)
      return (
        <span className="status-badge inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 sm:text-xs">
          <AlertCircle className="h-3 w-3" />
          Unsaved
        </span>
      );
    if (mounted && lastSaved)
      return (
        <span className="status-badge inline-flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[11px] font-medium text-green-600 sm:text-xs">
          <CheckCircle2 className="h-3 w-3" />
          Saved{" "}
          {lastSaved.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      );
    return (
      <span className="status-badge inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:text-xs">
        Saved
      </span>
    );
  }, [saving, dirty, lastSaved, mounted]);

  /* Auto-save indicator — HYDRATION SAFE */
  const autoSaveIndicator = useMemo(() => {
    if (!mounted) return null;
    if (autoSaveStatus === "saving") {
      return (
        <span className="hidden text-[10px] text-muted-foreground animate-pulse sm:inline">
          Auto-saving…
        </span>
      );
    }
    if (autoSaveStatus === "saved") {
      return (
        <span className="hidden text-[10px] text-green-600 sm:inline">
          Draft saved
        </span>
      );
    }
    return null;
  }, [autoSaveStatus, mounted]);

  const defaultIframeHtml = useMemo(
    () =>
      `<html><body style="margin:0;font-family:system-ui,sans-serif;color:#666;padding:24px;text-align:center;display:flex;align-items:center;justify-content:center;min-height:100%;">Generating preview…</body></html>`,
    []
  );

  /* Responsive panel heights — mobile uses dvh for address bar compensation */
  const panelHeight = useMemo(() => {
    if (!mounted) return "calc(100vh - 185px)"; /* Default desktop until mounted */
    if (isSmallScreen) return "calc(100dvh - 270px)";
    return "calc(100vh - 185px)";
  }, [mounted, isSmallScreen]);

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  return (
    <div className="w-full min-w-0">
      {/* ==================== HEADER ==================== */}
      <div className="sticky-header sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="px-3 pb-3 pt-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left */}
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href={`/${adminSlug}/email-templates`}
                prefetch
                className="shrink-0"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  aria-label="Back to templates"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted sm:h-10 sm:w-10 sm:rounded-xl">
                  <LayoutTemplate className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
                    {template.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground sm:px-2.5 sm:text-xs">
                      {template.category}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium sm:px-2.5 sm:text-xs",
                        template.isActive
                          ? "border-green-500/20 bg-green-500/10 text-green-600"
                          : "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {template.isActive ? "Active" : "Inactive"}
                    </span>
                    {statusBadge}
                  </div>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTestDialog(true)}
                className="h-9 gap-2 px-3"
              >
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Test</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicate}
                className="h-9 gap-2 px-3"
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Duplicate</span>
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !dirty}
                className="h-9 gap-2 px-4"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">
                  {saving ? "Saving…" : "Save"}
                </span>
                <span className="sm:hidden">Save</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== MAIN ==================== */}
      <main className="px-3 pb-8 pt-4 sm:px-4 md:px-6 lg:px-8">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          {/* Scrollable tabs */}
          <div className="-mx-1 overflow-x-auto px-1 pb-3 scrollbar-hide">
            <TabsList className="inline-flex h-auto min-w-max gap-1 rounded-2xl border border-border bg-muted/60 p-1">
              <TabsTrigger
                value="design"
                className="flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm sm:min-h-10 sm:gap-2 sm:text-sm"
              >
                <Code2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">HTML Workspace</span>
                <span className="sm:hidden">HTML</span>
              </TabsTrigger>
              <TabsTrigger
                value="meta"
                className="flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm sm:min-h-10 sm:gap-2 sm:text-sm"
              >
                <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Subject Line</span>
                <span className="sm:hidden">Subject</span>
              </TabsTrigger>
              <TabsTrigger
                value="variables"
                className="flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm sm:min-h-10 sm:gap-2 sm:text-sm"
              >
                <Variable className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Variables</span>
                <span className="sm:hidden">Vars</span>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm sm:min-h-10 sm:gap-2 sm:text-sm"
              >
                <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* -------------------- DESIGN TAB -------------------- */}
          <TabsContent value="design" className="tabs-content mt-0 outline-none">
            {/* Mobile toggle — shown only on small screens via CSS */}
            <div className="mb-4 flex rounded-xl border border-border bg-muted p-1 md:hidden">
              <button
                type="button"
                onClick={() => setMobileView("editor")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-medium transition-all",
                  mobileView === "editor"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
                aria-pressed={mobileView === "editor"}
              >
                <PenLine className="h-4 w-4" />
                Editor
              </button>
              <button
                type="button"
                onClick={() => setMobileView("preview")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-medium transition-all",
                  mobileView === "preview"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
                aria-pressed={mobileView === "preview"}
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
            </div>

            {/* DESKTOP (1024px+): Side-by-side resizable split — CSS hidden on smaller screens */}
            <div
              ref={containerRef}
              className="split-container hidden lg:flex w-full"
              style={{ height: panelHeight, minHeight: "500px" }}
            >
              {/* Editor Panel */}
              <div
                className="editor-panel flex min-w-0 flex-col overflow-hidden rounded-l-2xl border border-r-0 border-border bg-background shadow-sm transition-panel"
                style={{ width: `${splitPercent}%` }}
              >
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
                  <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                    HTML Editor
                  </span>
                  <div className="flex items-center gap-2">
                    {autoSaveIndicator}
                    <span className="hidden text-[11px] text-muted-foreground sm:inline sm:text-xs">
                      Ctrl+S to save
                    </span>
                    {monacoFailed && (
                      <button
                        onClick={() => setMonacoFailed(false)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        Retry Monaco
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative flex-1 overflow-hidden">
                  {useSimpleEditor ? (
                    <SimpleEditor
                      value={htmlContent}
                      onChange={(v) => {
                        setHtmlContent(v);
                        markDirty();
                      }}
                      language="html"
                    />
                  ) : (
                    <MonacoEditor
                      height="100%"
                      defaultLanguage="html"
                      value={htmlContent}
                      onChange={(v) => {
                        if (v !== undefined) {
                          setHtmlContent(v);
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
                        padding: { top: 16, bottom: 16 },
                        glyphMargin: false,
                        folding: true,
                        lineDecorationsWidth: 12,
                        lineNumbersMinChars: 3,
                        renderWhitespace: "selection",
                        scrollbar: {
                          useShadows: false,
                          verticalHasArrows: false,
                          horizontalHasArrows: false,
                          verticalScrollbarSize: 8,
                          horizontalScrollbarSize: 8,
                        },
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Drag Handle — Mouse + Touch */}
              <div
                className="drag-handle relative z-10 flex w-4 items-center justify-center bg-border hover:bg-primary/20 transition-colors touch-none select-none"
                onMouseDown={() => setIsDragging(true)}
                onTouchStart={() => setIsDragging(true)}
                role="separator"
                aria-label="Resize panels"
                title="Drag to resize"
              >
                <div className="flex h-8 w-1 flex-col items-center justify-center gap-1 rounded-full bg-muted-foreground/30">
                  <div className="h-3 w-0.5 rounded-full bg-muted-foreground/50" />
                  <div className="h-3 w-0.5 rounded-full bg-muted-foreground/50" />
                </div>
              </div>

              {/* Preview Panel */}
              <div
                className="flex min-w-0 flex-col overflow-hidden rounded-r-2xl border border-l-0 border-border bg-background shadow-sm transition-panel"
                style={{ width: `${100 - splitPercent}%` }}
              >
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
                  <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                    Live Preview
                  </span>
                  <div className="flex items-center gap-1">
                    {(["desktop", "tablet", "mobile"] as const).map(
                      (mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPreviewMode(mode)}
                          className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-md transition-all",
                            previewMode === mode
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          title={mode}
                          aria-label={`${mode} preview`}
                          aria-pressed={previewMode === mode}
                        >
                          {mode === "desktop" && (
                            <Monitor className="h-3.5 w-3.5" />
                          )}
                          {mode === "tablet" && (
                            <Tablet className="h-3.5 w-3.5" />
                          )}
                          {mode === "mobile" && (
                            <Smartphone className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-auto bg-muted/20 p-2 sm:p-3">
                  <div className={previewFrameClass}>
                    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
                      <iframe
                        srcDoc={previewHtml || defaultIframeHtml}
                        className="h-full w-full"
                        style={{ minHeight: "400px" }}
                        title="Live Email Preview"
                        sandbox="allow-same-origin allow-scripts"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TABLET (768px-1023px): Stacked vertical split — CSS hidden on other screens */}
            <div
              className="split-container hidden md:flex lg:hidden w-full flex-col"
              style={{ height: panelHeight, minHeight: "400px" }}
            >
              {/* Editor — Top half */}
              <div className="editor-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-t-2xl border border-b-0 border-border bg-background shadow-sm">
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
                  <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                    HTML Editor
                  </span>
                  <div className="flex items-center gap-2">
                    {autoSaveIndicator}
                    {monacoFailed && (
                      <button
                        onClick={() => setMonacoFailed(false)}
                        className="text-[11px] text-primary hover:underline"
                      >
                        Retry Monaco
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative flex-1 overflow-hidden">
                  {useSimpleEditor ? (
                    <SimpleEditor
                      value={htmlContent}
                      onChange={(v) => {
                        if (v !== undefined) {
                          setHtmlContent(v);
                          markDirty();
                        }
                      }}
                      language="html"
                    />
                  ) : (
                    <MonacoEditor
                      height="100%"
                      defaultLanguage="html"
                      value={htmlContent}
                      onChange={(v) => {
                        if (v !== undefined) {
                          setHtmlContent(v);
                          markDirty();
                        }
                      }}
                      theme="light"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: "on",
                        wordWrap: "on",
                        automaticLayout: true,
                        tabSize: 2,
                        scrollBeyondLastLine: false,
                        padding: { top: 12, bottom: 12 },
                        glyphMargin: false,
                        folding: true,
                        lineDecorationsWidth: 10,
                        lineNumbersMinChars: 3,
                        scrollbar: {
                          useShadows: false,
                          verticalScrollbarSize: 8,
                          horizontalScrollbarSize: 8,
                        },
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Preview — Bottom half */}
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-b-2xl border border-t-0 border-border bg-background shadow-sm">
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
                  <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                    Live Preview
                  </span>
                  <div className="flex items-center gap-1">
                    {(["desktop", "tablet", "mobile"] as const).map(
                      (mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPreviewMode(mode)}
                          className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-md transition-all",
                            previewMode === mode
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          aria-label={`${mode} preview`}
                          aria-pressed={previewMode === mode}
                        >
                          {mode === "desktop" && (
                            <Monitor className="h-3.5 w-3.5" />
                          )}
                          {mode === "tablet" && (
                            <Tablet className="h-3.5 w-3.5" />
                          )}
                          {mode === "mobile" && (
                            <Smartphone className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-auto bg-muted/20 p-2 sm:p-3">
                  <div className={previewFrameClass}>
                    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
                      <iframe
                        srcDoc={previewHtml || defaultIframeHtml}
                        className="h-full w-full"
                        style={{ minHeight: "300px" }}
                        title="Live Email Preview"
                        sandbox="allow-same-origin allow-scripts"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MOBILE (<768px): Single panel with toggle — CSS hidden on larger screens */}
            <div className="flex flex-col md:hidden space-y-4">
              {mobileView === "editor" ? (
                <div
                  className="editor-panel flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm"
                  style={{ height: panelHeight, minHeight: "350px" }}
                >
                  <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      HTML Editor
                    </span>
                    <div className="flex items-center gap-2">
                      {mounted && autoSaveStatus === "saving" && (
                        <span className="text-[10px] text-muted-foreground animate-pulse">
                          Saving…
                        </span>
                      )}
                      {mounted && autoSaveStatus === "saved" && (
                        <span className="text-[10px] text-green-600">
                          Draft saved
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <SimpleEditor
                      value={htmlContent}
                      onChange={(v) => {
                        setHtmlContent(v);
                        markDirty();
                      }}
                      language="html"
                    />
                  </div>
                </div>
              ) : (
                <div
                  className="flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm"
                  style={{ height: panelHeight, minHeight: "350px" }}
                >
                  <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Live Preview
                    </span>
                    <div className="flex items-center gap-1">
                      {(["desktop", "tablet", "mobile"] as const).map(
                        (mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setPreviewMode(mode)}
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-md transition-all",
                              previewMode === mode
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground"
                            )}
                            aria-label={`${mode} preview`}
                            aria-pressed={previewMode === mode}
                          >
                            {mode === "desktop" && (
                              <Monitor className="h-3.5 w-3.5" />
                            )}
                            {mode === "tablet" && (
                              <Tablet className="h-3.5 w-3.5" />
                            )}
                            {mode === "mobile" && (
                              <Smartphone className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto bg-muted/20 p-2">
                    <div className={previewFrameClass}>
                      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
                        <iframe
                          srcDoc={previewHtml || defaultIframeHtml}
                          className="h-full w-full"
                          style={{ minHeight: "300px" }}
                          title="Live Email Preview"
                          sandbox="allow-same-origin allow-scripts"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* -------------------- META TAB -------------------- */}
          <TabsContent value="meta" className="tabs-content mt-0 outline-none">
            <Card className="card-responsive mx-auto max-w-2xl space-y-4 p-4 sm:space-y-5 sm:p-6 lg:p-8">
              <div className="space-y-2">
                <Label className="text-sm">Subject line</Label>
                <Input
                  value={template.subject}
                  onChange={(e) => setField("subject", e.target.value)}
                  placeholder="Welcome to {{siteName}}"
                  className="h-10 sm:h-11"
                />
                <p className="text-[11px] text-muted-foreground sm:text-xs">
                  Shown in the inbox subject. Supports {"{{variable}}"}{" "}
                  placeholders.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Preview text</Label>
                <Input
                  value={template.previewText ?? ""}
                  onChange={(e) =>
                    setField("previewText", e.target.value || null)
                  }
                  placeholder="Short inbox summary"
                  className="h-10 sm:h-11"
                />
                <p className="text-[11px] text-muted-foreground sm:text-xs">
                  Appears below the subject in many email clients.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Description</Label>
                <Input
                  value={template.description ?? ""}
                  onChange={(e) =>
                    setField("description", e.target.value || null)
                  }
                  placeholder="Internal description for reference"
                  className="h-10 sm:h-11"
                />
              </div>
            </Card>
          </TabsContent>

          {/* -------------------- VARIABLES TAB -------------------- */}
          <TabsContent value="variables" className="tabs-content mt-0 outline-none">
            <Card className="card-responsive mx-auto max-w-3xl space-y-4 p-4 sm:space-y-5 sm:p-6 lg:p-8">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Variables schema
                </p>
                <p className="text-[11px] leading-5 text-muted-foreground sm:text-xs">
                  JSON array defining variables used in this template.
                </p>
                <code className="block overflow-x-auto rounded-lg bg-muted p-2.5 text-[11px] text-foreground sm:text-xs">
                  [
                  {
                    '{"key":"user_name","description":"User display name","sample":"John"}'
                  }
                  ]
                </code>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
                <div className="border-b border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground sm:text-xs">
                  {useSimpleEditor ? "Simple editor" : "JSON editor"}
                </div>
                <div className="editor-panel relative" style={{ height: "320px" }}>
                  {useSimpleEditor ? (
                    <SimpleEditor
                      value={variablesSchema}
                      onChange={(v) => {
                        setVariablesSchema(v);
                        markDirty();
                      }}
                      language="json"
                    />
                  ) : (
                    <MonacoEditor
                      height="100%"
                      defaultLanguage="json"
                      value={variablesSchema}
                      onChange={(v) => {
                        if (v !== undefined) {
                          setVariablesSchema(v);
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
                        padding: { top: 16, bottom: 16 },
                        glyphMargin: false,
                        folding: true,
                        lineDecorationsWidth: 12,
                        lineNumbersMinChars: 3,
                        renderWhitespace: "selection",
                        scrollbar: {
                          useShadows: false,
                          verticalHasArrows: false,
                          horizontalHasArrows: false,
                          verticalScrollbarSize: 8,
                          horizontalScrollbarSize: 8,
                        },
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 shadow-sm">
                <div className="space-y-2 p-3.5 text-[11px] text-muted-foreground sm:space-y-3 sm:p-4 sm:text-xs">
                  <p className="font-medium text-foreground">
                    Fields per variable
                  </p>
                  <ul className="list-disc space-y-1.5 pl-4">
                    <li>
                      <code className="rounded bg-muted px-1 py-0.5">key</code>{" "}
                      — used as {"{{key}}"} in template
                    </li>
                    <li>
                      <code className="rounded bg-muted px-1 py-0.5">
                        description
                      </code>{" "}
                      — internal description
                    </li>
                    <li>
                      <code className="rounded bg-muted px-1 py-0.5">
                        sample
                      </code>{" "}
                      — preview/test sample value
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* -------------------- SETTINGS TAB -------------------- */}
          <TabsContent value="settings" className="tabs-content mt-0 outline-none">
            <Card className="card-responsive mx-auto max-w-2xl space-y-4 p-4 sm:space-y-5 sm:p-6 lg:p-8">
              <div className="space-y-2">
                <Label className="text-sm">Category</Label>
                <Select
                  value={template.category}
                  onValueChange={(v) => setField("category", v)}
                >
                  <SelectTrigger className="h-10 sm:h-11">
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
              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Active</p>
                  <p className="text-[11px] text-muted-foreground sm:text-xs">
                    Inactive templates are skipped during sending.
                  </p>
                </div>
                <div className="self-start sm:self-auto">
                  <Switch
                    checked={template.isActive}
                    onCheckedChange={(v) => setField("isActive", v)}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 px-4 py-4">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                  Info
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground sm:text-xs">
                      Template ID
                    </p>
                    <code className="block break-all text-[11px] font-mono text-foreground sm:text-xs">
                      {template.id}
                    </code>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground sm:text-xs">
                      Name
                    </p>
                    <code className="block break-all text-[11px] font-mono text-foreground sm:text-xs">
                      {template.name}
                    </code>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground sm:text-xs">
                      Last Updated
                    </p>
                    <code className="block break-all text-[11px] font-mono text-foreground sm:text-xs">
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </code>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ==================== TEST DIALOG ==================== */}
      <Dialog open={testDialog} onOpenChange={setTestDialog}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md rounded-2xl p-0 sm:w-full">
          <DialogHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
            <DialogTitle className="text-base sm:text-lg">
              Send test email
            </DialogTitle>
            <p className="pt-1.5 text-[11px] text-muted-foreground sm:text-xs">
              This saves current edits and sends a test using sample values.
            </p>
          </DialogHeader>

          <div className="space-y-4 p-4 sm:p-6">
            <div className="space-y-2">
              <Label className="text-sm">Recipient email</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="h-10 sm:h-11"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isValidEmail) handleTest();
                }}
              />
              {testEmail && !isValidEmail && (
                <p className="flex items-center gap-1 text-[11px] text-destructive sm:text-xs">
                  <AlertCircle className="h-3 w-3" />
                  Please enter a valid email address
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 p-4 pt-0 sm:flex-row sm:p-6 sm:pt-0">
            <Button
              variant="outline"
              onClick={() => {
                setTestDialog(false);
                setTestEmail("");
              }}
              className="h-10 w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTest}
              disabled={testLoading || !isValidEmail}
              className="h-10 w-full sm:w-auto"
            >
              {testLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {testLoading ? "Sending…" : "Send Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}