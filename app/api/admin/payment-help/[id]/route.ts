import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { paymentHelpRequest } from "@/db/schema";
import { createNotification } from "@/lib/notifications";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"]),
  adminNote: z.string().max(1000).optional(),
});

const STATUS_MESSAGES: Record<string, string> = {
  REVIEWED: "Your payment help request is being reviewed by our team.",
  RESOLVED: "Your payment help request has been resolved. Please check your wallet balance.",
  DISMISSED: "Your payment help request has been reviewed and closed. No further action is needed.",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await requireAdminOrRole(req, "payment_help:edit");
  if (adminUser instanceof Response) return adminUser;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { status, adminNote } = parsed.data;

  try {
    // Find existing request
    const [existing] = await db
      .select({ userId: paymentHelpRequest.userId, amount: paymentHelpRequest.amount, utrNumber: paymentHelpRequest.utrNumber, status: paymentHelpRequest.status })
      .from(paymentHelpRequest)
      .where(eq(paymentHelpRequest.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Update
    await db
      .update(paymentHelpRequest)
      .set({
        status,
        adminNote: adminNote ?? null,
        reviewedByAdminId: adminUser.user.id,
        updatedAt: new Date(),
      })
      .where(eq(paymentHelpRequest.id, id));

    // Notify user if status changed
    if (status !== existing.status && STATUS_MESSAGES[status]) {
      await createNotification({
        userId: existing.userId,
        title: `Payment Help Update`,
        message: `${STATUS_MESSAGES[status]}${adminNote ? ` Admin note: ${adminNote}` : ""}`,
        type: "GENERAL",
        referenceId: id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API/admin/payment-help/[id]] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await requireAdminOrRole(req, "payment_help:delete");
  if (adminUser instanceof Response) return adminUser;

  const { id } = await params;

  try {
    await db.delete(paymentHelpRequest).where(eq(paymentHelpRequest.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API/admin/payment-help/[id]] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete request" }, { status: 500 });
  }
}
