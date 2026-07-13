import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getViewerTournamentDetail } from "@/lib/tournaments";

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
    const data = await getViewerTournamentDetail(id, session?.user?.id);

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Tournament not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[API/tournaments/[id]] GET error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tournament" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
