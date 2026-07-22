import "server-only";
import { z } from "zod";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { db } from "@/db/drizzle";
import { paymentConfig, paymentVerification, paymentEmailInbox } from "@/db/schema";
import { creditWallet } from "@/lib/wallet";
import { eq, and, gte, sql, or, lt, count } from "drizzle-orm";
import crypto from "node:crypto";

// ─── Constants ───────────────────────────────────────────────────────────────

const IMAP_FOLDER_PROCESSED = "Free Fire";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PaymentConfig {
  gmailEmail: string;
  gmailAppPassword: string;
  trustedSenders: string[];
  checkDays: number;
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

interface EmailMatch {
  messageId: string;
  sender: string;
  utrNumber: string;
  amount: number;
}

type FindEmailResult =
  | { type: "match"; match: EmailMatch }
  | { type: "amount_mismatch"; emailAmount: number; sender: string }
  | { type: "not_found" };

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
    gmailEmail: row.gmailEmail,
    gmailAppPassword: row.gmailAppPassword,
    trustedSenders: z.array(z.string()).catch([]).parse(JSON.parse(row.trustedSenders || "[]")),
    checkDays: row.checkDays,
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

// ─── UTR & Amount Extraction ─────────────────────────────────────────────────

function extractUTR(text: string): string | null {
  const patterns = [
    /UPI\s*[/\\]\s*([A-Za-z0-9]{10,22})\s*[/\\]/i,
    /UPI\s+Ref(?:erence)?(?:\s+No\.?)?[:\s]+([A-Za-z0-9]{10,22})/i,
    /UTR[:\s#]+([A-Za-z0-9]{10,22})/i,
    /Ref(?:erence)?\s*(?:No\.?|#)[:\s]+([A-Za-z0-9]{10,22})/i,
    /Transaction\s*(?:ID|Id|Ref)[:\s#]+([A-Za-z0-9]{10,22})/i,
    /Txn\s*(?:ID|Id)[:\s#]+([A-Za-z0-9]{10,22})/i,
    /\b([0-9]{12})\b/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const candidate = m[1].trim();
      if (/^[0-9]{10}$/.test(candidate)) continue;
      return candidate;
    }
  }
  return null;
}

function extractAmount(text: string): number | null {
  const patterns = [
    /Amount[:\s]+(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /credited\s+(?:with\s+)?(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /received\s+(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /paid\s+(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
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

// ─── Search criteria helper ──────────────────────────────────────────────────

function buildOrSearch(
  criteria: Array<Record<string, unknown>>
): Record<string, unknown> {
  if (criteria.length === 0) throw new Error("buildOrSearch: empty array");
  if (criteria.length === 1) return criteria[0];
  return { or: [criteria[0], buildOrSearch(criteria.slice(1))] };
}

function stripHtml(html: string): string {
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

// ─── STRICT SPF/DKIM verification ───────────────────────────────────────────

function checkEmailAuth(parsed: { headers: Map<string, unknown> }): boolean {
  const rawHeader = parsed.headers.get("authentication-results");
  if (!rawHeader) {
    return false; // STRICT: Reject immediately if authentication header is missing
  }
  const parts: string[] = [];
  const collect = (v: unknown) => {
    if (typeof v === "string") { parts.push(v); return; }
    if (Array.isArray(v)) { v.forEach(collect); return; }
    if (v && typeof v === "object") {
      const obj = v as Record<string, unknown>;
      if (typeof obj["value"] === "string") parts.push(obj["value"]);
      else parts.push(JSON.stringify(obj));
    }
  };
  collect(rawHeader);

  const authStr = parts.join(" ").toLowerCase();
  if (!authStr) {
    return false; // STRICT: Reject if headers parse empty
  }
  const spfPass  = /\bspf=pass\b/.test(authStr);
  const dkimPass = /\bdkim=pass\b/.test(authStr);
  return spfPass && dkimPass;
}

// ─── Gmail IMAP Direct Find ──────────────────────────────────────────────────

export async function findPaymentEmail(
  config: PaymentConfig,
  targetUTR: string,
  targetAmount: number
): Promise<FindEmailResult> {
  const trustedSenders = config.trustedSenders
    .map((sender) => sender.trim().toLowerCase())
    .filter(Boolean);
  if (trustedSenders.length === 0) return { type: "not_found" };

  const client = createImapClient(config.gmailEmail, config.gmailAppPassword);
  let lock: Awaited<ReturnType<ImapFlow["getMailboxLock"]>> | undefined;

  try {
    await client.connect();
    lock = await client.getMailboxLock("INBOX");
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - config.checkDays);
    const senderCriteria = trustedSenders.map((from) => ({ from }));
    const senderFilter = buildOrSearch(senderCriteria);

    // CRITICAL BUSINESS RULE: Only search unread emails (seen: false).
    // This prevents reprocessing/re-claiming of already sync'd or manually read payments.
    // Do NOT remove or change seen: false to include read/seen emails.
    const ids = await client.search(
      { seen: false, since: sinceDate, ...senderFilter },
      { uid: true }
    );
    if (!ids || ids.length === 0) return { type: "not_found" };

    const messages: { uid: number; source: Buffer }[] = [];
    const fetchIterator = client.fetch(
      ids,
      { uid: true, source: { maxLength: 2 * 1024 * 1024 } },
      { uid: true }
    );

    try {
      for await (const message of fetchIterator) {
        if (message.uid && message.source) {
          messages.push({ uid: message.uid, source: message.source });
        }
      }
    } catch (fetchErr) {
      await fetchIterator.return?.();
      throw fetchErr;
    }

    let mismatch: { emailAmount: number; sender: string } | null = null;
    let matchedUid: number | null = null;
    let finalMatch: EmailMatch | null = null;

    for (const msg of messages) {
      const parsed = await simpleParser(msg.source, {
        skipImageLinks: true,
        skipHtmlToText: true,
        maxHtmlLengthToParse: 1_000_000,
      });
      const sender = parsed.from?.value?.[0]?.address?.trim().toLowerCase() ?? "";
      if (!trustedSenders.includes(sender)) continue;

      if (!checkEmailAuth(parsed)) {
        console.warn(`[Payment] Skipped email from ${sender}: failed SPF/DKIM.`);
        continue;
      }

      const subject = parsed.subject ?? "";
      const htmlText = typeof parsed.html === "string" ? stripHtml(parsed.html) : "";
      const body = `${subject} ${parsed.text ?? ""} ${htmlText}`;

      if (config.upiName) {
        const safeUpiName = config.upiName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        const safeBody = body.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        if (safeUpiName.length > 3 && !safeBody.includes(safeUpiName)) {
          continue;
        }
      }

      const emailUTR = extractUTR(body);
      if (!emailUTR || normalizeUTR(emailUTR) !== normalizeUTR(targetUTR)) continue;
      const emailAmount = extractAmount(body);

      if (emailAmount !== null && emailAmount === targetAmount) {
        matchedUid = msg.uid;
        finalMatch = {
          messageId: String(msg.uid),
          sender,
          utrNumber: emailUTR,
          amount: emailAmount,
        };
        break;
      }
      if (emailAmount !== null) mismatch = { emailAmount, sender };
    }

    if (matchedUid && finalMatch) {
      await client.messageFlagsAdd(matchedUid, ["\\Seen"], { uid: true });
      try {
        await client.messageMove(matchedUid, IMAP_FOLDER_PROCESSED, { uid: true });
      } catch {
        try {
          await client.mailboxCreate(IMAP_FOLDER_PROCESSED);
          await client.messageMove(matchedUid, IMAP_FOLDER_PROCESSED, { uid: true });
        } catch {
          // Fallback to archiving if mailbox creation fails
          try {
            await client.messageMove(matchedUid, "[Gmail]/All Mail", { uid: true });
          } catch {
            console.warn("[Payment] Email remains in INBOX, move failed.");
          }
        }
      }
      return { type: "match", match: finalMatch };
    }

    return mismatch ? { type: "amount_mismatch", ...mismatch } : { type: "not_found" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown IMAP error";
    throw new Error(`IMAP verification failed: ${message}`);
  } finally {
    lock?.release();
    if (client.usable) await client.logout().catch(() => client.close());
    else client.close();
  }
}

// ─── Test IMAP Connection ─────────────────────────────────────────────────

export async function testImapConnection(
  gmailEmail: string,
  gmailAppPassword: string
): Promise<{ success: boolean; error?: string }> {
  const client = createImapClient(gmailEmail, gmailAppPassword, true);
  try {
    await client.connect();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "IMAP connection failed" };
  } finally {
    if (client.usable) await client.logout().catch(() => client.close());
    else client.close();
  }
}

function createImapClient(user: string, pass: string, verifyOnly = false) {
  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    verifyOnly,
    logger: false,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    maxLiteralSize: 4 * 1024 * 1024,
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });
  client.on("error", (err) => {
    console.error("[IMAP Client Error] Error event:", err);
  });
  return client;
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

// ─── Distributed Lock Sync Throttling ────────────────────────────────────────

export async function triggerAutonomousSyncIfNeeded(config?: PaymentConfig) {
  const now = new Date();
  const thirtySecondsAgo = new Date(Date.now() - 30_000);

  try {
    const shouldSync = await db.transaction(async (tx) => {
      const [cfg] = await tx
        .select({ lastSyncAt: paymentConfig.lastSyncAt })
        .from(paymentConfig)
        .where(eq(paymentConfig.id, "default"))
        .for("update")
        .limit(1);

      if (cfg && cfg.lastSyncAt && cfg.lastSyncAt >= thirtySecondsAgo) {
        return false;
      }

      await tx
        .update(paymentConfig)
        .set({ lastSyncAt: now })
        .where(eq(paymentConfig.id, "default"));

      return true;
    });

    if (shouldSync) {
      syncPaymentEmails(config).catch((err) =>
        console.error("[AutonomousSync] Background sync error:", err)
      );
    }
  } catch (err) {
    console.error("[AutonomousSync] Failed to evaluate lock:", err);
  }
}

// ─── Background Email Ingestion Worker ─────────────────────────────────────

export async function syncPaymentEmails(passedConfig?: PaymentConfig): Promise<number> {
  const config = passedConfig || (await getPaymentConfig());
  if (!config || !config.enabled || !config.gmailEmail || !config.gmailAppPassword) {
    return 0;
  }
  const trustedSenders = config.trustedSenders
    .map((sender) => sender.trim().toLowerCase())
    .filter(Boolean);
  if (trustedSenders.length === 0) return 0;

  const client = createImapClient(config.gmailEmail, config.gmailAppPassword);
  let lock: Awaited<ReturnType<ImapFlow["getMailboxLock"]>> | undefined;
  let syncedCount = 0;

  try {
    await client.connect();
    lock = await client.getMailboxLock("INBOX");
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - config.checkDays);
    const senderCriteria = trustedSenders.map((from) => ({ from }));
    const senderFilter = buildOrSearch(senderCriteria);

    // CRITICAL BUSINESS RULE: Only search unread emails (seen: false).
    // This prevents reprocessing/re-claiming of already sync'd or manually read payments.
    // Do NOT remove or change seen: false to include read/seen emails.
    const ids = await client.search(
      { seen: false, since: sinceDate, ...senderFilter },
      { uid: true }
    );
    if (!ids || ids.length === 0) return 0;

    const messages: { uid: number; source: Buffer }[] = [];
    const fetchIterator = client.fetch(
      ids,
      { uid: true, source: { maxLength: 2 * 1024 * 1024 } },
      { uid: true }
    );

    try {
      for await (const message of fetchIterator) {
        if (message.uid && message.source) {
          messages.push({ uid: message.uid, source: message.source });
        }
      }
    } catch (fetchErr) {
      await fetchIterator.return?.();
      throw fetchErr;
    }

    const processedUids: number[] = [];

    for (const msg of messages) {
      const parsed = await simpleParser(msg.source, {
        skipImageLinks: true,
        skipHtmlToText: true,
        maxHtmlLengthToParse: 1_000_000,
      });
      const sender = parsed.from?.value?.[0]?.address?.trim().toLowerCase() ?? "";
      if (!trustedSenders.includes(sender)) continue;

      if (!checkEmailAuth(parsed)) {
        console.warn(`[PaymentSync] SPF/DKIM check failed for email UID ${msg.uid} from ${sender}`);
        continue;
      }

      const subject = parsed.subject ?? "";
      const htmlText = typeof parsed.html === "string" ? stripHtml(parsed.html) : "";
      const body = `${subject} ${parsed.text ?? ""} ${htmlText}`;

      if (config.upiName) {
        const safeUpiName = config.upiName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        const safeBody = body.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        if (safeUpiName.length > 3 && !safeBody.includes(safeUpiName)) {
          continue;
        }
      }

      const emailUTR = extractUTR(body);
      const emailAmount = extractAmount(body);

      if (emailUTR !== null && emailAmount !== null) {
        const cleanUTR = normalizeUTR(emailUTR);
        const utrHashed = hashUTR(cleanUTR);
        const encryptedPayload = encryptPaymentPayload({
          utr: cleanUTR,
          amount: emailAmount,
          sender,
          emailMessageId: String(msg.uid),
        });

        try {
          const inserted = await db
            .insert(paymentEmailInbox)
            .values({
              utrHash: utrHashed,
              amount: emailAmount,
              encryptedData: encryptedPayload,
              emailMessageId: String(msg.uid),
              receivedAt: new Date(),
            })
            .onConflictDoNothing()
            .returning({ id: paymentEmailInbox.id });

          if (inserted.length > 0) {
            syncedCount++;
          }
          processedUids.push(msg.uid);
        } catch (e) {
          console.error("[PaymentSync] Error inserting inbox row:", e);
        }
      }
    }

    // Perform message flag/move operations safely outside the fetch loop
    for (const uid of processedUids) {
      try {
        await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
        try {
          await client.messageMove(uid, IMAP_FOLDER_PROCESSED, { uid: true });
        } catch {
          try {
            await client.mailboxCreate(IMAP_FOLDER_PROCESSED);
            await client.messageMove(uid, IMAP_FOLDER_PROCESSED, { uid: true });
          } catch (moveErr) {
            console.error(`[PaymentSync] Failed to move email UID ${uid} to ${IMAP_FOLDER_PROCESSED}:`, moveErr);
          }
        }
      } catch (flagErr) {
        console.error(`[PaymentSync] Failed to set Seen flag for email UID ${uid}:`, flagErr);
      }
    }

    // DATA LIFECYCLE: Cleanup old claimed (>30 days) or unclaimed (>60 days) records
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    await db
      .delete(paymentEmailInbox)
      .where(
        or(
          and(eq(paymentEmailInbox.isClaimed, true), lt(paymentEmailInbox.claimedAt, thirtyDaysAgo)),
          lt(paymentEmailInbox.receivedAt, sixtyDaysAgo)
        )
      );

  } catch (err) {
    console.error("[PaymentSync] IMAP sync failed:", err);
  } finally {
    lock?.release();
    if (client.usable) await client.logout().catch(() => client.close());
    else client.close();
  }

  return syncedCount;
}

// ─── Main Verification Function (Zero Cron & Advisory Lock & Claims) ───────

export async function verifyAndCreditPayment(
  params: VerifyPaymentParams
): Promise<VerifyPaymentResult> {
  const { userId, utrNumber, amount, ipAddress } = params;

  const cleanUTR = normalizeUTR(utrNumber);
  const utrHashed = hashUTR(cleanUTR);

  // Trigger autonomous background sync if throttle allows
  triggerAutonomousSyncIfNeeded();

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
  if (!config.gmailEmail || !config.gmailAppPassword) {
    return { success: false, error: "Payment system is not configured. Contact admin." };
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
    // ── STEP A: FAST INSTANT DATABASE LOOKUP (Atomically claim) ─────────────
    let matchedInboxItem = await db.transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(paymentEmailInbox)
        .where(
          and(
            eq(paymentEmailInbox.utrHash, utrHashed),
            eq(paymentEmailInbox.isClaimed, false)
          )
        )
        .for("update")
        .limit(1);

      if (!item) return null;

      await tx
        .update(paymentEmailInbox)
        .set({
          isClaimed: true,
          claimedAt: new Date(),
          claimedByUserId: userId,
        })
        .where(eq(paymentEmailInbox.id, item.id));

      return item;
    });

    // ── STEP B: FALLBACK SYNC IF NOT IN PRE-PARSED INBOX ───────────────────
    if (!matchedInboxItem) {
      await syncPaymentEmails(config);

      matchedInboxItem = await db.transaction(async (tx) => {
        const [item] = await tx
          .select()
          .from(paymentEmailInbox)
          .where(
            and(
              eq(paymentEmailInbox.utrHash, utrHashed),
              eq(paymentEmailInbox.isClaimed, false)
            )
          )
          .for("update")
          .limit(1);

        if (!item) return null;

        await tx
          .update(paymentEmailInbox)
          .set({
            isClaimed: true,
            claimedAt: new Date(),
            claimedByUserId: userId,
          })
          .where(eq(paymentEmailInbox.id, item.id));

        return item;
      });
    }

    // ── STEP C: EVALUATE RESULT ───────────────────────────────────────────
    if (!matchedInboxItem) {
      const emailResult = await findPaymentEmail(config, cleanUTR, amount);

      if (emailResult.type === "amount_mismatch") {
        await db
          .update(paymentVerification)
          .set({
            status: "amount_mismatch",
            emailSender: emailResult.sender,
            failReason: `UTR found but email shows ₹${emailResult.emailAmount}, user claimed ₹${amount}`,
          })
          .where(eq(paymentVerification.id, pendingRow.id));
        return {
          success: false,
          error: "Payment verification failed. Please check the UTR number and ensure you entered the exact amount paid.",
        };
      }

      await db
        .update(paymentVerification)
        .set({
          status: "email_not_found",
          failReason: "No matching unread email found for UTR + amount combination",
        })
        .where(eq(paymentVerification.id, pendingRow.id));
      return {
        success: false,
        error: "Payment not found. Please check the UTR number and amount. If paid recently, wait 2–3 minutes and try again.",
      };
    }

    // Check amount match
    if (matchedInboxItem.amount !== amount) {
      // Revert atomically claimed state
      await db
        .update(paymentEmailInbox)
        .set({
          isClaimed: false,
          claimedAt: null,
          claimedByUserId: null,
        })
        .where(eq(paymentEmailInbox.id, matchedInboxItem.id));

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
      // Revert atomically claimed state if wallet credit failed
      await db
        .update(paymentEmailInbox)
        .set({
          isClaimed: false,
          claimedAt: null,
          claimedByUserId: null,
        })
        .where(eq(paymentEmailInbox.id, matchedInboxItem.id));

      return { success: false, error: "This UTR number has already been used." };
    }

    // ── STEP E: PERSIST FINAL CLAIMED & VERIFIED STATUS (SCRUB ENCRYPTED DATA)
    await db.transaction(async (tx) => {
      // Scrub raw encrypted email details to blank in inbox log to respect retention policy
      await tx
        .update(paymentEmailInbox)
        .set({
          encryptedData: "",
          isClaimed: true,
        })
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
    // Revert claimed state on unexpected errors
    try {
      await db
        .update(paymentEmailInbox)
        .set({
          isClaimed: false,
          claimedAt: null,
          claimedByUserId: null,
        })
        .where(eq(paymentEmailInbox.utrHash, utrHashed));
    } catch (revertErr) {
      console.error("[PaymentVerify] Fatal: Revert claimed state failed:", revertErr);
    }

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
