import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { paymentEmailInbox } from "@/db/schema";
import {
  getPaymentConfig,
  hashUTR,
  encryptPaymentPayload,
  extractUTR,
  extractAmount,
  stripHtml,
  normalizeUTR,
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

    // 2. Parse Incoming Email Payload
    const payload = await request.json();
    const { from, subject, body, html, text } = payload;

    const senderEmail = (typeof from === "string" ? from : from?.address || "")
      .trim()
      .toLowerCase();

    // 3. Load Payment Configuration
    const config = await getPaymentConfig();
    if (!config || !config.enabled) {
      return NextResponse.json(
        { success: false, error: "Payment verification system is disabled" },
        { status: 400 }
      );
    }

    // Verify Trusted Sender
    const trustedSenders = config.trustedSenders
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (trustedSenders.length > 0) {
      const isTrusted = trustedSenders.some((trusted) =>
        senderEmail.includes(trusted)
      );
      if (!isTrusted) {
        return NextResponse.json(
          { success: false, error: "Sender email is not in trusted senders list" },
          { status: 403 }
        );
      }
    }

    // 4. Combine Full Email Text
    const emailSubject = subject || "";
    const emailHtmlText = typeof html === "string" ? stripHtml(html) : "";
    const emailRawText = text || body || "";
    const fullContent = `${emailSubject} ${emailRawText} ${emailHtmlText}`;

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
