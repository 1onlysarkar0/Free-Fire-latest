// app/api/chatbot/config/route.ts
// Public endpoint — returns safe public chatbot config (no API key, no system prompt)
import { NextResponse } from "next/server";
import { getPublicChatbotConfig } from "@/lib/chatbot";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getPublicChatbotConfig();
  if (!config) {
    return NextResponse.json(
      { success: false, error: "Chatbot not configured" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data: config });
}
