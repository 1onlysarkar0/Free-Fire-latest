import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserWalletCached, getUserTransactionsCached, getWithdrawConfig } from "@/lib/user-data";
import { getPublicPaymentConfig } from "@/lib/payment";
import WalletClient, { Transaction, PaymentInfo } from "./_components/wallet-client";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  if (!session?.user) {
    redirect("/sign-in?returnTo=/dashboard/wallet");
    return;
  }

  const [walletRow, transactionRows, paymentConfig, withdrawCfg] = await Promise.all([
    getUserWalletCached(session.user.id),
    getUserTransactionsCached(session.user.id),
    getPublicPaymentConfig(),
    getWithdrawConfig(),
  ]);

  const initialBalance = walletRow?.balance ?? 0;
  const initialTransactions: Transaction[] = transactionRows.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    balanceBefore: tx.balanceBefore,
    balanceAfter: tx.balanceAfter,
    description: tx.description,
    referenceId: tx.referenceId,
    status: tx.status,
    createdAt:
      typeof tx.createdAt === "string" ? tx.createdAt : tx.createdAt.toISOString(),
  }));

  const paymentInfo: PaymentInfo | null = paymentConfig
    ? {
        upiId: paymentConfig.upiId,
        upiName: paymentConfig.upiName,
        pageContent: paymentConfig.pageContent,
        enabled: paymentConfig.enabled,
      }
    : null;

  return (
    <WalletClient
      initialBalance={initialBalance}
      initialTransactions={initialTransactions}
      paymentInfo={paymentInfo}
      withdrawDescription={withdrawCfg?.description ?? ""}
    />
  );
}
