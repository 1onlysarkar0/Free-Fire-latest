import "server-only";
import { z } from "zod";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { db } from "@/db/drizzle";
import { paymentConfig, paymentVerification } from "@/db/schema";
import { creditWallet } from "@/lib/wallet";
import { eq, and, gte, sql } from "drizzle-orm";

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

// ─── Get Payment Config (full — server only) ──────────────────────────────

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

// ─── Get Public Payment Config (no credentials) ───────────────────────────

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

// ─── Rate Limit Check ─────────────────────────────────────────────────────

export async function checkRateLimit(userId: string, ipAddress: string): Promise<boolean> {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  
  // Check user attempts
  const recentUserAttempts = await db
    .select({ id: paymentVerification.id })
    .from(paymentVerification)
    .where(
      and(
        eq(paymentVerification.userId, userId),
        gte(paymentVerification.createdAt, fifteenMinutesAgo)
      )
    );
    
  // Check IP attempts
  const recentIpAttempts = await db
    .select({ id: paymentVerification.id })
    .from(paymentVerification)
    .where(
      and(
        eq(paymentVerification.ipAddress, ipAddress),
        gte(paymentVerification.createdAt, fifteenMinutesAgo)
      )
    );

  return recentUserAttempts.length < 5 && recentIpAttempts.length < 10;
}

// ─── UTR Duplicate Check ──────────────────────────────────────────────────

export async function isUTRAlreadyUsed(utrNumber: string): Promise<boolean> {
  const existing = await db
    .select({ id: paymentVerification.id })
    .from(paymentVerification)
    .where(
      and(
        eq(paymentVerification.utrNumber, utrNumber),
        eq(paymentVerification.status, "verified")
      )
    )
    .limit(1);
  return existing.length > 0;
}

// ─── Input Validation ────────────────────────────────────────────────────

export function validateUTR(utr: string): boolean {
  // NPCI UTRs are 12 numeric digits; bank ref numbers may be alphanumeric and up to 22 chars.
  // Minimum raised to 10 to prevent trivially short guesses.
  return /^[A-Za-z0-9]{10,22}$/.test(utr.trim());
}

export function validateAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount >= 1 && amount <= 50000;
}

// ─── UTR Extraction from Email Body ──────────────────────────────────────

