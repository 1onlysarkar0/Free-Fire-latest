// app/api/chatbot/session/[token]/route.ts
// GET — Returns conversation history for a session token.
// Only returns user and assistant messages (not system prompts).
// If session belongs to an authenticated user, verifies ownership.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { chatbot_message } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSessionByToken } from "@/lib/chatbot";

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
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

  // If session belongs to an authenticated user, verify ownership
  if (chatSession.userId) {
    const authSession = await auth.api.getSession({ headers: request.headers }).catch(() => null);
    if (authSession?.user?.id !== chatSession.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  const messages = await db
    .select()
    .from(chatbot_message)
    .where(eq(chatbot_message.sessionId, chatSession.id))
    .orderBy(asc(chatbot_message.createdAt))
    .limit(100);

  // Filter out system messages — only return user/assistant
  const filtered = messages.filter((m) => m.role !== "system");

  return NextResponse.json({ success: true, data: { messages: filtered } });
}
