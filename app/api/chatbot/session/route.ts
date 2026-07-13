// app/api/chatbot/session/route.ts
// POST — Creates a new chat session.
// If allowAnonymous is false, unauthenticated users receive a clear "sign in" message.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getChatbotConfig, createChatSession } from "@/lib/chatbot";

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // 1. Get chatbot config
  const config = await getChatbotConfig();
  if (!config || !config.enabled) {
    return NextResponse.json(
      { success: false, error: "Chatbot is not available right now. Please try again later." },
      { status: 503 }
    );
  }

  // 2. Check authentication requirement
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (!config.allowAnonymous && !session?.user) {
    return NextResponse.json(
      {
        success: false,
        error: "Chatbot use karne ke liye pehle sign in karo. (Please sign in to use the chatbot.)",
        requiresAuth: true,
      },
      { status: 401 }
    );
  }

  // 3. Extract metadata
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const userAgent = request.headers.get("user-agent") ?? undefined;

  // 4. Create session
  const { sessionToken } = await createChatSession({
    userId: session?.user?.id,
    userName: session?.user?.name ?? undefined,
    ipAddress,
    userAgent,
  });

  return NextResponse.json({
    success: true,
    data: {
      sessionToken,
      chatbotName: config.chatbotName,
      welcomeMessage: config.welcomeMessage,
    },
  });
}