function extractUTR(text: string): string | null {
  const patterns = [
    /UPI\s*[/\\]\s*([A-Za-z0-9]{10,22})\s*[/\\]/i,          // UPI/123456789012/
    /UPI\s+Ref(?:erence)?(?:\s+No\.?)?[:\s]+([A-Za-z0-9]{10,22})/i,
    /UTR[:\s#]+([A-Za-z0-9]{10,22})/i,
    /Ref(?:erence)?\s*(?:No\.?|#)[:\s]+([A-Za-z0-9]{10,22})/i,
    /Transaction\s*(?:ID|Id|Ref)[:\s#]+([A-Za-z0-9]{10,22})/i,
    /Txn\s*(?:ID|Id)[:\s#]+([A-Za-z0-9]{10,22})/i,
    /\b([0-9]{12})\b/,  // bare 12-digit number (fallback — apply last)
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const candidate = m[1].trim();
      // Reject obvious false positives: pure date-like strings, phone numbers
      if (/^[0-9]{10}$/.test(candidate)) continue; // 10-digit phone number
      return candidate;
    }
  }
  return null;
}

// ─── Amount Extraction from Email Body ───────────────────────────────────

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

/** Build a nested binary OR tree from an array of IMAP search criteria.
 *  ImapFlow's `or` key MUST receive exactly [criteriaA, criteriaB].
 *  For N senders we nest: { or: [sender0, { or: [sender1, { or: [...] }] }] }
 */
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

function checkEmailAuth(parsed: { headers: Map<string, unknown> }): boolean {
  const rawHeader = parsed.headers.get("authentication-results");
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
    // Header absent — Gmail delivered it through its own MX so it's
    // already authenticated. Treat as pass to avoid false rejections.
    // If you want strict mode, return false here instead.
    return true;
  }
  const spfPass  = /\bspf=pass\b/.test(authStr);
  const dkimPass = /\bdkim=pass\b/.test(authStr);
  return spfPass && dkimPass;
}

// ─── Gmail IMAP Search ────────────────────────────────────────────────────

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

    const ids = await client.search(
      { seen: false, since: sinceDate, ...senderFilter },
      { uid: true }
    );
    if (!ids || ids.length === 0) return { type: "not_found" };

    let mismatch: { emailAmount: number; sender: string } | null = null;
    let matchedUid: number | null = null;
    let finalMatch: EmailMatch | null = null;

    const fetchIterator = client.fetch(
      ids,
      { uid: true, source: { maxLength: 2 * 1024 * 1024 } },
      { uid: true }
    );

    try {
      for await (const message of fetchIterator) {
        if (!message.source) continue;
        const parsed = await simpleParser(message.source, {
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

        // 2. Validate receiver UPI Name (if configured)
        if (config.upiName) {
          const safeUpiName = config.upiName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
          const safeBody = body.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
          if (safeUpiName.length > 3 && !safeBody.includes(safeUpiName)) {
            continue;
          }
        }

        const emailUTR = extractUTR(body);
        if (!emailUTR || emailUTR.toLowerCase() !== targetUTR.toLowerCase()) continue;
        const emailAmount = extractAmount(body);

        if (emailAmount !== null && emailAmount === targetAmount) {
          matchedUid = message.uid;
          finalMatch = {
            messageId: String(message.uid),
            sender,
            utrNumber: emailUTR,
            amount: emailAmount,
          };
          break; // Stop fetching, we found it!
        }
        if (emailAmount !== null) mismatch = { emailAmount, sender };
      }
    } catch (fetchErr) {
      // Ensure iterator is closed before rethrowing
      await fetchIterator.return?.();
      throw fetchErr;
    }

    if (matchedUid && finalMatch) {
      // Perform mutations OUTSIDE the fetch stream
      await client.messageFlagsAdd(matchedUid, ["\\Seen"], { uid: true });
      
      try {
        await client.messageMove(matchedUid, "Free Fire", { uid: true });
      } catch {
        try {
          await client.mailboxCreate("Free Fire");
          await client.messageMove(matchedUid, "Free Fire", { uid: true });
        } catch {
          // Fallback to archiving if Free Fire creation fails
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
  return new ImapFlow({
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
}

// Advisory lock: hash the UTR to a 64-bit int.
// This serialises concurrent requests for the same UTR across all instances.
async function acquireUTRLock(utr: string): Promise<void> {
  // pg_try_advisory_xact_lock is scoped to the current transaction
  // We use a session-level lock here since we don't have a transaction wrapper.
  const lockKey = hashUTR(utr);
  await db.execute(
    sql`SELECT pg_advisory_lock(${lockKey})`
  );
}

async function releaseUTRLock(utr: string): Promise<void> {
  const lockKey = hashUTR(utr);
  await db.execute(
    sql`SELECT pg_advisory_unlock(${lockKey})`
  );
}

function hashUTR(utr: string): number {
  // Simple stable 32-bit hash so we stay within pg_advisory_lock's int range
  let h = 0x811c9dc5;
  for (let i = 0; i < utr.length; i++) {
    h ^= utr.charCodeAt(i);
    h = (Math.imul(h, 0x01000193) | 0) >>> 0;
  }
  // Ensure it's a positive 32-bit int
  return h & 0x7fffffff;
}

// ─── Main Verification Function ──────────────────────────────────────────

export async function verifyAndCreditPayment(
  params: VerifyPaymentParams
): Promise<VerifyPaymentResult> {
  const { userId, utrNumber, amount, ipAddress } = params;

  const cleanUTR = utrNumber.trim().toUpperCase();

  // 1. validateUTR / validateAmount (no DB)
  if (!validateUTR(cleanUTR)) {
    return { success: false, error: "Invalid UTR/Reference number format." };
  }
  if (!validateAmount(amount)) {
    return { success: false, error: "Amount must be between ₹1 and ₹50,000." };
  }

  // 2. isUTRAlreadyUsed (cheap read)
  const alreadyUsed = await isUTRAlreadyUsed(cleanUTR);
  if (alreadyUsed) {
    await db.insert(paymentVerification).values({
      userId,
      claimedAmount: amount,
      utrNumber: cleanUTR,
      status: "duplicate_utr",
      ipAddress,
      failReason: "UTR already used in a previous verified payment",
    });
    return { success: false, error: "This UTR number has already been used." };
  }

  // 3. getPaymentConfig / enabled check (cheap read)
  const config = await getPaymentConfig();
  if (!config || !config.enabled) {
    return {
      success: false,
      error: "Payment verification is not available right now.",
    };
  }
  if (!config.gmailEmail || !config.gmailAppPassword) {
    return {
      success: false,
      error: "Payment system is not configured. Contact admin.",
    };
  }
  if (config.trustedSenders.length === 0) {
    return {
      success: false,
      error: "Payment system is not configured. Contact admin.",
    };
  }

  // 4. INSERT pending row (audit anchor)
  const [pendingRow] = await db
    .insert(paymentVerification)
    .values({
      userId,
      claimedAmount: amount,
      utrNumber: cleanUTR,
      status: "pending",
      ipAddress,
    })
    .returning({ id: paymentVerification.id });

  // 5. checkRateLimit (now with audit, update pending on fail)
  const withinLimit = await checkRateLimit(userId, ipAddress);
  if (!withinLimit) {
    await db
      .update(paymentVerification)
      .set({ status: "failed", failReason: "Rate limit exceeded" })
      .where(eq(paymentVerification.id, pendingRow.id));
    return {
      success: false,
      error: "Too many verification attempts. Please wait 15 minutes.",
    };
  }

  // 6. acquireUTRLock
  await acquireUTRLock(cleanUTR);
  try {
    // 7. findPaymentEmail
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
        // Obscured error: do not reveal the exact email amount to prevent guessing
        error: "Payment verification failed. Please check the UTR number and ensure you entered the exact amount paid.",
      };
    }

    if (emailResult.type === "not_found") {
      await db
        .update(paymentVerification)
        .set({
          status: "email_not_found",
          failReason: "No matching unread email found for UTR + amount combination",
        })
        .where(eq(paymentVerification.id, pendingRow.id));
      return {
        success: false,
        error:
          "Payment not found. Please check the UTR number and amount. If paid recently, wait 2–3 minutes and try again.",
      };
    }

    // emailResult.type === "match"
    const emailMatch = emailResult.match;

    // 8. creditWallet
    const creditResult = await creditWallet({
      userId,
      amount,
      type: "UPI_DEPOSIT",
      referenceId: cleanUTR,
      description: `Wallet top-up via UPI (UTR: ${cleanUTR})`,
      idempotencyKey: `upi-deposit-${cleanUTR}`,
    });

    if (!creditResult.success) {
      // Idempotency key collision means this UTR was already credited by a
      // concurrent request that beat us here. Log as duplicate and bail.
      await db
        .update(paymentVerification)
        .set({
          status: "duplicate_utr",
          failReason: "Concurrent request already credited this UTR",
          emailMessageId: emailMatch.messageId,
          emailSender: emailMatch.sender,
        })
        .where(eq(paymentVerification.id, pendingRow.id));
      return { success: false, error: "This UTR number has already been used." };
    }

    await db
      .update(paymentVerification)
      .set({
        status: "verified",
        verifiedAmount: emailMatch.amount,
        emailMessageId: emailMatch.messageId,
        emailSender: emailMatch.sender,
        verifiedAt: new Date(),
      })
      .where(eq(paymentVerification.id, pendingRow.id));

    return { success: true, creditedAmount: amount };
  } catch (err) {
    await db
      .update(paymentVerification)
      .set({
        status: "failed",
        failReason: `Error: ${err instanceof Error ? err.message : "Unknown"}`,
      })
      .where(eq(paymentVerification.id, pendingRow.id));
    return {
      success: false,
      // Obscured error
      error: "Payment verification failed. Please try again or contact support.",
    };
  } finally {
    // 9. releaseUTRLock
    await releaseUTRLock(cleanUTR);
  }
}

