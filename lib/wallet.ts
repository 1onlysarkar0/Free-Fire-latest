import "server-only";
import { db } from "@/db/drizzle";
import { wallet, walletTransaction } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export type WalletTransactionType =
  | "JOIN_FEE"
  | "REFUND"
  | "PRIZE_CREDIT"
  | "ADMIN_CREDIT"
  | "ADMIN_DEBIT"
  | "WITHDRAWAL_REQUEST"
  | "UPI_DEPOSIT"
  | "INVITE_BONUS"
  | "SIGNUP_BONUS";

export interface WalletOperationResult {
  success: boolean;
  transactionId?: string;
  newBalance?: number;
  error?: string;
}

/**
 * Ensure a wallet row exists for the user. Creates one if missing.
 * Returns the wallet row.
 */
type DrizzleTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function getOrCreateWallet(userId: string, tx?: DrizzleTx) {
  const client = tx || db;
  const existing = await client
    .select({ id: wallet.id, balance: wallet.balance, userId: wallet.userId })
    .from(wallet)
    .where(eq(wallet.userId, userId))
    .limit(1);

  if (existing[0]) return existing[0];

  const id = nanoid();
  await client.insert(wallet).values({ id, userId, balance: 0, updatedAt: new Date() });
  return { id, balance: 0, userId };
}

/**
 * Debit a user's wallet inside a DB transaction with row-level locking.
 * Idempotent: if idempotencyKey already exists, returns the existing tx record.
 * Throws if balance is insufficient.
 */
export async function debitWallet(opts: {
  userId: string;
  amount: number;
  type: WalletTransactionType;
  referenceId?: string;
  description?: string;
  performedByAdminId?: string;
  idempotencyKey?: string;
  tx?: DrizzleTx;
}): Promise<WalletOperationResult> {
  const { userId, amount, type, referenceId, description, performedByAdminId, tx: providedTx } = opts;
  const idempotencyKey = opts.idempotencyKey ?? nanoid();

  if (amount <= 0) {
    return { success: false, error: "Amount must be positive" };
  }

  try {
    let transactionId = "";
    let newBalance = 0;

    const execute = async (tx: DrizzleTx) => {
      // ── 1. Idempotency guard (inside the transaction so it's atomic) ──────────
      const existing = await tx
        .select({ id: walletTransaction.id, balanceAfter: walletTransaction.balanceAfter })
        .from(walletTransaction)
        .where(eq(walletTransaction.idempotencyKey, idempotencyKey))
        .limit(1);

      if (existing[0]) {
        // Already processed — surface result without touching the wallet
        transactionId = existing[0].id;
        newBalance = existing[0].balanceAfter;
        return; // tx commits immediately, nothing changed
      }

      // ── 2. Lock the wallet row ─────────────────────────────────────────────────
      const walletRows = await tx
        .select({ id: wallet.id, balance: wallet.balance })
        .from(wallet)
        .where(eq(wallet.userId, userId))
        .for("update")
        .limit(1);

      let walletRow = walletRows[0];

      // Auto-create wallet if it doesn't exist yet
      if (!walletRow) {
        const wid = nanoid();
        await tx.insert(wallet).values({ id: wid, userId, balance: 0, updatedAt: new Date() });
        walletRow = { id: wid, balance: 0 };
      }

      if (walletRow.balance < amount) {
        throw new Error(`Insufficient balance. Current: ${walletRow.balance}, Required: ${amount}`);
      }

      newBalance = walletRow.balance - amount;
      transactionId = nanoid();



      await tx
        .update(wallet)
        .set({ balance: newBalance, updatedAt: new Date() })
        .where(eq(wallet.userId, userId));

      await tx.insert(walletTransaction).values({
        id: transactionId,
        userId,
        type,
        amount,
        balanceBefore: walletRow.balance,
        balanceAfter: newBalance,
        referenceId: referenceId ?? null,
        description: description ?? null,
        status: "COMPLETED",
        idempotencyKey,
        performedByAdminId: performedByAdminId ?? null,
        createdAt: new Date(),
      });
    };

    if (providedTx) {
      await execute(providedTx);
    } else {
      await db.transaction(execute);
    }

    return { success: true, transactionId, newBalance };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("Insufficient balance")) {
      console.warn(`[Wallet] Debit failed: Insufficient balance for userId=${userId}. Required: ${amount}`);
    } else {
      console.error(`[Wallet] Debit failed for userId=${userId}:`, message);
    }
    return { success: false, error: message };
  }
}

