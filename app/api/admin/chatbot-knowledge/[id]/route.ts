// app/api/admin/chatbot-knowledge/[id]/route.ts
// PUT — Update a knowledge base entry
// DELETE — Delete a knowledge base entry
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { chatbot_knowledge } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminOrRole } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  category: z.string().max(100).optional(),
  isEnabled: z.boolean().optional(),
  priority: z.number().int().min(1).max(1000).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminOrRole(request, "chatbot:knowledge_edit");
  if (admin instanceof Response) return admin;

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  const result = await db
    .update(chatbot_knowledge)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(chatbot_knowledge.id, id))
    .returning();

  if (!result.length) {
    return NextResponse.json(
      { success: false, error: "Entry not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: result[0] });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminOrRole(request, "chatbot:knowledge_edit");
  if (admin instanceof Response) return admin;

  const { id } = await params;

  await db.delete(chatbot_knowledge).where(eq(chatbot_knowledge.id, id));

  return NextResponse.json({ success: true });
}
