import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { cheaterReport } from "@/db/schema";
import { createNotification } from "@/lib/notifications";
import { nanoid } from "nanoid";
import { z } from "zod";

const submitSchema = z.object({
  reportedUid: z
    .string()
    .min(5, "UID must be at least 5 characters")
    .max(20, "UID must be at most 20 characters")
    .regex(/^\d+$/, "UID must contain only digits"),
  reportedAt: z.string().min(1, "Date and time are required"),
  tournamentId: z.string().nullable().optional(),
  description: z
    .string()
    .min(30, "Description must be at least 30 characters")
    .max(2000, "Description must be at most 2000 characters"),
});

export async function POST(req: NextRequest) {
  // Require authenticated session
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized. Please log in to submit a report." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { reportedUid, reportedAt, tournamentId, description } = parsed.data;

  try {
    const id = nanoid();
    await db.insert(cheaterReport).values({
      id,
      userId: session.user.id,
      reportedUid,
      reportedAt: new Date(reportedAt),
      tournamentId: tournamentId ?? null,
      description,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Notify the user that their report was received
    await createNotification({
      userId: session.user.id,
      title: "Cheater Report Submitted",
      message: `Your report against UID ${reportedUid} has been received. We will review it and take appropriate action. Report ID: ${id}`,
      type: "GENERAL",
      referenceId: id,
    });

    return NextResponse.json({ success: true, reportId: id });
  } catch (err) {
    console.error("[API/cheater-report] POST error:", err);
    return NextResponse.json({ error: "Failed to submit report. Please try again." }, { status: 500 });
  }
}
