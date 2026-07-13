import { NextRequest, NextResponse } from "next/server";
import { getTournamentsPaginated } from "@/lib/tournaments";

export const instant = false;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const gameMode = searchParams.get("gameMode");
    const teamFormat = searchParams.get("teamFormat");
    const type = searchParams.get("type");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));

    const { data, total } = await getTournamentsPaginated(
      status,
      gameMode,
      teamFormat,
      type,
      page,
      limit
    );

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=59" },
    });
  } catch (err) {
    console.error("[API/tournaments] GET error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch tournaments" }, { status: 500 });
  }
}
