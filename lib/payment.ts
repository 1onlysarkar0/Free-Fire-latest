import "server-only";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { paymentConfig, paymentVerification, paymentEmailInbox } from "@/db/schema";
import { creditWallet } from "@/lib/wallet";
import { eq, and, gte, sql, count } from "drizzle-orm";
import crypto from "node:crypto";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PaymentConfig {
  upiId: string;
  upiName: string;
  pageContent: string;
  enabled: boolean;
}

export interface VerifyPaymentParams {
  userId: string;
  utrNumber: string;
  amount: number;
  ipAddress: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  error?: string;
  creditedAmount?: number;
}

// ─── Cryptography & Keys (Domain Separation) ─────────────────────────────────

function getDerivedKeys(): { encryptionKey: Buffer; hmacKey: Buffer } {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET environment variable is missing.");
  }
  const encryptionKey = crypto
    .createHmac("sha256", secret)
    .update("payment-encryption-key-v1")
    .digest();
  const hmacKey = crypto
    .createHmac("sha256", secret)
    .update("payment-hmac-key-v1")
    .digest();
  return { encryptionKey, hmacKey };
}

export function hashUTR(utr: string): string {
  const { hmacKey } = getDerivedKeys();
  return crypto
    .createHmac("sha256", hmacKey)
    .update(normalizeUTR(utr))
    .digest("hex");
}

interface EncryptedPayload {
  utr: string;
  amount: number;
  sender: string;
  emailMessageId?: string;
}

export function encryptPaymentPayload(payload: EncryptedPayload): string {
  const { encryptionKey } = getDerivedKeys();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  let encrypted = cipher.update(JSON.stringify(payload), "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptPaymentPayload(encryptedStr: string): EncryptedPayload | null {
  try {
    const { encryptionKey } = getDerivedKeys();
    const [ivHex, authTagHex, encryptedText] = encryptedStr.split(":");
    if (!ivHex || !authTagHex || !encryptedText) return null;

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted) as EncryptedPayload;
  } catch {
    return null;
  }
}

// ─── UTR Normalization Helper ────────────────────────────────────────────────

export function normalizeUTR(utr: string): string {
  return utr.trim().toUpperCase();
}

// ─── Get Config Helpers ──────────────────────────────────────────────────────

export async function getPaymentConfig(): Promise<PaymentConfig | null> {
  const rows = await db
    .select()
    .from(paymentConfig)
    .where(eq(paymentConfig.id, "default"))
    .limit(1);

  if (!rows.length) return null;
  const row = rows[0];
  return {
    upiId: row.upiId,
    upiName: row.upiName,
    pageContent: row.pageContent,
    enabled: row.enabled,
  };
}

export async function getPublicPaymentConfig() {
  const rows = await db
    .select({
      upiId: paymentConfig.upiId,
      upiName: paymentConfig.upiName,
      pageContent: paymentConfig.pageContent,
      enabled: paymentConfig.enabled,
    })
    .from(paymentConfig)
    .where(eq(paymentConfig.id, "default"))
    .limit(1);

  return rows[0] || null;
}

// ─── Rate Limit Checks ───────────────────────────────────────────────────────

export async function checkRateLimit(
  userId: string,
  ipAddress: string
): Promise<{ userExceeded: boolean; ipExceeded: boolean }> {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  const [userCountResult] = await db
    .select({ count: count() })
    .from(paymentVerification)
    .where(
      and(
        eq(paymentVerification.userId, userId),
        gte(paymentVerification.createdAt, fifteenMinutesAgo)
      )
    );

  const [ipCountResult] = await db
    .select({ count: count() })
    .from(paymentVerification)
    .where(
      and(
        eq(paymentVerification.ipAddress, ipAddress),
        gte(paymentVerification.createdAt, fifteenMinutesAgo)
      )
    );

  const userAttempts = Number(userCountResult?.count ?? 0);
  const ipAttempts = Number(ipCountResult?.count ?? 0);

  return {
    userExceeded: userAttempts >= 5,
    ipExceeded: ipAttempts >= 10,
  };
}

// ─── Duplicate Check ─────────────────────────────────────────────────────────

export async function isUTRAlreadyUsed(utrNumber: string): Promise<boolean> {
  const hashed = hashUTR(utrNumber);
  const existing = await db
    .select({ id: paymentVerification.id })
    .from(paymentVerification)
    .where(
      and(
        eq(paymentVerification.utrHash, hashed),
        eq(paymentVerification.status, "verified")
      )
    )
    .limit(1);
  return existing.length > 0;
}

// ─── Input Validation ────────────────────────────────────────────────────────

export function validateUTR(utr: string): boolean {
  return /^[A-Za-z0-9]{10,22}$/.test(utr.trim());
}

export function validateAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount >= 1 && amount <= 50000;
}

