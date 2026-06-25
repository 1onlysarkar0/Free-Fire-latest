import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { contentTemplate } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest) {
  const adminUser = await requireAdminOrRole(req, "content_templates:view");
  if (adminUser instanceof Response) return adminUser;

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const query = db.select().from(contentTemplate).orderBy(desc(contentTemplate.createdAt));
    const rows = type
      ? await db.select().from(contentTemplate).where(eq(contentTemplate.type, type.toUpperCase())).orderBy(desc(contentTemplate.createdAt))
      : await query;

    return NextResponse.json(rows);
  } catch (err) {
    console.error("[API/admin/content-templates] GET:", err);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const adminUser = await requireAdminOrRole(req, "content_templates:create");
  if (adminUser instanceof Response) return adminUser;

  try {
    const body = await req.json();
    const { name, type, contentHtml = "", contentMarkdown = "" } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Template name is required" }, { status: 400 });
    if (!type || !["DESCRIPTION", "RULES"].includes(type.toUpperCase())) {
      return NextResponse.json({ error: "type must be DESCRIPTION or RULES" }, { status: 400 });
    }

    const id = nanoid();
    await db.insert(contentTemplate).values({
      id,
      name: name.trim(),
      type: type.toUpperCase(),
      contentHtml,
      contentMarkdown,
      createdByAdminId: adminUser.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });


    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (err) {
    console.error("[API/admin/content-templates] POST:", err);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
