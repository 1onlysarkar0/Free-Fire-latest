import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { cheaterReport } from "@/db/schema";
import { createNotification } from "@/lib/notifications";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"]),
  adminNote: z.string().max(1000).optional(),
});

const STATUS_MESSAGES: Record<string, string> = {
  REVIEWED: "Your cheater report is being reviewed by our team.",
  RESOLVED: "Your cheater report has been resolved. Action has been taken against the reported player.",
  DISMISSED: "Your cheater report has been reviewed and dismissed. No violation was found.",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await requireAdminOrRole(req, "cheater_reports:edit");
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
    // Find the existing report
    const [existing] = await db
      .select({ userId: cheaterReport.userId, reportedUid: cheaterReport.reportedUid, status: cheaterReport.status })
      .from(cheaterReport)
      .where(eq(cheaterReport.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Update the report
    await db
      .update(cheaterReport)
      .set({
        status,
        adminNote: adminNote ?? null,
        reviewedByAdminId: adminUser.user.id,
        updatedAt: new Date(),
      })
      .where(eq(cheaterReport.id, id));

    // Notify user only if status changed
    if (status !== existing.status && STATUS_MESSAGES[status]) {
      await createNotification({
        userId: existing.userId,
        title: `Cheater Report Update`,
        message: `${STATUS_MESSAGES[status]}${adminNote ? ` Admin note: ${adminNote}` : ""}`,
        type: "GENERAL",
        referenceId: id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API/admin/cheater-reports/[id]] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await requireAdminOrRole(req, "cheater_reports:delete");
  if (adminUser instanceof Response) return adminUser;

  const { id } = await params;

  try {
    await db.delete(cheaterReport).where(eq(cheaterReport.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API/admin/cheater-reports/[id]] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}