export function extractUTR(text: string): string | null {
  const patterns = [
    // Standard UPI & Ref Patterns
    /UPI\s*[/\\]\s*([A-Za-z0-9]{10,22})\s*[/\\]/i,
    /UPI\s+Ref(?:erence)?(?:\s+No\.?)?[:\s]+([A-Za-z0-9]{10,22})/i,
    /UTR[:\s#]+([A-Za-z0-9]{10,22})/i,
    /Ref(?:erence)?\s*(?:No\.?|#)[:\s]+([A-Za-z0-9]{10,22})/i,
    /Transaction\s*(?:ID|Id|Ref)[:\s#]+([A-Za-z0-9]{10,22})/i,
    /Txn\s*(?:ID|Id)[:\s#]+([A-Za-z0-9]{10,22})/i,
    // PhonePe & Paytm & GPay specific patterns
    /PhonePe\s*(?:Ref|Txn|UTR)[:\s#]*([A-Za-z0-9]{10,22})/i,
    /Paytm\s*(?:Ref|Txn|UTR)[:\s#]*([A-Za-z0-9]{10,22})/i,
    /Google\s*Pay\s*(?:Ref|Txn|UTR)[:\s#]*([A-Za-z0-9]{10,22})/i,
    /BharatPe\s*(?:Ref|Txn|UTR)[:\s#]*([A-Za-z0-9]{10,22})/i,
    // Standard 12-digit numeric UTRs
    /\b([0-9]{12})\b/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const candidate = m[1].trim();
      if (/^[0-9]{10}$/.test(candidate)) continue; // skip 10-digit mobile numbers
      return candidate;
    }
  }
  return null;
}

export function extractAmount(text: string): number | null {
  const patterns = [
    /Amount[:\s]+(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /credited\s+(?:with\s+)?(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /received\s+(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /paid\s+(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /INR\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const cleaned = m[1].replace(/,/g, "");
      const amount = parseFloat(cleaned);
      if (!isNaN(amount) && amount > 0) return Math.round(amount);
    }
  }
  return null;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x20B9;/gi, "₹")
    .replace(/&amp;/gi, "&")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function isCreditTransaction(text: string): boolean {
  const lower = text.toLowerCase();

  // Strong Debit / Sent / Paid Indicators (If any match without a credit context, return false immediately)
  const debitPhrases = [
    "paid to",
    "payment to",
    "sent to",
    "debited by",
    "debited from",
    "debited for",
    "has been debited",
    "successfully paid",
    "transfer to",
    "transferred to",
    "money sent",
    "withdrawn from",
    "debit alert",
    "payment sent",
    "purchase at",
    "spent on",
  ];

  // Strong Credit / Received Indicators
  const creditPhrases = [
    "credited with",
    "credited to",
    "credited by",
    "has been credited",
    "received from",
    "received in",
    "received for",
    "money received",
    "received ₹",
    "received rs",
    "payment received",
    "amount received",
    "deposit received",
    "credit alert",
  ];

  const hasCredit = creditPhrases.some((phrase) => lower.includes(phrase));
  const hasDebit = debitPhrases.some((phrase) => lower.includes(phrase));

  if (hasDebit && !hasCredit) {
    return false;
  }

  // Fallback standalone words if no compound phrase matched
  if (!hasCredit) {
    const isExplicitDebit = /\b(debited|debit)\b/i.test(lower) && !/\b(credited|credit)\b/i.test(lower);
    if (isExplicitDebit) return false;
  }

  return true;
}

// ─── Advisory Locks ─────────────────────────────────────────────────────────

async function acquireUTRLock(utr: string): Promise<void> {
  const lockKey = hashUTR(utr).slice(0, 8);
  const lockInt = parseInt(lockKey, 16) & 0x7fffffff;
  await db.execute(sql`SELECT pg_advisory_lock(${lockInt})`);
}

async function releaseUTRLock(utr: string): Promise<void> {
  const lockKey = hashUTR(utr).slice(0, 8);
  const lockInt = parseInt(lockKey, 16) & 0x7fffffff;
  await db.execute(sql`SELECT pg_advisory_unlock(${lockInt})`);
}

// ─── Main Verification Function (Zero Cron & Advisory Lock & Claims) ───────

export async function verifyAndCreditPayment(
  params: VerifyPaymentParams
): Promise<VerifyPaymentResult> {
  const { userId, utrNumber, amount, ipAddress } = params;

  const cleanUTR = normalizeUTR(utrNumber);
  const utrHashed = hashUTR(cleanUTR);

  // 1. Validate formats
  if (!validateUTR(cleanUTR)) {
    return { success: false, error: "Invalid UTR/Reference number format." };
  }
  if (!validateAmount(amount)) {
    return { success: false, error: "Amount must be between ₹1 and ₹50,000." };
  }

  // 2. Rate limit check (Run BEFORE DB write to avoid noisy audit rows/DB bloat)
  const rateLimitStatus = await checkRateLimit(userId, ipAddress);
  if (rateLimitStatus.userExceeded || rateLimitStatus.ipExceeded) {
    return { success: false, error: "Too many verification attempts. Please wait 15 minutes." };
  }

  // 3. Check if UTR was already used/verified in a prior payment
  const alreadyUsed = await isUTRAlreadyUsed(cleanUTR);
  if (alreadyUsed) {
    await db.insert(paymentVerification).values({
      userId,
      claimedAmount: amount,
      utrNumber: encryptPaymentPayload({ utr: cleanUTR, amount, sender: "duplicate" }),
      utrHash: utrHashed,
      status: "duplicate_utr",
      ipAddress,
      failReason: "UTR already used in a previous verified payment",
    });
    return { success: false, error: "This UTR number has already been used." };
  }

  // 4. Check payment config
  const config = await getPaymentConfig();
  if (!config || !config.enabled) {
    return { success: false, error: "Payment verification is not available right now." };
  }

  // 5. Create audit log row (Status: pending)
  const [pendingRow] = await db
    .insert(paymentVerification)
    .values({
      userId,
      claimedAmount: amount,
      utrNumber: encryptPaymentPayload({ utr: cleanUTR, amount, sender: "pending" }),
      utrHash: utrHashed,
      status: "pending",
      ipAddress,
    })
    .returning({ id: paymentVerification.id });

  // 6. Lock UTR to serialize concurrent attempts
  await acquireUTRLock(cleanUTR);
  try {
    // ── FAST INSTANT DATABASE LOOKUP (Atomically claim by existence) ─────────
    // Rows are ingested automatically via Webhook. Existence = unclaimed.
    const matchedInboxItem = await db.transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(paymentEmailInbox)
        .where(eq(paymentEmailInbox.utrHash, utrHashed))
        .for("update")
        .limit(1);

      return item ?? null;
    });

    if (!matchedInboxItem) {
      await db
        .update(paymentVerification)
        .set({
          status: "email_not_found",
          failReason: "No matching payment email found for UTR + amount combination",
        })
        .where(eq(paymentVerification.id, pendingRow.id));
      return {
        success: false,
        error: "Payment not found. Please check the UTR number and amount. If paid recently, wait 1–2 minutes and try again.",
      };
    }

    // Check amount match — if mismatch, leave the row (do NOT delete) so others can claim
    if (matchedInboxItem.amount !== amount) {
      await db
        .update(paymentVerification)
        .set({
          status: "amount_mismatch",
          failReason: `UTR found in DB inbox but email shows ₹${matchedInboxItem.amount}, user claimed ₹${amount}`,
        })
        .where(eq(paymentVerification.id, pendingRow.id));
      return {
        success: false,
        error: "Payment verification failed. Please check the UTR number and ensure you entered the exact amount paid.",
      };
    }

    const decryptedPayload = decryptPaymentPayload(matchedInboxItem.encryptedData);

    // ── STEP D: CREDIT WALLET IDEMPOTENTLY ─────────────────────────────────
    const creditResult = await creditWallet({
      userId,
      amount,
      type: "UPI_DEPOSIT",
      referenceId: cleanUTR,
      description: `Wallet top-up via UPI (UTR: ${cleanUTR})`,
      idempotencyKey: `upi-deposit-${cleanUTR}`,
    });

    if (!creditResult.success) {
      // Wallet credit failed (UTR already credited) — row stays unclaimed, user gets error
      return { success: false, error: "This UTR number has already been used." };
    }

    // ── STEP E: DELETE inbox row & PERSIST VERIFIED STATUS ─────────────────
    // Row deletion = permanent claim. Duplicate protection comes from
    // paymentVerification.utrHash (status=verified) — not from inbox.
    await db.transaction(async (tx) => {
      await tx
        .delete(paymentEmailInbox)
        .where(eq(paymentEmailInbox.id, matchedInboxItem!.id));

      await tx
        .update(paymentVerification)
        .set({
          status: "verified",
          verifiedAmount: matchedInboxItem!.amount,
          emailMessageId: decryptedPayload?.emailMessageId ?? matchedInboxItem!.emailMessageId,
          emailSender: decryptedPayload?.sender ?? null,
          verifiedAt: new Date(),
        })
        .where(eq(paymentVerification.id, pendingRow.id));
    });

    return { success: true, creditedAmount: amount };
  } catch (err) {
    // No inbox revert needed — row was never modified, just not deleted

    await db
      .update(paymentVerification)
      .set({
        status: "failed",
        failReason: `Error: ${err instanceof Error ? err.message : "Unknown"}`,
      })
      .where(eq(paymentVerification.id, pendingRow.id));

    return {
      success: false,
      error: "Payment verification failed. Please try again or contact support.",
    };
  } finally {
    await releaseUTRLock(cleanUTR);
  }
}
