import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/drizzle";
import { tournamentParticipant } from "@/db/schema";
import { eq } from "drizzle-orm";

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
    if (!session?.user?.id) {
      return NextResponse.json({ joinedIds: [] });
    }

    const participations = await db
      .select({ tournamentId: tournamentParticipant.tournamentId })
      .from(tournamentParticipant)
      .where(eq(tournamentParticipant.userId, session.user.id));

    const joinedIds = participations.map((p) => p.tournamentId);

    return NextResponse.json({ joinedIds });
  } catch (err) {
    console.error("[API/tournaments/my] GET error:", err);
    return NextResponse.json({ joinedIds: [] });
  }
}
