// app/api/admin/chatbot-knowledge/route.ts
// GET — List all knowledge base entries (ordered by priority)
// POST — Create a new knowledge entry
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { chatbot_knowledge } from "@/db/schema";
import { asc } from "drizzle-orm";
import { requireAdminOrRole } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAdminOrRole(request, "chatbot:knowledge_view");
  if (admin instanceof Response) return admin;

  const entries = await db
    .select()
    .from(chatbot_knowledge)
    .orderBy(asc(chatbot_knowledge.priority), asc(chatbot_knowledge.createdAt));

  return NextResponse.json({ success: true, data: entries });
}

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required").max(5000),
  category: z.string().max(100).default("General"),
  isEnabled: z.boolean().default(true),
  priority: z.number().int().min(1).max(1000).default(100),
});

export async function POST(request: NextRequest) {
  const admin = await requireAdminOrRole(request, "chatbot:knowledge_edit");
  if (admin instanceof Response) return admin;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  const result = await db
    .insert(chatbot_knowledge)
    .values(parsed.data)
    .returning();

  return NextResponse.json({ success: true, data: result[0] }, { status: 201 });
}
