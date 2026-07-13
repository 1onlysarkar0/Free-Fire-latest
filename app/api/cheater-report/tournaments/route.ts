import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { tournament } from "@/db/schema";
import { and, gte, lte, ne } from "drizzle-orm";

export const instant = false;

export async function GET(req: NextRequest) {
  // Require authenticated session
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  const query = searchParams.get("q")?.toLowerCase().trim() ?? "";

  if (!dateStr) {
    return NextResponse.json({ error: "date parameter is required (ISO date string)" }, { status: 400 });
  }

  let parsedDate: Date;
  try {
    parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime())) throw new Error("invalid date");
  } catch {
    return NextResponse.json({ error: "Invalid date format. Use ISO 8601." }, { status: 400 });
  }

  // Build day start/end range in UTC
  const dayStart = new Date(parsedDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(parsedDate);
  dayEnd.setUTCHours(23, 59, 59, 999);

  try {
    const results = await db
      .select({
        id: tournament.id,
        name: tournament.name,
        type: tournament.type,
        gameMode: tournament.gameMode,
        teamFormat: tournament.teamFormat,
        startTime: tournament.startTime,
        registrationDeadline: tournament.registrationDeadline,
        status: tournament.status,
        joiningFee: tournament.joiningFee,
        prizePool: tournament.prizePool,
        totalSlots: tournament.totalSlots,
        maps: tournament.maps,
      })
      .from(tournament)
      .where(
        and(
          gte(tournament.startTime, dayStart),
          lte(tournament.startTime, dayEnd),
          ne(tournament.status, "CANCELLED")
        )
      )
      .limit(50);

    // Apply optional name search filter
    const filtered = query
      ? results.filter(
          (t) =>
            t.name.toLowerCase().includes(query) ||
            t.gameMode.toLowerCase().includes(query) ||
            t.teamFormat.toLowerCase().includes(query)
        )
      : results;

    return NextResponse.json({
      success: true,
      data: filtered.map((t) => ({
        ...t,
        startTime:
          typeof t.startTime === "string" ? t.startTime : t.startTime.toISOString(),
        registrationDeadline:
          typeof t.registrationDeadline === "string"
            ? t.registrationDeadline
            : t.registrationDeadline.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[API/cheater-report/tournaments] GET error:", err);
    return NextResponse.json({ error: "Failed to search tournaments" }, { status: 500 });
  }
}
