// app/api/admin/chatbot-config/route.ts
// GET — Returns config with API key masked (last 4 chars only)
// PUT — Updates chatbot config
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { chatbot_config } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { getChatbotConfig } from "@/lib/chatbot";
import { invalidateAdminCache } from "@/lib/cache";

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAdminOrRole(request, "chatbot:view");
  if (admin instanceof Response) return admin;

  const config = await getChatbotConfig();
  if (!config) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  // Mask API key — never return full key to client
  const masked = config.apiKey
    ? `${"•".repeat(Math.max(0, config.apiKey.length - 4))}${config.apiKey.slice(-4)}`
    : "";

  return NextResponse.json({
    success: true,
    data: { ...config, apiKey: masked },
  });
}

// Validation schema for chatbot config update
// Only "gemini" and "custom" providers are accepted
const updateSchema = z.object({
  enabled: z.boolean().optional(),
  chatbotName: z.string().min(1).max(100).optional(),
  welcomeMessage: z.string().max(500).optional(),
  description: z.string().max(500).optional(),
  aiProvider: z.enum(["gemini", "custom"]).optional(),
  // Empty string = don't update the key; masked (contains •) = don't update
  apiKey: z.string().max(200).optional(),
  customEndpoint: z.string().url().optional().or(z.literal("")).or(z.null()),
  model: z.string().min(1).max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxResponseTokens: z.number().int().min(1).optional(),
  contextWindow: z.number().int().min(1).max(20).optional(),
  systemPrompt: z.string().max(50000).optional(),
  rateLimitEnabled: z.boolean().optional(),
  rateLimitPerHour: z.number().int().min(1).max(500).optional(),
  allowAnonymous: z.boolean().optional(),
  inputPlaceholder: z.string().max(100).optional(),
});

export async function PUT(request: NextRequest) {
  const admin = await requireAdminOrRole(request, "chatbot:config_edit");
  if (admin instanceof Response) return admin;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };

  // Handle API key update:
  // If apiKey is not in the payload OR contains masking bullets → don't update
  if (!body.apiKey || body.apiKey.includes("•")) {
    delete updateData.apiKey;
  }

  // Handle empty customEndpoint → store as null
  if (updateData.customEndpoint === "") {
    updateData.customEndpoint = null;
  }



  await db
    .update(chatbot_config)
    .set(updateData)
    .where(eq(chatbot_config.id, "default"));

  await invalidateAdminCache();
  return NextResponse.json({ success: true, message: "Chatbot config updated successfully." });
}
