// app/api/admin/chatbot-config/test-connection/route.ts
// POST — Tests the AI connection using provided credentials
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { getChatbotConfig, testAIConnection, type AIProvider } from "@/lib/chatbot";

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

const schema = z.object({
  aiProvider: z.enum(["gemini", "custom"]),
  apiKey: z.string().min(1, "API key is required"),
  model: z.string().min(1, "Model is required"),
  customEndpoint: z.string().url().optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  const admin = await requireAdminOrRole(request, "chatbot:config_edit");
  if (admin instanceof Response) return admin;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  // If apiKey contains masking bullets, fetch real key from DB
  let apiKey = parsed.data.apiKey;
  if (apiKey.includes("•")) {
    const config = await getChatbotConfig();
    apiKey = config?.apiKey ?? "";
  }
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "No API key configured. Please save an API key first." },
      { status: 400 }
    );
  }

  const result = await testAIConnection(
    parsed.data.aiProvider as AIProvider,
    apiKey,
    parsed.data.model,
    parsed.data.customEndpoint || undefined
  );

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: `✅ Connection successful! Response time: ${result.responseTime}ms`,
    });
  }
  return NextResponse.json(
    { success: false, error: result.error },
    { status: 400 }
  );
}
