// app/api/chatbot/session/[token]/end/route.ts
// POST — Marks a chat session as ended.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { chatbot_session } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionByToken } from "@/lib/chatbot";

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const chatSession = await getSessionByToken(token);
  if (!chatSession) {
    return NextResponse.json(
      { success: false, error: "Session not found" },
      { status: 404 }
    );
  }

  await db
    .update(chatbot_session)
    .set({ status: "ended" })
    .where(eq(chatbot_session.sessionToken, token));

  return NextResponse.json({ success: true });
}
