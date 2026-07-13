// app/api/admin/chatbot-sessions/[id]/route.ts
// GET — Get full conversation for a session
// DELETE — Delete a session and all its messages (cascades via FK)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { chatbot_session, chatbot_message } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAdminOrRole } from "@/lib/admin-auth";

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminOrRole(request, "chatbot:conversations_view");
  if (admin instanceof Response) return admin;

  const { id } = await params;

  const sessions = await db
    .select()
    .from(chatbot_session)
    .where(eq(chatbot_session.id, id))
    .limit(1);

  if (!sessions.length) {
    return NextResponse.json(
      { success: false, error: "Session not found" },
      { status: 404 }
    );
  }

  const messages = await db
    .select()
    .from(chatbot_message)
    .where(eq(chatbot_message.sessionId, id))
    .orderBy(asc(chatbot_message.createdAt));

  return NextResponse.json({
    success: true,
    data: { session: sessions[0], messages },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminOrRole(request, "chatbot:conversations_delete");
  if (admin instanceof Response) return admin;

  const { id } = await params;

  // Messages cascade-delete via FK
  await db.delete(chatbot_session).where(eq(chatbot_session.id, id));

  return NextResponse.json({ success: true });
}
