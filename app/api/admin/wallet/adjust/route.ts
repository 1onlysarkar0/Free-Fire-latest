import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { creditWallet, debitWallet, getOrCreateWallet } from "@/lib/wallet";
import { nanoid } from "nanoid";

import { walletAdjustmentSchema } from "@/lib/schemas/admin";

export async function POST(req: NextRequest) {
  const adminUser = await requireAdminOrRole(req, "wallet:adjust");
  if (adminUser instanceof Response) return adminUser;

  try {
    const body = await req.json();
    const parsed = walletAdjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const { userId, amount, action, description } = parsed.data;

    // Ensure wallet exists
    await getOrCreateWallet(userId);

    const idempotencyKey = `admin-${action}-${userId}-${nanoid()}`;

    if (action === "credit") {
      const result = await creditWallet({
        userId,
        amount,
        type: "ADMIN_CREDIT",
        description: description?.trim() || `Admin credit by ${adminUser.user.name ?? adminUser.user.id}`,
        performedByAdminId: adminUser.user.id,
        idempotencyKey,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, newBalance: result.newBalance, transactionId: result.transactionId });
    } else {
      const result = await debitWallet({
        userId,
        amount,
        type: "ADMIN_DEBIT",
        description: description?.trim() || `Admin debit by ${adminUser.user.name ?? adminUser.user.id}`,
        performedByAdminId: adminUser.user.id,
        idempotencyKey,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, newBalance: result.newBalance, transactionId: result.transactionId });
    }
  } catch (err) {
    console.error("[API/admin/wallet/adjust] POST:", err);
    return NextResponse.json({ error: "Failed to adjust wallet" }, { status: 500 });
  }
}
