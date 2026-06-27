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
    <div className="w-full min-w-0 space-y-6">
      <Tabs defaultValue="add-funds" className="w-full" onValueChange={(v) => { if (v === "withdraw") void loadWithdrawHistory(1); }}>
        <div className="space-y-5 md:space-y-6">

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                My wallet
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Add funds, verify UPI payments, and track every wallet activity from one place.
              </p>
            </div>

            <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-accent/60 p-1 shadow-sm xl:w-auto">
              <TabsTrigger
                value="add-funds"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-h-[44px] flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Add Funds</span>
              </TabsTrigger>
              <TabsTrigger
                value="withdraw"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-h-[44px] flex items-center justify-center gap-2"
              >
                <ArrowUpFromLine className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Withdraw</span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-h-[44px] flex items-center justify-center gap-2"
              >
                <History className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="card-widget p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Available balance
                  </p>
                  <p className="mt-1 text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                    ₹{balance}
                  </p>
                </div>
                <Wallet className="h-5 w-5 shrink-0 text-foreground" />
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Current usable wallet amount for tournament entries, refunds, prize credits, and
                verified deposits.
              </p>
            </Card>

            <Card className="card-widget p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Total earned
                  </p>
                  <p className="mt-1 text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                    +₹{totalEarned}
                  </p>
                </div>
                <TrendingUp className="h-5 w-5 shrink-0 text-foreground" />
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Refunds, prize winnings, admin credits, and successful UPI top-ups.
              </p>
            </Card>

            <Card className="card-widget p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Total spent
                  </p>
                  <p className="mt-1 text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                    -₹{totalSpent}
                  </p>
                </div>
                <TrendingDown className="h-5 w-5 shrink-0 text-foreground" />
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Tournament entries, manual debits, and withdrawal requests logged from your
                wallet.
              </p>
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
              <div className="grid grid-cols-1 gap-5 md:gap-6 lg:grid-cols-12">
                <div className="lg:col-span-4">
                  <Card className="card-settings">
                    <div className="flex items-start gap-3">
                      <CreditCard className="h-5 w-5 shrink-0 text-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">Scan and pay</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Use any supported UPI app to complete the payment.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-background/80 p-4 shadow-sm">
                      <div className="mx-auto flex w-full justify-center">
                        <UPIQR
                          upiId={paymentInfo!.upiId}
                          upiName={paymentInfo!.upiName}
                          size={200}
                        />
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-background/80 px-3 py-3 md:px-4 md:py-3">
                      <p className="text-sm leading-6 text-muted-foreground">
                        After completing payment, submit the exact amount and UTR reference from
                        your UPI app.
                      </p>
                    </div>
                  </Card>
                </div>

                <div className="space-y-5 md:space-y-6 lg:col-span-8">
                  <Card className="card-settings">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold tracking-tight text-foreground">
                        Submit transaction details
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Use the same amount and UTR from your successful payment.
                      </p>
                    </div>

                    <form onSubmit={handleVerifyPayment} className="mt-5 space-y-5">
                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="utr-amount"
                            className="text-sm font-semibold text-foreground"
                          >
                            Amount paid
                          </Label>

                          <Input
                            id="utr-amount"
                            type="number"
                            min={1}
                            max={50000}
                            step={1}
                            placeholder="e.g. 100"
                            className="input font-semibold"
                            value={utrAmount}
                            onChange={(e) => {
                              setUtrAmount(e.target.value);
                              setFormError(null);
                            }}
                            disabled={submitting}
                            required
                          />

                          <p className="text-xs leading-5 text-muted-foreground">
                            Enter the exact amount transferred through UPI.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="utr-number"
                            className="text-sm font-semibold text-foreground"
                          >
                            UTR / UPI reference number
                          </Label>

                          <Input
                            id="utr-number"
                            type="text"
                            placeholder="e.g. 412345678901"
                            className="input font-mono font-semibold uppercase"
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

                          <p className="text-xs leading-5 text-muted-foreground">
                            Copy the transaction reference from Paytm, GPay, PhonePe, or BHIM.
                          </p>
                        </div>
                      </div>

                      {formError ? (
                        <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-sm text-destructive">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span className="font-medium leading-6">{formError}</span>
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="max-w-sm text-xs leading-5 text-muted-foreground">
                          Funds are credited after verification. Each UTR can only be used once.
                        </p>

                        <Button
                          type="submit"
                          disabled={submitting}
                          className="h-11 rounded-xl px-5 font-semibold w-full sm:w-auto sm:min-w-[220px]"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                              Verifying payment...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-1.5 h-4 w-4" />
                              Verify payment
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Card>

                  {paymentInfo?.pageContent ? (
                    <Card className="card-settings">
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold tracking-tight text-foreground">
                          Payment instructions
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Follow the steps carefully before submitting your transaction details.
                        </p>
                      </div>

                      <div className="mt-4 rounded-2xl bg-background/80 p-4 shadow-sm">
                        <div className="prose prose-sm max-w-none text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary">
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

          <TabsContent value="withdraw" className="mt-5 md:mt-6">
            <div className="grid grid-cols-1 gap-5 md:gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4">
                {withdrawDescription ? (
                  <Card className="card-settings">
                    <div className="flex items-start gap-3">
                      <ArrowUpFromLine className="h-5 w-5 shrink-0 text-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">Withdrawal info</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-background/80 p-4 shadow-sm">
                      <div className="prose prose-sm max-w-none text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {withdrawDescription}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="card-settings">
                    <div className="flex items-start gap-3">
                      <ArrowUpFromLine className="h-5 w-5 shrink-0 text-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">Request withdrawal</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Withdraw your wallet balance to your UPI account.
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-background/80 px-3 py-3 md:px-4 md:py-3">
                      <p className="text-sm leading-6 text-muted-foreground">
                        Amount is deducted immediately upon request. Admin will process and transfer
                        funds to your UPI ID.
                      </p>
                    </div>
                  </Card>
                )}
              </div>

              <div className="space-y-5 md:space-y-6 lg:col-span-8">
                <Card className="card-settings">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold tracking-tight text-foreground">
                      Submit withdrawal request
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Enter your UPI ID and the amount you want to withdraw.
                    </p>
                  </div>

                  <form onSubmit={handleWithdrawSubmit} className="mt-5 space-y-5">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label
                          htmlFor="withdraw-amount"
                          className="text-sm font-semibold text-foreground"
                        >
                          Amount (₹)
                        </Label>
                        <Input
                          id="withdraw-amount"
                          type="number"
                          min={1}
                          step={1}
                          placeholder="e.g. 100"
                          className="input font-semibold"
                          value={withdrawAmount}
                          onChange={(e) => {
                            setWithdrawAmount(e.target.value);
                            setWithdrawError(null);
                          }}
                          disabled={withdrawSubmitting}
                          required
                        />
                        <p className="text-xs leading-5 text-muted-foreground">
                          Enter the amount you wish to withdraw.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="withdraw-upi"
                          className="text-sm font-semibold text-foreground"
                        >
                          UPI ID
                        </Label>
                        <Input
                          id="withdraw-upi"
                          type="text"
                          placeholder="e.g. name@paytm"
                          className="input font-semibold"
                          value={withdrawUpiId}
                          onChange={(e) => {
                            setWithdrawUpiId(e.target.value);
                            setWithdrawError(null);
                          }}
                          disabled={withdrawSubmitting}
                          required
                        />
                        <p className="text-xs leading-5 text-muted-foreground">
                          Your UPI ID linked to GPay, PhonePe, Paytm, or BHIM.
                        </p>
                      </div>
                    </div>

                    {withdrawError ? (
                      <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-sm text-destructive">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="font-medium leading-6">{withdrawError}</span>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="max-w-sm text-xs leading-5 text-muted-foreground">
                        Current balance: ₹{balance}. Amount will be deducted immediately.
                      </p>

                      <Button
                        type="submit"
                        disabled={withdrawSubmitting}
                        className="h-11 rounded-xl px-5 font-semibold w-full sm:w-auto sm:min-w-[220px]"
                      >
                        {withdrawSubmitting ? (
                          <>
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <ArrowUpFromLine className="mr-1.5 h-4 w-4" />
                            Submit withdrawal
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Card>

                {/* Withdrawal History */}
                <Card className="card-list">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold tracking-tight text-foreground">
                      Withdrawal history
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Track your submitted withdrawal requests.
                    </p>
                  </div>

                  <div className="mt-4">
                    {withdrawHistoryLoading ? (
                      <div className="flex h-24 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-foreground" />
                      </div>
                    ) : withdrawHistory.length === 0 ? (
                      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                        No withdrawal requests yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {withdrawHistory.map((w) => (
                          <div
                            key={w.id}
                            className="flex items-center justify-between rounded-xl bg-background/60 p-3"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">
                                  ₹{w.amount}
                                </span>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  w.status === "COMPLETED"
                                    ? "bg-success/10 text-success"
                                    : w.status === "CANCELLED"
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-warning/15 text-warning"
                                }`}>
                                  {w.status.toLowerCase()}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {w.upiId} &middot; {format(new Date(w.createdAt), "dd MMM yyyy, h:mm a")}
                              </p>
                              {w.adminNote && (
                                <p className="mt-0.5 text-xs text-muted-foreground italic">
                                  Note: {w.adminNote}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        {withdrawTotalPages > 1 && (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
                            <span className="text-xs text-muted-foreground">
                              Page {withdrawPage} of {withdrawTotalPages}
                            </span>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-10 rounded-lg border-0 bg-background/80 px-3 text-xs flex-1"
                                disabled={withdrawPage <= 1}
                                onClick={() => void loadWithdrawHistory(withdrawPage - 1)}
                              >
                                Previous
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-10 rounded-lg border-0 bg-background/80 px-3 text-xs flex-1"
                                disabled={withdrawPage >= withdrawTotalPages}
                                onClick={() => void loadWithdrawHistory(withdrawPage + 1)}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
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
                      className="card-widget p-4"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <TxIcon type={tx.type} />

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">
                                {TYPE_LABELS[tx.type] ?? tx.type}
                              </span>

                              {tx.status ? (
                                <span className={getStatusBadgeClass(tx.status)}>
                                  {tx.status.toLowerCase()}
                                </span>
                              ) : null}
                            </div>

                            {tx.description ? (
                              <p className="truncate text-sm text-muted-foreground">
                                {tx.description}
                              </p>
                            ) : null}

                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="inline-flex items-center rounded-full bg-background/80 px-2.5 py-1">
                                {format(new Date(tx.createdAt), "dd MMM yyyy, h:mm a")}
                              </span>

                              {tx.referenceId ? (
                                <span className="inline-flex items-center rounded-full bg-background/80 px-2.5 py-1 font-mono uppercase tracking-wide">
                                  {tx.referenceId}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 xl:min-w-[170px] xl:justify-end">
                          <div className="text-left xl:text-right">
                            <p className="text-base font-semibold tracking-tight text-foreground">
                              {isCredit ? "+" : "-"}₹{tx.amount}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Balance: ₹{tx.balanceAfter}
                            </p>
                          </div>

                          <ArrowUpRight className="h-4 w-4 shrink-0 text-foreground" />
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