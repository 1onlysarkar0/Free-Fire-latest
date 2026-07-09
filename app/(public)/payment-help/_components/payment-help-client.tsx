"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BadgeDollarSign,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Hash,
  IndianRupee,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  userId: string | null;
  userName: string;
  userEmail: string;
}

export default function PaymentHelpClient({ userId, userName, userEmail }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [requestId, setRequestId] = useState<string>("");
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  const [amount, setAmount] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    setErrors((prev) => {
      const n = { ...prev };
      delete n[field];
      return n;
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const amtNum = parseFloat(amount);
    if (!amount.trim()) {
      newErrors.amount = "Please enter the amount";
    } else if (isNaN(amtNum) || amtNum <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    } else if (!Number.isInteger(amtNum)) {
      newErrors.amount = "Amount must be a whole number (no decimals)";
    } else if (amtNum > 100000) {
      newErrors.amount = "Amount seems too large";
    }

    if (!utrNumber.trim()) {
      newErrors.utrNumber = "Please enter the UTR / Transaction ID";
    } else if (utrNumber.trim().length < 6) {
      newErrors.utrNumber = "UTR / Transaction ID must be at least 6 characters";
    } else if (utrNumber.trim().length > 50) {
      newErrors.utrNumber = "UTR / Transaction ID is too long";
    } else if (!/^[A-Za-z0-9_\-]+$/.test(utrNumber.trim())) {
      newErrors.utrNumber = "Only letters, numbers, hyphens, and underscores allowed";
    }

    if (!description.trim()) {
      newErrors.description = "Please provide a description";
    } else if (description.trim().length < 20) {
      newErrors.description = "Description must be at least 20 characters";
    } else if (description.trim().length > 2000) {
      newErrors.description = "Description must be at most 2000 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (!userId) {
      setShowLoginDialog(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/payment-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseInt(amount, 10),
          utrNumber: utrNumber.trim(),
          description: description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to submit request");
        return;
      }
      setRequestId(data.requestId ?? "");
      setIsSuccess(true);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setAmount("");
    setUtrNumber("");
    setDescription("");
    setErrors({});
    setRequestId("");
  };

  if (isSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-16 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md mx-auto text-center space-y-6"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mx-auto">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold font-lora text-foreground">Request Submitted!</h1>
            <p className="text-muted-foreground font-ibm text-sm leading-relaxed">
              Your payment help request has been submitted. Our team will review it and contact you shortly.
              You will receive a notification with updates.
            </p>
            {requestId && (
              <p className="text-xs text-muted-foreground/70 font-mono mt-2">Request ID: {requestId}</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" className="font-ibm" onClick={handleReset}>
              Submit Another Request
            </Button>
            <Button asChild className="font-ibm">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-background via-background to-primary/5 flex flex-col pt-20 pb-12 md:pt-28 md:pb-20">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 flex-1 flex flex-col">
        {/* Page Header */}
        <div className="max-w-2xl mb-10 mx-auto text-center flex flex-col items-center justify-center">
          <h1 className="text-3xl md:text-5xl font-bold font-lora text-foreground leading-tight tracking-tight">
            Payment Issue? We Can Help
          </h1>
          <p className="mt-4 text-muted-foreground font-ibm text-sm md:text-base leading-relaxed max-w-lg mx-auto">
            If your payment wasn&apos;t credited, you have a dispute, or need help with a transaction, submit your details below.
            {userName && (
              <span className="block mt-2 text-foreground/80 font-medium">
                Submitting as <strong className="text-foreground font-bold">{userName}</strong> ({userEmail}).
              </span>
            )}
          </p>
        </div>

        {/* Form */}
        <div className="w-full max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <FieldGroup className="gap-6">

              {/* Amount */}
              <Field invalid={!!errors.amount}>
                <FieldLabel htmlFor="amount" className="flex items-center gap-2 font-bold text-sm text-foreground mb-1">
                  <IndianRupee className="w-4 h-4 text-primary shrink-0" />
                  Amount (₹) <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="amount"
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 500"
                  value={amount}
                  min="1"
                  max="100000"
                  step="1"
                  onChange={(e) => { setAmount(e.target.value); clearError("amount"); }}
                  className={cn(
                    "h-12 rounded-xl font-ibm text-base font-semibold",
                    errors.amount && "border-destructive/60 focus-visible:ring-destructive/30"
                  )}
                  aria-describedby="amount-error"
                />
                {errors.amount && (
                  <FieldError id="amount-error" className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{errors.amount}
                  </FieldError>
                )}
              </Field>

              {/* UTR Number */}
              <Field invalid={!!errors.utrNumber}>
                <FieldLabel htmlFor="utr-number" className="flex items-center gap-2 font-bold text-sm text-foreground mb-1">
                  <Hash className="w-4 h-4 text-primary shrink-0" />
                  UTR / Transaction ID <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="utr-number"
                  type="text"
                  placeholder="e.g. UTR1234567890 or TXN-ABC-123"
                  value={utrNumber}
                  onChange={(e) => { setUtrNumber(e.target.value); clearError("utrNumber"); }}
                  className={cn(
                    "h-12 rounded-xl font-mono text-base font-semibold",
                    errors.utrNumber && "border-destructive/60 focus-visible:ring-destructive/30"
                  )}
                  aria-describedby="utr-error utr-help"
                  maxLength={50}
                />
                {errors.utrNumber ? (
                  <FieldError id="utr-error" className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{errors.utrNumber}
                  </FieldError>
                ) : (
                  <p id="utr-help" className="text-xs text-muted-foreground font-ibm mt-1.5 leading-relaxed">
                    Find this in your UPI app under transaction history or in your SMS confirmation.
                  </p>
                )}
              </Field>

              {/* Description */}
              <Field invalid={!!errors.description}>
                <FieldLabel htmlFor="pay-description" className="flex items-center gap-2 font-bold text-sm text-foreground mb-1">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  Description <span className="text-destructive">*</span>
                </FieldLabel>
                <Textarea
                  id="pay-description"
                  placeholder="Describe the issue clearly — e.g. 'I paid ₹500 for tournament XYZ on 5th July at 2PM. UTR is UTR1234567890. The amount was deducted but my wallet was not credited...'"
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); clearError("description"); }}
                  rows={5}
                  maxLength={2000}
                  className={cn(
                    "rounded-xl font-ibm text-sm resize-none",
                    errors.description && "border-destructive/60 focus-visible:ring-destructive/30"
                  )}
                  aria-describedby="pay-desc-error pay-desc-count"
                />
                <div className="flex items-center justify-between mt-1.5">
                  {errors.description ? (
                    <FieldError id="pay-desc-error" className="flex items-center gap-1.5 text-xs text-destructive font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />{errors.description}
                    </FieldError>
                  ) : (
                    <p className="text-xs text-muted-foreground font-ibm leading-relaxed">
                      Minimum 20 characters. Include all relevant details.
                    </p>
                  )}
                  <span
                    id="pay-desc-count"
                    className={cn("text-xs font-ibm font-medium shrink-0 ml-2", description.length > 1800 ? "text-warning" : "text-muted-foreground")}
                  >
                    {description.length}/2000
                  </span>
                </div>
              </Field>
            </FieldGroup>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full font-ibm h-12 text-base font-bold rounded-xl mt-4 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.99] transition-all duration-200 cursor-pointer"
              id="submit-payment-help"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />Submitting…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <BadgeDollarSign className="w-4 h-4" />Submit Payment Help Request
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Guest Login Required Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="font-lora flex items-center gap-2 text-destructive">
              <BadgeDollarSign className="h-5 w-5" />Login Required
            </DialogTitle>
            <DialogDescription className="font-ibm">
              You must be logged in to submit a payment help request. Please sign in or create an account to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowLoginDialog(false)} className="font-ibm">Cancel</Button>
            <Button asChild className="font-ibm"><Link href="/sign-in?returnTo=/payment-help">Sign In</Link></Button>
            <Button asChild variant="outline" className="font-ibm"><Link href="/sign-up">Create Account</Link></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
