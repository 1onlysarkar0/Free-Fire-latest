import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { testImapConnection } from "@/lib/payment";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { paymentConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

const schema = z.object({
  gmailEmail: z.string().email(),
  gmailAppPassword: z.string().max(64), // allow empty / masked
});

export async function POST(request: NextRequest) {
  const adminUser = await requireAdminOrRole(request, "payment:config_edit");
  if (adminUser instanceof Response) return adminUser;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { gmailEmail } = parsed.data;
  let { gmailAppPassword } = parsed.data;

  const isMasked = !gmailAppPassword || gmailAppPassword === "••••••••";
  if (isMasked) {
    const rows = await db
      .select({ gmailAppPassword: paymentConfig.gmailAppPassword })
      .from(paymentConfig)
      .where(eq(paymentConfig.id, "default"))
      .limit(1);
    gmailAppPassword = rows[0]?.gmailAppPassword ?? "";
  }

  if (!gmailAppPassword) {
    return NextResponse.json(
      { success: false, error: "No App Password saved. Enter one before testing." },
      { status: 400 }
    );
  }

  const result = await testImapConnection(gmailEmail, gmailAppPassword);

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: "Gmail IMAP connection successful! Credentials are valid.",
    });
  } else {
    return NextResponse.json(
      {
        success: false,
        error: result.error || "Connection failed.",
      },
      { status: 400 }
    );
  }
}
