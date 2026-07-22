import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { paymentConfig, paymentEmailInbox } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import crypto from "crypto";

export const maxDuration = 60;

function checkEmailAuth(parsed: any, logs: string[]): boolean {
  const rawHeader = parsed.headers.get("authentication-results");
  if (!rawHeader) {
    logs.push("checkEmailAuth: authentication-results header is missing!");
    return false;
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
    logs.push("checkEmailAuth: parsed header value is empty!");
    return false;
  }
  const spfPass  = /\bspf=pass\b/.test(authStr);
  const dkimPass = /\bdkim=pass\b/.test(authStr);
  logs.push(`checkEmailAuth: SPF=${spfPass}, DKIM=${dkimPass}, headerSnippet="${authStr.slice(0, 100)}"`);
  return spfPass && dkimPass;
}

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

function isCreditTransaction(body: string): boolean {
  const lower = body.toLowerCase();
  const creditWords = /\b(credited|received|credited to|got|payment received|deposited)\b/;
  const debitWords = /\b(debited|sent|paid to|transferred|payment sent|debited from|paid to\s)/;
  if (debitWords.test(lower) && !creditWords.test(lower)) return false;
  if (creditWords.test(lower)) return true;
  return false;
}

function buildOrSearch(criteria: Array<Record<string, unknown>>): Record<string, unknown> {
  if (criteria.length === 0) throw new Error("buildOrSearch: empty array");
  if (criteria.length === 1) return criteria[0];
  return { or: [criteria[0], buildOrSearch(criteria.slice(1))] };
}

export async function GET(req: NextRequest) {
  const logs: string[] = [];
  logs.push("Starting sync debug endpoint...");

  try {
    const [config] = await db
      .select()
      .from(paymentConfig)
      .where(eq(paymentConfig.id, "default"))
      .limit(1);

    if (!config) {
      logs.push("No config found");
      return NextResponse.json({ logs });
    }

    logs.push(`Config found: checkDays=${config.checkDays}, upiName="${config.upiName}"`);

    const trustedSenders = JSON.parse(config.trustedSenders || "[]") as string[];
    if (trustedSenders.length === 0) {
      logs.push("No trusted senders configured");
      return NextResponse.json({ logs });
    }

    logs.push("Connecting to IMAP...");
    const client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: { user: config.gmailEmail, pass: config.gmailAppPassword },
      logger: false,
    });

    await client.connect();
    logs.push("IMAP Connected");

    const lock = await client.getMailboxLock("INBOX");
    logs.push("Mailbox Lock Acquired");

    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - config.checkDays);
      const senderCriteria = trustedSenders.map((from) => ({ from }));
      const senderFilter = buildOrSearch(senderCriteria);

      logs.push(`Searching unread emails since: ${sinceDate.toISOString()}`);
      const ids = await client.search(
        { seen: false, since: sinceDate, ...senderFilter }
      );
      logs.push(`Unread IDs found: ${JSON.stringify(ids)}`);

      if (!ids || ids.length === 0) {
        logs.push("No unread emails match the search filter");
        return NextResponse.json({ logs });
      }

      const fetchIterator = client.fetch(
        ids,
        { uid: true, source: { maxLength: 2 * 1024 * 1024 } },
        { uid: true }
      );

      const messages: any[] = [];
      for await (const message of fetchIterator) {
        if (message.uid && message.source) {
          messages.push(message);
        }
      }
      logs.push(`Fetched ${messages.length} messages`);

      for (const msg of messages) {
        logs.push(`\n--- Processing Message UID ${msg.uid} ---`);
        const parsed = await simpleParser(msg.source, {
          skipImageLinks: true,
          skipHtmlToText: true,
          maxHtmlLengthToParse: 1_000_000,
        });

        const sender = parsed.from?.value?.[0]?.address?.trim().toLowerCase() ?? "";
        logs.push(`Sender: "${sender}"`);

        if (!checkEmailAuth(parsed, logs)) {
          logs.push("SPF/DKIM verification FAILED for this message!");
          continue;
        }
        logs.push("SPF/DKIM verification PASSED");

        const subject = parsed.subject ?? "";
        const htmlText = typeof parsed.html === "string" ? stripHtml(parsed.html) : "";
        const body = `${subject} ${parsed.text ?? ""} ${htmlText}`;

        if (!isCreditTransaction(body)) {
          logs.push("Skipping debit/sent transaction email");
          continue;
        }
        logs.push("Credit/received transaction detected");

        if (config.upiName) {
          const safeUpiName = config.upiName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
          const safeBody = body.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
          const upiPassed = safeUpiName.length > 3 && safeBody.includes(safeUpiName);
          logs.push(`UPI Name check: safeUpiName="${safeUpiName}", contains=${upiPassed}`);
          if (!upiPassed) {
            logs.push("UPI Name check FAILED!");
            continue;
          }
        }

        const emailUTR = extractUTR(body);
        const emailAmount = extractAmount(body);
        logs.push(`Extracted UTR: "${emailUTR}", Amount: ${emailAmount}`);

        if (emailUTR !== null && emailAmount !== null) {
          // Verify insert behavior
          logs.push(`Will attempt DB insertion for UTR "${emailUTR}"`);
          
          // Compute hash using better-auth secret
          const secret = process.env.BETTER_AUTH_SECRET || "";
          const hmacKey = crypto.createHmac("sha256", secret).update("payment-hmac-key-v1").digest();
          const utrHashed = crypto.createHmac("sha256", hmacKey).update(emailUTR.trim().toUpperCase()).digest("hex");
          
          logs.push(`Computed Hash: ${utrHashed}`);
          
          // Let's dry run the insert
          try {
            const inserted = await db
              .insert(paymentEmailInbox)
              .values({
                utrHash: utrHashed,
                amount: emailAmount,
                encryptedData: "dry-run",
                emailMessageId: String(msg.uid),
                receivedAt: new Date(),
              })
              .onConflictDoNothing()
              .returning({ id: paymentEmailInbox.id });
              
            logs.push(`DB Insert status: ${inserted.length > 0 ? 'Inserted successfully' : 'Skipped (Conflict/Already Exists)'}`);
          } catch (dbErr: any) {
            logs.push(`DB Insert Error: ${dbErr.message || dbErr}`);
          }
        } else {
          logs.push("UTR or Amount parsing failed (null value)");
        }
      }

    } finally {
      lock.release();
      logs.push("Mailbox Lock Released");
    }

    await client.logout().catch(() => {});
    logs.push("IMAP Logged Out");

  } catch (err: any) {
    logs.push(`Fatal Error: ${err.message || err}`);
  }

  return NextResponse.json({ logs });
}
