"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, HelpCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

interface FAQ {
  id: string;
  question: string;
  answer: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export default function FaqListClient({ initialData }: { initialData: FAQ[] }) {
  const router = useRouter();
  const params = useParams();
  const panelSlug = params.dynamicSlug as string;
  
  const [faqs, setFaqs] = useState<FAQ[]>(initialData || []);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  
  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFaq, setSelectedFaq] = useState<FAQ | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [order, setOrder] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  // Delete Alert States
  const [deleteTarget, setDeleteTarget] = useState<FAQ | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetch("/api/admin/faqs").then(r => r.json());
      setFaqs(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load FAQs");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenAdd() {
    setSelectedFaq(null);
    setQuestion("");
    setAnswer("");
    // Autofill next order weight
    const nextOrder = faqs.length > 0 ? Math.max(...faqs.map(f => f.order)) + 1 : 1;
    setOrder(nextOrder);
    setIsDialogOpen(true);
  }

  function handleOpenEdit(faqItem: FAQ) {
    setSelectedFaq(faqItem);
    setQuestion(faqItem.question);
    setAnswer(faqItem.answer);
    setOrder(faqItem.order);
    setIsDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      toast.error("Question and answer are required.");
      return;
    }

    setSubmitting(true);
    try {
      const url = selectedFaq ? `/api/admin/faqs/${selectedFaq.id}` : "/api/admin/faqs";
      const method = selectedFaq ? "PUT" : "POST";
      const body = { question, answer, order: Number(order) };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(selectedFaq ? "FAQ updated." : "FAQ created.");
        setIsDialogOpen(false);
        load();
        router.refresh();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Something went wrong.");
      }
    } catch {
      toast.error("Operation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/faqs/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("FAQ deleted.");
        load();
        router.refresh();
      } else {
        toast.error("Failed to delete FAQ.");
      }
    } catch {
      toast.error("Delete operation failed.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const filteredFaqs = faqs.filter(faqItem =>
    faqItem.question.toLowerCase().includes(search.toLowerCase()) ||
    faqItem.answer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="header-admin">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <HelpCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">FAQ Manager</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage help questions listed on the public <code className="bg-muted px-1 rounded text-xs">/faq</code> page
            </p>
          </div>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="h-4 w-4 mr-2" />New FAQ
        </Button>
      </div>

      {/* Search Filter bar */}
      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search FAQs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredFaqs.length === 0 ? (
        <Card className="border border-dashed border-border py-12 flex flex-col items-center justify-center text-center">
          <HelpCircle className="h-10 w-10 text-muted-foreground/60 mb-3" />
          <h3 className="font-semibold text-lg">No FAQs found</h3>
          <p className="text-sm text-muted-foreground max-w-xs mt-1">
            {search ? "No matching results for your query." : "Click 'New FAQ' to populate database-driven help articles."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFaqs.map((faqItem) => (
            <Card key={faqItem.id} className="card-widget overflow-hidden border border-border">
              <CardContent className="p-5 flex items-start justify-between gap-6">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                      Order: {faqItem.order}
                    </span>
                  </div>
                  <h3 className="font-semibold text-[15px] text-foreground leading-6">
                    {faqItem.question}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 whitespace-pre-wrap">
                    {faqItem.answer}
                  </p>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(faqItem)} title="Edit FAQ">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(faqItem)} title="Delete FAQ">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedFaq ? "Edit FAQ" : "Create FAQ"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                placeholder="Enter FAQ Question (e.g. How do I join a custom room?)"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="answer">Answer</Label>
              <Textarea
                id="answer"
                placeholder="Enter FAQ Answer description..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={6}
                required
                className="resize-y"
              />
            </div>

            <div className="space-y-1.5 max-w-[150px]">
              <Label htmlFor="order">Order Weight</Label>
              <Input
                id="order"
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                min={0}
                required
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                Lower weight loads first.
              </span>
            </div>

            <DialogFooter className="pt-4 border-t border-border mt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedFaq ? "Save Changes" : "Create FAQ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this FAQ entry from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/95"
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
