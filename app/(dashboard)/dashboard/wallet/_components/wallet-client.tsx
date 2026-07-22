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
    return <Trophy className="h-4 w-4 shrink-0 text-amber-500" />;
  }

  if (type === "JOIN_FEE") {
    return <Ticket className="h-4 w-4 shrink-0 text-blue-500" />;
  }

  if (type === "UPI_DEPOSIT") {
    return <Plus className="h-4 w-4 shrink-0 text-emerald-500" />;
  }

  return isCredit ? (
    <ArrowDownLeft className="h-4 w-4 shrink-0 text-emerald-500" />
  ) : (
    <ArrowUpRight className="h-4 w-4 shrink-0 text-destructive" />
  );
}

function getStatusBadgeClass(status?: string | null) {
  if (!status) return "bg-muted text-muted-foreground";

  const normalized = status.toLowerCase();

  if (normalized === "completed" || normalized === "verified") {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
  }

  if (normalized === "pending") {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
  }

  if (normalized === "failed") {
    return "bg-destructive/10 text-destructive border border-destructive/20";
  }

  return "bg-muted text-muted-foreground";
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
    <div className="w-full min-w-0 space-y-5 pb-6 text-foreground font-ibm">
      {/* Top Wallet Overview Tile */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card className="p-4 rounded-2xl border border-border/40 bg-card shadow-3xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Available Balance
            </p>
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground font-mono tabular-nums mt-1">
              ₹{balance}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Wallet className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border border-border/40 bg-card shadow-3xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Earned
            </p>
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
              +₹{totalEarned}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border border-border/40 bg-card shadow-3xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Spent
            </p>
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-muted-foreground font-mono tabular-nums mt-1">
              -₹{totalSpent}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <TrendingDown className="h-4 w-4" />
          </div>
        </Card>
      </div>

      {/* Segmented Action Tabs */}
      <Tabs defaultValue="add-funds" className="w-full" onValueChange={(v) => { if (v === "withdraw") void loadWithdrawHistory(1); }}>
        <TabsList className="grid h-10 w-full grid-cols-3 rounded-xl bg-secondary/50 p-1 mb-4">
          <TabsTrigger value="add-funds" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-2xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Deposit
          </TabsTrigger>
          <TabsTrigger value="withdraw" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-2xs">
            <ArrowUpFromLine className="h-3.5 w-3.5 mr-1.5" /> Withdraw
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-2xs">
            <History className="h-3.5 w-3.5 mr-1.5" /> History
          </TabsTrigger>
        </TabsList>

        {/* Deposit Tab */}
        <TabsContent value="add-funds" className="space-y-4 mt-0">
          {!paymentEnabled ? (
            <Card className="p-6 rounded-2xl border border-border/40 bg-card/60 text-center">
              <p className="text-sm font-bold text-foreground">UPI Payment Gateway Disabled</p>
              <p className="text-xs text-muted-foreground mt-1">Contact platform administrator for manual top-ups.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* Scan Box */}
              <Card className="p-4 md:col-span-4 rounded-2xl border border-border/40 bg-card text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-foreground">
                  <CreditCard className="w-4 h-4 text-primary" /> Scan UPI QR
                </div>
                <div className="p-2 bg-white rounded-xl inline-block border border-border/20 shadow-2xs">
                  <UPIQR upiId={paymentInfo!.upiId} upiName={paymentInfo!.upiName} size={160} />
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">UPI ID: <strong className="text-foreground">{paymentInfo!.upiId}</strong></p>
              </Card>

              {/* Form Box */}
              <Card className="p-4 sm:p-5 md:col-span-8 rounded-2xl border border-border/40 bg-card space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Submit UPI Reference</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Enter exact amount and 12-digit UTR/Ref number after paying.</p>
                </div>

                <form onSubmit={handleVerifyPayment} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="utr-amount" className="text-xs font-bold">Amount Paid (₹)</Label>
                      <Input
                        id="utr-amount"
                        type="number"
                        min={1}
                        placeholder="e.g. 100"
                        className="h-9 text-xs font-mono font-bold"
                        value={utrAmount}
                        onChange={(e) => setUtrAmount(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="utr-number" className="text-xs font-bold">UTR / Ref Number</Label>
                      <Input
                        id="utr-number"
                        type="text"
                        placeholder="e.g. 412345678901"
                        className="h-9 text-xs font-mono uppercase font-bold"
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
                        required
                      />
                    </div>
                  </div>

                  {formError && (
                    <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <Button type="submit" disabled={submitting} className="w-full sm:w-auto h-9 text-xs font-bold rounded-xl px-5">
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                    Verify Payment
                  </Button>
                </form>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Withdraw Tab */}
        <TabsContent value="withdraw" className="space-y-4 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <Card className="p-4 sm:p-5 md:col-span-6 rounded-2xl border border-border/40 bg-card space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Withdraw to UPI</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Directly request payout to your GPay, PhonePe, or Paytm UPI ID.</p>
              </div>

              <form onSubmit={handleWithdrawSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="withdraw-amount" className="text-xs font-bold">Withdraw Amount (₹)</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    min={1}
                    placeholder="e.g. 200"
                    className="h-9 text-xs font-mono font-bold"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="withdraw-upi" className="text-xs font-bold">Your UPI ID</Label>
                  <Input
                    id="withdraw-upi"
                    type="text"
                    placeholder="e.g. gamer@paytm"
                    className="h-9 text-xs font-mono font-bold"
                    value={withdrawUpiId}
                    onChange={(e) => setWithdrawUpiId(e.target.value)}
                    required
                  />
                </div>

                {withdrawError && (
                  <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{withdrawError}</span>
                  </div>
                )}

                <Button type="submit" disabled={withdrawSubmitting} className="w-full sm:w-auto h-9 text-xs font-bold rounded-xl px-5">
                  {withdrawSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <ArrowUpFromLine className="w-3.5 h-3.5 mr-1.5" />}
                  Submit Request
                </Button>
              </form>
            </Card>

            {/* Withdraw History Log */}
            <Card className="p-4 md:col-span-6 rounded-2xl border border-border/40 bg-card space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Withdrawal Requests Log</h3>
              {withdrawHistoryLoading ? (
                <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
              ) : withdrawHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No withdrawal requests logged yet.</p>
              ) : (
                <div className="space-y-2">
                  {withdrawHistory.map((w) => (
                    <div key={w.id} className="p-2.5 rounded-xl bg-secondary/40 border border-border/30 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-foreground font-mono">₹{w.amount} <span className="font-normal text-muted-foreground">to {w.upiId}</span></p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(w.createdAt), "dd MMM, h:mm a")}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        w.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : w.status === "CANCELLED" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600"
                      }`}>
                        {w.status.toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-3 mt-0">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Transaction Log</h3>
            <Button variant="ghost" size="sm" onClick={() => { void loadBalance(); void loadTransactions(1); }} className="h-7 text-[11px] px-2 text-muted-foreground">
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </div>

          {loadingTx ? (
            <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
          ) : transactions.length === 0 ? (
            <Card className="p-6 rounded-2xl border border-border/40 text-center">
              <p className="text-xs text-muted-foreground">No transaction history recorded yet.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const isCredit = TYPE_CREDIT[tx.type] ?? false;

                return (
                  <Card key={tx.id} className="p-3 rounded-xl border border-border/40 bg-card flex items-center justify-between gap-3 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <TxIcon type={tx.type} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{TYPE_LABELS[tx.type] ?? tx.type}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{format(new Date(tx.createdAt), "dd MMM yyyy, h:mm a")}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`text-xs font-extrabold font-mono ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                        {isCredit ? "+" : "-"}₹{tx.amount}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">Bal: ₹{tx.balanceAfter}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}