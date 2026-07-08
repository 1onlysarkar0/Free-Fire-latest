import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { cheaterReport, user, tournament } from "@/db/schema";
import { desc, eq, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const adminUser = await requireAdminOrRole(req, "cheater_reports:view");
  if (adminUser instanceof Response) return adminUser;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
    const offset = (page - 1) * limit;
    const statusFilter = searchParams.get("status");

    let where = undefined;
    if (statusFilter && ["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"].includes(statusFilter.toUpperCase())) {
      where = eq(cheaterReport.status, statusFilter.toUpperCase());
    }

    const [reports, [{ total }]] = await Promise.all([
      db
        .select({
          id: cheaterReport.id,
          userId: cheaterReport.userId,
          reportedUid: cheaterReport.reportedUid,
          reportedAt: cheaterReport.reportedAt,
          tournamentId: cheaterReport.tournamentId,
          description: cheaterReport.description,
          status: cheaterReport.status,
          adminNote: cheaterReport.adminNote,
          reviewedByAdminId: cheaterReport.reviewedByAdminId,
          createdAt: cheaterReport.createdAt,
          updatedAt: cheaterReport.updatedAt,
          userName: user.name,
          userEmail: user.email,
          userGameName: user.gameName,
          userUid: user.uid,
          tournamentName: tournament.name,
          tournamentMode: tournament.gameMode,
          tournamentFormat: tournament.teamFormat,
        })
        .from(cheaterReport)
        .leftJoin(user, eq(cheaterReport.userId, user.id))
        .leftJoin(tournament, eq(cheaterReport.tournamentId, tournament.id))
        .where(where)
        .orderBy(desc(cheaterReport.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(cheaterReport).where(where),
    ]);

    return NextResponse.json({
      success: true,
      data: reports.map((r) => ({
        ...r,
        reportedAt: r.reportedAt instanceof Date ? r.reportedAt.toISOString() : r.reportedAt,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[API/admin/cheater-reports] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch cheater reports" }, { status: 500 });
  }
}
