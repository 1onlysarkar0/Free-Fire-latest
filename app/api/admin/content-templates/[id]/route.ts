import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { contentTemplate } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await requireAdminOrRole(req, "content_templates:edit");
  if (adminUser instanceof Response) return adminUser;

  try {
    const { id } = await params;

    const [existing] = await db
      .select({ id: contentTemplate.id })
      .from(contentTemplate)
      .where(eq(contentTemplate.id, id))
      .limit(1);

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.name?.trim()) updates.name = body.name.trim();
    if (body.type && ["DESCRIPTION", "RULES"].includes(body.type.toUpperCase())) {
      updates.type = body.type.toUpperCase();
    }
    if ("contentHtml" in body) updates.contentHtml = body.contentHtml ?? "";
    if ("contentMarkdown" in body) updates.contentMarkdown = body.contentMarkdown ?? "";

    await db.update(contentTemplate).set(updates).where(eq(contentTemplate.id, id));


    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API/admin/content-templates/[id]] PATCH:", err);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await requireAdminOrRole(req, "content_templates:delete");
  if (adminUser instanceof Response) return adminUser;

  try {
    const { id } = await params;

    const [existing] = await db
      .select({ id: contentTemplate.id })
      .from(contentTemplate)
      .where(eq(contentTemplate.id, id))
      .limit(1);

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.delete(contentTemplate).where(eq(contentTemplate.id, id));


    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API/admin/content-templates/[id]] DELETE:", err);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
