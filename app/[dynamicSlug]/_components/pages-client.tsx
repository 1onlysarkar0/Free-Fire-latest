"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, Loader2, Globe, EyeOff, Eye, ExternalLink, FileCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Muted } from "@/components/ui/typography";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useParams } from "next/navigation";

interface CustomPage {
  id: string; title: string; slug: string; content: string;
  status: string; createdAt: string; updatedAt: string;
}

export default function PagesListClient({ initialData }: { initialData: CustomPage[] }) {
  const router = useRouter();
  const params = useParams();
  const panelSlug = params.dynamicSlug as string;
  const [pages, setPages] = useState<CustomPage[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);
  const [deleteTarget, setDeleteTarget] = useState<CustomPage | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const data = await fetch("/api/admin/pages").then(r => r.json()).catch(() => []);
    setPages(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function toggleStatus(page: CustomPage) {
    const newStatus = page.status === "published" ? "draft" : "published";
    await fetch(`/api/admin/pages/${page.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    toast.success(newStatus === "published" ? "Page published." : "Page moved to draft.");
    load();
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/pages/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) { 
        toast.success("Page deleted."); 
        load(); 
        router.refresh();
      }
      else toast.error("Failed to delete.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="header-admin">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <FileCode className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Custom Pages</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create rich-text pages accessible at <code className="bg-muted px-1 rounded text-xs">/{"{slug}"}</code>
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/${panelSlug}/pages/new`} prefetch={true}><Plus className="h-4 w-4" />New Page</Link>
        </Button>
      </div>

      {loading ? (
        <div className="card-list">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Page Title","URL Slug","Status","Last Updated","Actions"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {[1,2,3].map(i => (
                  <tr key={i} className="animate-pulse">
                    {[1,2,3,4,5].map(j => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-20 rounded bg-accent/60" /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : pages.length === 0 ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center bg-background px-6 py-10 text-center rounded-2xl border">
          <FileCode className="mb-4 h-6 w-6 text-foreground" />
          <h4 className="text-sm font-semibold text-foreground">No custom pages yet</h4>
          <Muted className="mt-1 text-sm mb-4">Create your first page to publish content at a custom URL.</Muted>
          <Button asChild size="sm">
            <Link href={`/${panelSlug}/pages/new`} prefetch={true}><Plus className="h-3.5 w-3.5" />Create First Page</Link>
          </Button>
        </div>
      ) : (
        <Card className="card-list">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr>
                  <th>Page Title</th>
                  <th>URL Slug</th>
                  <th className="w-28">Status</th>
                  <th className="hidden md:table-cell">Last Updated</th>
                  <th className="w-36 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {pages.map(page => (
                  <tr key={page.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm text-foreground truncate max-w-[200px]">{page.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 pl-6">
                        <Link href={`/${panelSlug}/seo/page-${page.slug}`} className="hover:text-primary underline underline-offset-2">SEO Config →</Link>
                      </div>
                    </td>
                    <td>
                      <code className="text-xs bg-background/80 rounded px-1.5 py-0.5 text-muted-foreground">/{page.slug}</code>
                    </td>
                    <td>
                      {page.status === "published"
                        ? <Badge className="bg-success/20 text-success border-0 gap-1"><Eye className="h-3 w-3" />Published</Badge>
                        : <Badge variant="secondary" className="gap-1"><EyeOff className="h-3 w-3" />Draft</Badge>
                      }
                    </td>
                    <td className="text-xs text-muted-foreground hidden md:table-cell">
                      {new Date(page.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" asChild className="h-7 px-2.5 text-xs gap-1">
                          <Link href={`/${panelSlug}/pages/${page.id}`} prefetch={true}><Pencil className="h-3 w-3" />Edit</Link>
                        </Button>
                        <button
                          onClick={() => toggleStatus(page)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            page.status === "published"
                              ? "hover:bg-amber-50 dark:hover:bg-amber-900/20 text-muted-foreground hover:text-amber-600"
                              : "hover:bg-success/10 text-muted-foreground hover:text-success"
                          }`}
                          title={page.status === "published" ? "Move to Draft" : "Publish"}
                        >
                          {page.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        {page.status === "published" && (
                          <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-600 transition-colors"
                            title="Preview page"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button onClick={() => setDeleteTarget(page)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
                          title="Delete page"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently deleted and its URL will stop working. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
