"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import {
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Trophy,
  Ticket,
  Plus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  History,
  CreditCard,
  ArrowUpFromLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UPIQR } from "@/components/payment/upi-qr";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const TYPE_LABELS: Record<string, string> = {
  JOIN_FEE: "Tournament Entry",
  REFUND: "Refund",
  PRIZE_CREDIT: "Prize Won",
  ADMIN_CREDIT: "Admin Credit",
  ADMIN_DEBIT: "Admin Debit",
  WITHDRAWAL_REQUEST: "Withdrawal",
  UPI_DEPOSIT: "UPI Deposit",
};

const TYPE_CREDIT: Record<string, boolean> = {
  REFUND: true,
  PRIZE_CREDIT: true,
  ADMIN_CREDIT: true,
  UPI_DEPOSIT: true,
  JOIN_FEE: false,
  ADMIN_DEBIT: false,
  WITHDRAWAL_REQUEST: false,
};

const EARNED_CREDIT_TYPES = new Set(["PRIZE_CREDIT", "ADMIN_CREDIT", "UPI_DEPOSIT"]);

function TxIcon({ type }: { type: string }) {
  const isCredit = TYPE_CREDIT[type] ?? false;

  if (type === "PRIZE_CREDIT") {
    return <Trophy className="h-5 w-5 shrink-0 text-foreground" />;
  }

  if (type === "JOIN_FEE") {
    return <Ticket className="h-5 w-5 shrink-0 text-foreground" />;
  }

  if (type === "UPI_DEPOSIT") {
    return <Plus className="h-5 w-5 shrink-0 text-foreground" />;
  }

  return isCredit ? (
    <ArrowDownLeft className="h-5 w-5 shrink-0 text-foreground" />
  ) : (
    <ArrowUpRight className="h-5 w-5 shrink-0 text-foreground" />
  );
}

function getStatusBadgeClass(status?: string | null) {
  if (!status) return "badge badge-muted";

  const normalized = status.toLowerCase();

  if (normalized === "completed" || normalized === "verified") {
    return "badge badge-success";
  }

  if (normalized === "pending") {
    return "badge badge-warning";
  }

  if (normalized === "failed") {
    return "badge badge-error";
  }

  return "badge badge-muted";
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string | null;
  referenceId?: string | null;
  status?: string | null;
  createdAt: string;
}

export interface PaymentInfo {
  upiId: string;
  upiName: string;
  pageContent: string;
  enabled: boolean;
}

interface WalletClientProps {
  initialBalance: number;
  initialTransactions: Transaction[];
  paymentInfo: PaymentInfo | null;
  withdrawDescription: string;
}