/**
 * Credit a user's wallet inside a DB transaction.
 * Idempotent: if idempotencyKey already exists, returns the existing tx record.
 */
export async function creditWallet(opts: {
  userId: string;
  amount: number;
  type: WalletTransactionType;
  referenceId?: string;
  description?: string;
  performedByAdminId?: string;
  idempotencyKey?: string;
  tx?: DrizzleTx;
}): Promise<WalletOperationResult> {
  const { userId, amount, type, referenceId, description, performedByAdminId, tx: providedTx } = opts;
  const idempotencyKey = opts.idempotencyKey ?? nanoid();

  if (amount <= 0) {
    return { success: false, error: "Amount must be positive" };
  }

  try {
    let transactionId = "";
    let newBalance = 0;

    const execute = async (tx: DrizzleTx) => {
      // ── 1. Idempotency guard (inside the transaction so it's atomic) ──────────
      const existing = await tx
        .select({ id: walletTransaction.id, balanceAfter: walletTransaction.balanceAfter })
        .from(walletTransaction)
        .where(eq(walletTransaction.idempotencyKey, idempotencyKey))
        .limit(1);

      if (existing[0]) {
        // Already processed — surface result without touching the wallet
        transactionId = existing[0].id;
        newBalance = existing[0].balanceAfter;
        return; // tx commits immediately, nothing changed
      }

      // ── 2. Lock the wallet row ─────────────────────────────────────────────────
      const walletRows = await tx
        .select({ id: wallet.id, balance: wallet.balance })
        .from(wallet)
        .where(eq(wallet.userId, userId))
        .for("update")
        .limit(1);

      let walletRow = walletRows[0];

      if (!walletRow) {
        const wid = nanoid();
        await tx.insert(wallet).values({ id: wid, userId, balance: 0, updatedAt: new Date() });
        walletRow = { id: wid, balance: 0 };
      }

      newBalance = walletRow.balance + amount;
      transactionId = nanoid();



      await tx
        .update(wallet)
        .set({ balance: newBalance, updatedAt: new Date() })
        .where(eq(wallet.userId, userId));

      await tx.insert(walletTransaction).values({
        id: transactionId,
        userId,
        type,
        amount,
        balanceBefore: walletRow.balance,
        balanceAfter: newBalance,
        referenceId: referenceId ?? null,
        description: description ?? null,
        status: "COMPLETED",
        idempotencyKey,
        performedByAdminId: performedByAdminId ?? null,
        createdAt: new Date(),
      });
    };

    if (providedTx) {
      await execute(providedTx);
    } else {
      await db.transaction(execute);
    }

    return { success: true, transactionId, newBalance };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Wallet] Credit failed for userId=${userId}:`, message);
    return { success: false, error: message };
  }
}

export async function adjustWalletBalance(opts: {
  userId: string;
  amount: number;
  action: "credit" | "debit";
  type: WalletTransactionType;
  referenceId?: string;
  description?: string;
  performedByAdminId?: string;
  idempotencyKey?: string;
  tx?: DrizzleTx;
}): Promise<WalletOperationResult> {
  const { action, ...rest } = opts;
  if (action === "credit") {
    return creditWallet(rest);
  } else {
    return debitWallet(rest);
  }
}

// AUDIT FIX: Renamed from getWalletBalanceCached — this function does NOT cache;
// it queries the DB on every call. Use this for real-time balance reads.
export async function getWalletBalance(userId: string) {
  const [row] = await db
    .select({ balance: wallet.balance })
    .from(wallet)
    .where(eq(wallet.userId, userId))
    .limit(1);
  return row?.balance ?? 0;
}

/** @deprecated Use getWalletBalance instead. */
export const getWalletBalanceCached = getWalletBalance;
