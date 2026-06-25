import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { withdrawConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { withdrawConfigUpdateSchema } from "@/lib/schemas/admin";

export async function GET(req: NextRequest) {
  const adminUser = await requireAdminOrRole(req, "withdraw:view");
  if (adminUser instanceof Response) return adminUser;

  try {
    const [config] = await db
      .select()
      .from(withdrawConfig)
      .where(eq(withdrawConfig.id, "default"))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: config || { minWithdrawAmount: 50, dailyWithdrawLimit: 3, description: "", enabled: false },
    });
  } catch (err) {
    console.error("[API/admin/withdraw/config] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const adminUser = await requireAdminOrRole(req, "withdraw:config_edit");
  if (adminUser instanceof Response) return adminUser;

  try {
    const body = await req.json();
    const parsed = withdrawConfigUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.minWithdrawAmount !== undefined) updateData.minWithdrawAmount = parsed.data.minWithdrawAmount;
    if (parsed.data.dailyWithdrawLimit !== undefined) updateData.dailyWithdrawLimit = parsed.data.dailyWithdrawLimit;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.enabled !== undefined) updateData.enabled = parsed.data.enabled;

    await db
      .update(withdrawConfig)
      .set(updateData)
      .where(eq(withdrawConfig.id, "default"));

    return NextResponse.json({ success: true, message: "Withdrawal config updated." });
  } catch (err) {
    console.error("[API/admin/withdraw/config] PUT error:", err);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
