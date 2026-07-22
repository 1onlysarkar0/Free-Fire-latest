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
    const authHeader = request.headers.get("authorization") || "";
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET;

    if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await request.json();
    const { from, to, subject, raw, body, html, text, rcptTo, mailFrom, receivedAt, messageId } = payload || {};

    const senderEmail = (typeof from === "string" ? from : mailFrom || "")
      .trim()
      .toLowerCase();

    const safeSubject = typeof subject === "string" ? subject : "";
    const safeText = typeof text === "string" ? text : typeof body === "string" ? body : "";
    const safeHtml = typeof html === "string" ? stripHtml(html) : "";
    const safeRaw = typeof raw === "string" ? raw : "";

    let fullContent = `${safeSubject} ${safeText} ${safeHtml}`.trim();

    if (safeRaw) {
      try {
        const parsedMime = await simpleParser(safeRaw);

        const mimeSubject = parsedMime.subject || "";
        const mimeText = parsedMime.text || "";
        const mimeHtml = typeof parsedMime.html === "string" ? stripHtml(parsedMime.html) : "";

        fullContent = `${mimeSubject} ${mimeText} ${mimeHtml} ${safeRaw}`.trim();
      } catch {
        fullContent = `${fullContent} ${safeRaw}`.trim();
      }
    }

    if (!fullContent) {
      return NextResponse.json(
        { success: false, error: "Empty or unparseable email body received" },
        { status: 400 }
      );
    }

    const config = await getPaymentConfig();
    if (!config || !config.enabled) {
      return NextResponse.json(
        { success: false, error: "Payment verification system is disabled" },
        { status: 400 }
      );
    }

    if (!isCreditTransaction(fullContent)) {
      return NextResponse.json(
        { success: true, message: "Ignored outgoing debit/paid email" },
        { status: 200 }
      );
    }

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

    const rawUTR = extractUTR(fullContent);
    const amount = extractAmount(fullContent);

    if (!rawUTR || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not extract valid UTR or amount",
          extractedUTR: rawUTR,
          extractedAmount: amount,
        },
        { status: 422 }
      );
    }

    const cleanUTR = normalizeUTR(rawUTR);
    const utrHashed = hashUTR(cleanUTR);
    const safeMessageId = typeof messageId === "string" && messageId ? messageId : `webhook_${cleanUTR}_${amount}`;
    const receivedDate = receivedAt && !Number.isNaN(Date.parse(receivedAt)) ? new Date(receivedAt) : new Date();

    const encryptedPayload = encryptPaymentPayload({
      utr: cleanUTR,
      amount,
      sender: senderEmail,
      emailMessageId: safeMessageId,
    });

    const [inserted] = await db
      .insert(paymentEmailInbox)
      .values({
        utrHash: utrHashed,
        amount,
        encryptedData: encryptedPayload,
        emailMessageId: safeMessageId,
        receivedAt: receivedDate,
      })
      .onConflictDoNothing()
      .returning({ id: paymentEmailInbox.id });

    if (!inserted) {
      return NextResponse.json({
        success: true,
        message: "Duplicate UTR already exists in inbox",
        utr: cleanUTR,
        amount,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Payment email ingested successfully",
      id: inserted.id,
      utr: cleanUTR,
      amount,
    });
  } catch (err) {
    console.error("[EmailWebhookIngest] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
