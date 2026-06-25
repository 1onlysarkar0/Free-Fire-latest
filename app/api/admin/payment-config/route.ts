import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { paymentConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  gmailEmail: z.string().email("Invalid Gmail address"),
  gmailAppPassword: z.string().max(64),
  trustedSenders: z
    .array(z.string().email("Each trusted sender must be a valid email"))
    .max(10),
  checkDays: z.number().int().min(1).max(7),
  upiId: z.string().max(50),
  upiName: z.string().max(100),
  pageContent: z.string().max(5000),
  enabled: z.boolean(),
});

export async function GET(request: NextRequest) {
  const adminUser = await requireAdminOrRole(request, "payment:config_edit");
  if (adminUser instanceof Response) return adminUser;

  const rows = await db
    .select()
    .from(paymentConfig)
    .where(eq(paymentConfig.id, "default"))
    .limit(1);

  if (!rows.length) {
    return NextResponse.json({ error: "Payment config not found" }, { status: 404 });
  }

  const row = rows[0];
  return NextResponse.json({
    success: true,
    data: {
      gmailEmail: row.gmailEmail,
      gmailAppPassword: row.gmailAppPassword ? "••••••••" : "",
      trustedSenders: JSON.parse(row.trustedSenders || "[]"),
      checkDays: row.checkDays,
      upiId: row.upiId,
      upiName: row.upiName,
      pageContent: row.pageContent,
      enabled: row.enabled,
      updatedAt: row.updatedAt,
    },
  });
}

export async function PUT(request: NextRequest) {
  const adminUser = await requireAdminOrRole(request, "payment:config_edit");
  if (adminUser instanceof Response) return adminUser;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    gmailEmail,
    gmailAppPassword,
    trustedSenders,
    checkDays,
    upiId,
    upiName,
    pageContent,
    enabled,
  } = parsed.data;

  const existing = await db
    .select({ id: paymentConfig.id, gmailAppPassword: paymentConfig.gmailAppPassword })
    .from(paymentConfig)
    .where(eq(paymentConfig.id, "default"))
    .limit(1);

  const keepExistingPassword =
    !gmailAppPassword || gmailAppPassword === "••••••••";
  const finalPassword =
    keepExistingPassword && existing[0]
      ? existing[0].gmailAppPassword
      : gmailAppPassword;

  if (existing.length === 0) {
    await db.insert(paymentConfig).values({
      id: "default",
      gmailEmail,
      gmailAppPassword: finalPassword,
      trustedSenders: JSON.stringify(trustedSenders),
      checkDays,
      upiId,
      upiName,
      pageContent,
      enabled,
      updatedAt: new Date(),
    });
  } else {
    await db
      .update(paymentConfig)
      .set({
        gmailEmail,
        gmailAppPassword: finalPassword,
        trustedSenders: JSON.stringify(trustedSenders),
        checkDays,
        upiId,
        upiName,
        pageContent,
        enabled,
        updatedAt: new Date(),
      })
      .where(eq(paymentConfig.id, "default"));
  }

  return NextResponse.json({ success: true, message: "Payment config saved." });
}
