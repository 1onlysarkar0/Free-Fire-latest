// app/api/admin/chatbot-sessions/route.ts
// GET — Paginated list of chat sessions with message counts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { chatbot_session, chatbot_message } from "@/db/schema";
import { desc, count } from "drizzle-orm";
import { requireAdminOrRole } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAdminOrRole(request, "chatbot:conversations_view");
  if (admin instanceof Response) return admin;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const offset = (page - 1) * limit;

  const sessions = await db
    .select({
      id: chatbot_session.id,
      userId: chatbot_session.userId,
      userName: chatbot_session.userName,
      sessionToken: chatbot_session.sessionToken,
      messageCount: chatbot_session.messageCount,
      status: chatbot_session.status,
      ipAddress: chatbot_session.ipAddress,
      startedAt: chatbot_session.startedAt,
      lastMessageAt: chatbot_session.lastMessageAt,
    })
    .from(chatbot_session)
    .orderBy(desc(chatbot_session.lastMessageAt))
    .limit(limit)
    .offset(offset);

  const totalResult = await db.select({ count: count() }).from(chatbot_session);
  const total = Number(totalResult[0]?.count ?? 0);

  // Get total messages count
  const msgResult = await db.select({ count: count() }).from(chatbot_message);
  const totalMessages = Number(msgResult[0]?.count ?? 0);

  return NextResponse.json({
    success: true,
    data: {
      sessions,
      total,
      totalMessages,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdminOrRole(request, "chatbot:conversations_delete");
  if (admin instanceof Response) return admin;

  try {
    await db.delete(chatbot_session);
    return NextResponse.json({
      success: true,
      message: "All chatbot conversations deleted successfully.",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete conversations.";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
