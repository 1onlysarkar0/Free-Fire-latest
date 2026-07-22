import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { paymentEmailInbox, user } from "@/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import {
  hashUTR,
  encryptPaymentPayload,
  decryptPaymentPayload,
} from "@/lib/payment";

export async function GET(request: NextRequest) {
  const adminUser = await requireAdminOrRole(request, "payment:view_verifications");
  if (adminUser instanceof Response) return adminUser;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      id: paymentEmailInbox.id,
      utrHash: paymentEmailInbox.utrHash,
      amount: paymentEmailInbox.amount,
      encryptedData: paymentEmailInbox.encryptedData,
      emailMessageId: paymentEmailInbox.emailMessageId,
      isClaimed: paymentEmailInbox.isClaimed,
      claimedByUserId: paymentEmailInbox.claimedByUserId,
      claimedUserName: user.name,
      claimedUserEmail: user.email,
      claimedAt: paymentEmailInbox.claimedAt,
      receivedAt: paymentEmailInbox.receivedAt,
    })
    .from(paymentEmailInbox)
    .leftJoin(user, eq(paymentEmailInbox.claimedByUserId, user.id))
    .orderBy(desc(paymentEmailInbox.receivedAt))
    .limit(limit)
    .offset(offset);

  const serialized = rows.map((row) => {
    const decrypted = decryptPaymentPayload(row.encryptedData);
    return {
      id: row.id,
      utrHash: row.utrHash,
      utrNumber: decrypted?.utr || "ENCRYPTED_UTR",
      amount: row.amount,
      sender: decrypted?.sender || "Direct Ingestion",
      emailMessageId: row.emailMessageId,
      isClaimed: row.isClaimed,
      claimedByUserId: row.claimedByUserId,
      claimedUserName: row.claimedUserName,
      claimedUserEmail: row.claimedUserEmail,
      claimedAt: row.claimedAt ? row.claimedAt.toISOString() : null,
      receivedAt: row.receivedAt.toISOString(),
    };
  });

  const [{ total }] = await db
    .select({ total: count() })
    .from(paymentEmailInbox);

  const totalPages = Math.ceil(Number(total) / limit);

  return NextResponse.json({
    success: true,
    data: serialized,
    page,
    limit,
    total: Number(total),
    totalPages,
  });
}

export async function POST(request: NextRequest) {
  const adminUser = await requireAdminOrRole(request, "payment:config_edit");
  if (adminUser instanceof Response) return adminUser;

  try {
    const body = await request.json();
    const { utrNumber, amount, sender } = body;

    if (!utrNumber || typeof utrNumber !== "string" || utrNumber.trim().length < 6) {
      return NextResponse.json(
        { success: false, error: "Invalid UTR/Reference number." },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 1 || numAmount > 500000) {
      return NextResponse.json(
        { success: false, error: "Amount must be a valid number between ₹1 and ₹500,000." },
        { status: 400 }
      );
    }

    const cleanUTR = utrNumber.trim().toUpperCase();
    const utrHashed = hashUTR(cleanUTR);
    const senderEmail = (sender || "manual@admin").trim().toLowerCase();

    const encryptedPayload = encryptPaymentPayload({
      utr: cleanUTR,
      amount: numAmount,
      sender: senderEmail,
      emailMessageId: "manual_entry",
    });

    const [inserted] = await db
      .insert(paymentEmailInbox)
      .values({
        utrHash: utrHashed,
        amount: numAmount,
        encryptedData: encryptedPayload,
        emailMessageId: "manual_entry",
        receivedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: paymentEmailInbox.id });

    if (!inserted) {
      return NextResponse.json(
        { success: false, error: "This UTR number already exists in the pre-parsed inbox." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "UTR entry manually added to inbox successfully.",
      id: inserted.id,
    });
  } catch (err) {
    console.error("[AdminPaymentInbox] Add Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to add UTR" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const adminUser = await requireAdminOrRole(request, "payment:config_edit");
  if (adminUser instanceof Response) return adminUser;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Inbox Item ID is required." },
        { status: 400 }
      );
    }

    await db.delete(paymentEmailInbox).where(eq(paymentEmailInbox.id, id));

    return NextResponse.json({
      success: true,
      message: "UTR entry deleted from inbox successfully.",
    });
  } catch (err) {
    console.error("[AdminPaymentInbox] Delete Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to delete UTR" },
      { status: 500 }
    );
  }
}