export default function WalletClient({
  initialBalance,
  initialTransactions,
  paymentInfo,
  withdrawDescription,
}: WalletClientProps) {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(initialBalance);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [loadingTx, setLoadingTx] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [utrAmount, setUtrAmount] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawUpiId, setWithdrawUpiId] = useState("");
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawHistory, setWithdrawHistory] = useState<WithdrawRequest[]>([]);
  const [withdrawHistoryLoading, setWithdrawHistoryLoading] = useState(false);
  const [withdrawPage, setWithdrawPage] = useState(1);
  const [withdrawTotalPages, setWithdrawTotalPages] = useState(1);

  interface WithdrawRequest {
    id: string;
    amount: number;
    upiId: string;
    status: string;
    adminNote: string | null;
    createdAt: string;
    processedAt: string | null;
  }

  const totalEarned = transactions
    .filter((t) => EARNED_CREDIT_TYPES.has(t.type))
    .reduce((s, t) => s + t.amount, 0);

  const totalSpent = transactions
    .filter((t) => !TYPE_CREDIT[t.type])
    .reduce((s, t) => s + t.amount, 0);

  async function loadWithdrawHistory(p = 1) {
    setWithdrawHistoryLoading(true);
    try {
      const res = await fetch(`/api/wallet/withdraw/requests?page=${p}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setWithdrawHistory(data.data ?? []);
        setWithdrawTotalPages(data.pagination?.totalPages ?? 1);
        setWithdrawPage(p);
      }
    } finally {
      setWithdrawHistoryLoading(false);
    }
  }

  async function handleWithdrawSubmit(e: React.FormEvent) {
    e.preventDefault();
    setWithdrawError(null);

    const amount = parseInt(withdrawAmount, 10);

    if (!withdrawAmount || Number.isNaN(amount) || amount < 1) {
      setWithdrawError("Enter a valid withdrawal amount.");
      return;
    }

    if (!withdrawUpiId || !withdrawUpiId.includes("@")) {
      setWithdrawError("Enter a valid UPI ID (e.g. name@paytm).");
      return;
    }

    setWithdrawSubmitting(true);
    try {
      const res = await fetch("/api/wallet/withdraw/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, upiId: withdrawUpiId }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message || "Withdrawal request submitted!");
        setWithdrawAmount("");
        setWithdrawUpiId("");
        await loadBalance();
        await loadWithdrawHistory(1);
        router.refresh();
      } else {
        setWithdrawError(data.error || "Failed to submit withdrawal.");
      }
    } catch {
      setWithdrawError("Network error. Please try again.");
    } finally {
      setWithdrawSubmitting(false);
    }
  }

  async function loadBalance() {
    const res = await fetch("/api/wallet/me");
    if (res.ok) {
      const data = await res.json();
      setBalance(data.data?.balance ?? 0);
      window.dispatchEvent(new CustomEvent("wallet:balance-updated"));
    }
  }

  async function loadTransactions(p = 1) {
    setLoadingTx(true);
    try {
      const res = await fetch(`/api/wallet/transactions?page=${p}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.data ?? []);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setPage(p);
      }
    } finally {
      setLoadingTx(false);
    }
  }

  async function handleVerifyPayment(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const amount = parseInt(utrAmount, 10);

    if (!utrAmount || Number.isNaN(amount) || amount < 1 || amount > 50000) {
      setFormError("Enter a valid amount between ₹1 and ₹50,000.");
      return;
    }

    if (!utrNumber || utrNumber.length < 10 || utrNumber.length > 22) {
      setFormError("UTR number must be 10–22 alphanumeric characters.");
      return;
    }

    if (!/^[A-Za-z0-9]+$/.test(utrNumber)) {
      setFormError("UTR number must contain only letters and numbers.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/wallet/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, utrNumber: utrNumber.toUpperCase() }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message || "Payment verified! Wallet credited.");
        setUtrAmount("");
        setUtrNumber("");
        await loadBalance();
        await loadTransactions(1);
        router.refresh();
      } else {
        setFormError(data.error || "Verification failed. Please try again.");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const paymentEnabled = Boolean(paymentInfo?.enabled && paymentInfo?.upiId);
  return (
    <div className="w-full min-w-0 space-y-5 pb-6">
      <Tabs defaultValue="add-funds" className="w-full" onValueChange={(v) => { if (v === "withdraw") void loadWithdrawHistory(1); }}>
        <div className="space-y-4">

          {/* Compact Top Navigation & Balance Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card border border-border/60 rounded-xl shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary shrink-0" />
                <h1 className="text-base font-bold text-foreground font-lora">
                  My Wallet
                </h1>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-foreground tabular-nums">₹{balance}</span>
                <span className="text-xs text-muted-foreground">Available Coins</span>
              </div>
            </div>

            {/* Tab Controls Bar */}
            <TabsList className="grid grid-cols-3 h-9 p-0.5 bg-muted/40 border border-border/60 rounded-lg text-xs w-full sm:w-auto">
              <TabsTrigger
                value="add-funds"
                className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span>Add Funds</span>
              </TabsTrigger>
              <TabsTrigger
                value="withdraw"
                className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs flex items-center justify-center gap-1.5"
              >
                <ArrowUpFromLine className="h-3.5 w-3.5 shrink-0" />
                <span>Withdraw</span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs flex items-center justify-center gap-1.5"
              >
                <History className="h-3.5 w-3.5 shrink-0" />
                <span>History</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Micro Overview Stats Row */}
          <div className="grid gap-3 grid-cols-2">
            <Card className="p-3 bg-card border-border/60 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Earned / Credited
                </span>
                <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
              </div>
              <div className="mt-1 text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                +₹{totalEarned}
              </div>
            </Card>

            <Card className="p-3 bg-card border-border/60 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Spent / debited
                </span>
                <TrendingDown className="h-4 w-4 text-rose-500 shrink-0" />
              </div>
              <div className="mt-1 text-xl font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                -₹{totalSpent}
              </div>
            </Card>
          </div>
        </div>

          <TabsContent value="add-funds" className="mt-5 md:mt-6">
            {!paymentEnabled ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center bg-background px-4 py-8 text-center">
                <Wallet className="mb-3 h-6 w-6 text-foreground" />

                <p className="text-base md:text-lg font-semibold text-foreground">
                  Payment gateway unavailable
                </p>

                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Online wallet top-up is currently disabled or not configured. Please contact the
                  admin for manual assistance.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                {/* Left: Scan & Pay QR Card */}
                <div className="lg:col-span-5">
                  <Card className="p-4 bg-card border-border/60 rounded-xl shadow-2xs h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <h3 className="text-xs font-bold text-foreground font-lora">Scan & Pay via UPI</h3>
                          <p className="text-[11px] text-muted-foreground">
                            Scan with GPay, PhonePe, Paytm, or BHIM
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl bg-muted/40 p-3 border border-border/40 flex items-center justify-center">
                        <UPIQR
                          upiId={paymentInfo!.upiId}
                          upiName={paymentInfo!.upiName}
                          size={170}
                        />
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg bg-muted/30 p-2.5 border border-border/40">
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        After transferring, submit the exact amount & UTR reference below.
                      </p>
                    </div>
                  </Card>
                </div>

                {/* Right: Submit UTR Form & Instructions */}
                <div className="space-y-4 lg:col-span-7">
                  <Card className="p-4 bg-card border-border/60 rounded-xl shadow-2xs">
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-bold text-foreground font-lora">
                        Submit Payment Verification
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Enter amount and 12-digit UTR reference number
                      </p>
                    </div>

                    <form onSubmit={handleVerifyPayment} className="mt-3.5 space-y-3.5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="utr-amount"
                            className="text-xs font-semibold text-foreground"
                          >
                            Amount Paid (₹)
                          </Label>

                          <Input
                            id="utr-amount"
                            type="number"
                            min={1}
                            max={50000}
                            step={1}
                            placeholder="e.g. 100"
                            className="h-9 text-xs font-mono font-semibold"
                            value={utrAmount}
                            onChange={(e) => {
                              setUtrAmount(e.target.value);
                              setFormError(null);
                            }}
                            disabled={submitting}
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label
                            htmlFor="utr-number"
                            className="text-xs font-semibold text-foreground"
                          >
                            UTR / Reference Number
                          </Label>

                          <Input
                            id="utr-number"
                            type="text"
                            placeholder="e.g. 412345678901"
                            className="h-9 text-xs font-mono font-semibold uppercase"
                            value={utrNumber}
                            onChange={(e) => {
                              setUtrNumber(
                                e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
                              );
                              setFormError(null);
                            }}
                            maxLength={22}
                            disabled={submitting}
                            required
                          />
                        </div>
                      </div>

                      {formError ? (
                        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span className="font-medium">{formError}</span>
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
                        <p className="text-[10px] text-muted-foreground">
                          Each UTR can only be verified once.
                        </p>

                        <Button
                          type="submit"
                          disabled={submitting}
                          className="h-9 px-4 font-semibold text-xs rounded-lg w-full sm:w-auto"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                              Verify Payment
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Card>

                  {paymentInfo?.pageContent ? (
                    <Card className="p-4 bg-card border-border/60 rounded-xl shadow-2xs">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="text-xs font-bold text-foreground font-lora">
                          How to Add Funds Step-by-Step
                        </h3>
                      </div>

                      <div className="rounded-lg bg-muted/30 p-3.5 border border-border/40">
                        <div className="prose prose-xs max-w-none text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {paymentInfo.pageContent}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </Card>
                  ) : null}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="withdraw" className="mt-4">
            <div className="flex flex-col space-y-4">
              
              {/* Top: Withdrawal Form & History Grid */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-6">
                  <Card className="p-4 bg-card border-border/60 rounded-xl shadow-2xs">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold tracking-tight text-foreground font-lora">
                        Submit Withdrawal Request
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Enter your registered UPI ID and withdrawal amount.
                      </p>
                    </div>

                    <form onSubmit={handleWithdrawSubmit} className="mt-4 space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="withdraw-amount"
                            className="text-xs font-semibold text-foreground"
                          >
                            Amount (₹)
                          </Label>
                          <Input
                            id="withdraw-amount"
                            type="number"
                            min={1}
                            step={1}
                            placeholder="e.g. 100"
                            className="h-9 text-xs font-mono font-semibold"
                            value={withdrawAmount}
                            onChange={(e) => {
                              setWithdrawAmount(e.target.value);
                              setWithdrawError(null);
                            }}
                            disabled={withdrawSubmitting}
                            required
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Min withdrawal limit applies.
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <Label
                            htmlFor="withdraw-upi"
                            className="text-xs font-semibold text-foreground"
                          >
                            UPI ID
                          </Label>
                          <Input
                            id="withdraw-upi"
                            type="text"
                            placeholder="e.g. name@paytm"
                            className="h-9 text-xs font-mono font-semibold"
                            value={withdrawUpiId}
                            onChange={(e) => {
                              setWithdrawUpiId(e.target.value);
                              setWithdrawError(null);
                            }}
                            disabled={withdrawSubmitting}
                            required
                          />
                          <p className="text-[10px] text-muted-foreground">
                            GPay, PhonePe, Paytm, BHIM.
                          </p>
                        </div>
                      </div>

                      {withdrawError ? (
                        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span className="font-medium">{withdrawError}</span>
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
                        <p className="text-[11px] text-muted-foreground">
                          Available: <strong className="text-foreground font-mono">₹{balance}</strong>
                        </p>

                        <Button
                          type="submit"
                          disabled={withdrawSubmitting}
                          className="h-9 px-4 font-semibold text-xs rounded-lg w-full sm:w-auto"
                        >
                          {withdrawSubmitting ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <ArrowUpFromLine className="mr-1.5 h-3.5 w-3.5" />
                              Submit Request
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Card>
                </div>

                {/* Right: Withdrawal History */}
                <div className="lg:col-span-6">
                  <Card className="p-4 bg-card border-border/60 rounded-xl shadow-2xs h-full flex flex-col justify-between">
                    <div>
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-bold tracking-tight text-foreground font-lora">
                          Withdrawal History
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Track your submitted withdrawal requests.
                        </p>
                      </div>

                      <div className="mt-3">
                        {withdrawHistoryLoading ? (
                          <div className="flex h-24 items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        ) : withdrawHistory.length === 0 ? (
                          <div className="flex h-24 items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
                            No withdrawal requests yet.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {withdrawHistory.map((w) => (
                              <div
                                key={w.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded-lg bg-muted/40 p-2.5 border border-border/40 text-xs"
                              >
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono font-bold text-foreground">
                                      ₹{w.amount}
                                    </span>
                                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.2 text-[10px] font-mono font-semibold uppercase ${
                                      w.status === "COMPLETED"
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                        : w.status === "CANCELLED"
                                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                    }`}>
                                      {w.status.toLowerCase()}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground break-all font-mono">
                                    {w.upiId} &middot; {format(new Date(w.createdAt), "dd MMM yyyy, h:mm a")}
                                  </p>
                                  {w.adminNote && (
                                    <p className="text-[11px] text-muted-foreground italic break-words">
                                      Note: {w.adminNote}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {withdrawTotalPages > 1 && (
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/40 mt-3">
                        <span className="text-[11px] text-muted-foreground">
                          Page {withdrawPage} of {withdrawTotalPages}
                        </span>
                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="xs"
                            className="h-7 px-2 text-[11px]"
                            disabled={withdrawPage <= 1}
                            onClick={() => void loadWithdrawHistory(withdrawPage - 1)}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            className="h-7 px-2 text-[11px]"
                            disabled={withdrawPage >= withdrawTotalPages}
                            onClick={() => void loadWithdrawHistory(withdrawPage + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              </div>

              {/* Bottom: Withdrawal Guide & Info (Below form as requested) */}
              {withdrawDescription ? (
                <Card className="p-4 bg-card border-border/60 rounded-xl shadow-2xs">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpFromLine className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="text-xs font-bold text-foreground font-lora">
                      Withdrawal Terms & Guidelines
                    </h3>
                  </div>

                  <div className="rounded-lg bg-muted/30 p-3.5 border border-border/40">
                    <div className="prose prose-xs max-w-none text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {withdrawDescription}
                      </ReactMarkdown>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-4 bg-card border-border/60 rounded-xl shadow-2xs">
                  <div className="flex items-center gap-2">
                    <ArrowUpFromLine className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="text-xs font-bold text-foreground font-lora">
                      Withdrawal Information
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Amount is deducted immediately upon request. Admins verify each transaction and transfer funds directly to your specified UPI ID within standard processing windows.
                  </p>
                </Card>
              )}

            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-5 md:mt-6">
            {loadingTx ? (
              <Card className="card-list">
                <div className="flex h-36 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-foreground" />
                </div>
              </Card>
            ) : transactions.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center bg-background px-4 py-8 text-center">
                <Wallet className="mb-3 h-6 w-6 text-foreground" />

                <p className="text-base md:text-lg font-semibold text-foreground">
                  No transactions yet
                </p>

                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Wallet activity will appear here after you add funds, win prizes, or join
                  tournaments.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 px-1">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                      Transaction activity
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Review all credits, debits, and wallet balance changes.
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl border-0 bg-accent/60 px-4 text-muted-foreground shadow-sm hover:bg-accent/80 hover:text-foreground w-full sm:w-auto"
                    onClick={() => {
                      void loadBalance();
                      void loadTransactions(1);
                    }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>

                {transactions.map((tx) => {
                  const isCredit = TYPE_CREDIT[tx.type] ?? false;

                  return (
                    <Card
                      key={tx.id}
                      className="p-3 bg-card border-border/60 rounded-xl shadow-2xs hover:border-border transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="p-2 rounded-lg bg-muted shrink-0 mt-0.5">
                            <TxIcon type={tx.type} />
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-foreground">
                                {TYPE_LABELS[tx.type] ?? tx.type}
                              </span>

                              {tx.status ? (
                                <span className={getStatusBadgeClass(tx.status)}>
                                  {tx.status.toLowerCase()}
                                </span>
                              ) : null}
                            </div>

                            {tx.description ? (
                              <p className="text-xs text-muted-foreground break-words leading-tight">
                                {tx.description}
                              </p>
                            ) : null}

                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap pt-0.5">
                              <span>
                                {format(new Date(tx.createdAt), "dd MMM yyyy, h:mm a")}
                              </span>

                              {tx.referenceId ? (
                                <span className="font-mono text-[10px] uppercase bg-muted/50 px-1.5 py-0.5 rounded border border-border/40 shrink-0">
                                  Ref: {tx.referenceId}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/30">
                          <div className="text-left sm:text-right">
                            <p className={cn(
                              "text-sm font-bold font-mono tabular-nums",
                              isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                            )}>
                              {isCredit ? "+" : "-"}₹{tx.amount}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              Bal: ₹{tx.balanceAfter}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {totalPages > 1 ? (
                  <Card className="card-list">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        Page {page} of {totalPages}
                      </span>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 rounded-xl border-0 bg-background/80 px-4 flex-1"
                          disabled={page <= 1}
                          onClick={() => void loadTransactions(page - 1)}
                        >
                          Previous
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 rounded-xl border-0 bg-background/80 px-4 flex-1"
                          disabled={page >= totalPages}
                          onClick={() => void loadTransactions(page + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : null}
              </div>
            )}
          </TabsContent>
        </Tabs>
    </div>
  );
}