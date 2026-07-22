import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { paymentEmailInbox } from "@/db/schema";
import { simpleParser } from "mailparser";
import {
  getPaymentConfig,
  hashUTR,
  encryptPaymentPayload,
  extractUTR,
  extractAmount,
  stripHtml,
  normalizeUTR,
  isCreditTransaction,
} from "@/lib/payment";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authorization Bearer Token
    const authHeader = request.headers.get("authorization");
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET || process.env.BETTER_AUTH_SECRET;

    if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Parse Incoming Payload from Cloudflare Worker
    const payload = await request.json();
    const { from, to, subject, raw, body, html, text } = payload;

    let senderEmail = (typeof from === "string" ? from : from?.address || "")
      .trim()
      .toLowerCase();

    let fullContent = `${subject || ""} ${text || body || ""} ${typeof html === "string" ? stripHtml(html) : ""}`;

    // 3. Robust MIME Parsing for raw email string if provided
    if (raw && typeof raw === "string" && raw.length > 0) {
      try {
        const parsedMime = await simpleParser(raw, {
          skipImageLinks: true,
          skipHtmlToText: true,
        });

        if (parsedMime.from?.value?.[0]?.address) {
          senderEmail = parsedMime.from.value[0].address.trim().toLowerCase();
        }

        const mimeSubject = parsedMime.subject || "";
        const mimeText = parsedMime.text || "";
        const mimeHtml = typeof parsedMime.html === "string" ? stripHtml(parsedMime.html) : "";

        fullContent = `${mimeSubject} ${mimeText} ${mimeHtml}`.trim();
        if (!fullContent) {
          fullContent = raw;
        }
      } catch (parseErr) {
        console.warn("[EmailWebhookIngest] Raw MIME parsing fallback:", parseErr);
        fullContent = `${fullContent} ${raw}`;
      }
    }

    // 4. Load Payment Configuration
    const config = await getPaymentConfig();
    if (!config || !config.enabled) {
      return NextResponse.json(
        { success: false, error: "Payment verification system is disabled" },
        { status: 400 }
      );
    }

    // 5. Verify Credit / Receive Transaction Type (Ignore Outgoing Debit/Paid Emails)
    if (!isCreditTransaction(fullContent)) {
      return NextResponse.json(
        {
          success: true,
          message: "Ignored outgoing DEBIT / PAID payment notification email",
        },
        { status: 200 }
      );
    }

    // 5. Verify UPI Name if Configured
    if (config.upiName) {
      const safeUpiName = config.upiName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const safeBody = fullContent.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      if (safeUpiName.length > 3 && !safeBody.includes(safeUpiName)) {
        return NextResponse.json(
          { success: false, error: "Email body does not match configured UPI name" },
          { status: 422 }
        );
      }
    }

    // 6. Extract UTR and Amount
    const rawUTR = extractUTR(fullContent);
    const amount = extractAmount(fullContent);

    if (!rawUTR || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not extract valid UTR or Amount from email body",
          extractedUTR: rawUTR,
          extractedAmount: amount,
        },
        { status: 422 }
      );
    }

    const cleanUTR = normalizeUTR(rawUTR);
    const utrHashed = hashUTR(cleanUTR);

    const encryptedPayload = encryptPaymentPayload({
      utr: cleanUTR,
      amount,
      sender: senderEmail,
      emailMessageId: `webhook_${Date.now()}`,
    });

    // 7. Insert into Inbox Table (Idempotent ON CONFLICT DO NOTHING)
    const [inserted] = await db
      .insert(paymentEmailInbox)
      .values({
        utrHash: utrHashed,
        amount,
        encryptedData: encryptedPayload,
        emailMessageId: `webhook_${Date.now()}`,
        receivedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: paymentEmailInbox.id });

    if (!inserted) {
      return NextResponse.json({
        success: true,
        message: "Duplicate UTR already ingested in inbox",
        utr: cleanUTR,
        amount,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Payment email ingested successfully via webhook",
      id: inserted.id,
      utr: cleanUTR,
      amount,
    });
  } catch (err) {
    console.error("[EmailWebhookIngest] Error processing email payload:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
