import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { emailTemplate } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET(request: Request) {
  const admin = await requireAdminOrRole(request, "email_templates:view");
  if (admin instanceof Response) return admin;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const query = db.select().from(emailTemplate).orderBy(desc(emailTemplate.updatedAt));

  const templates = await query;

  const filtered = category
    ? templates.filter((t) => t.category === category)
    : templates;

  return Response.json(filtered);
}

export async function POST(request: Request) {
  const admin = await requireAdminOrRole(request, "email_templates:create");
  if (admin instanceof Response) return admin;

  const body = await request.json().catch(() => ({}));
  const {
    name, subject, previewText, bodyHtml, designJson, templateKey,
    variables, variablesSchema, description, category, editorType, isActive,
  } = body;

  if (!name || !subject) {
    return Response.json({ error: "name and subject are required" }, { status: 400 });
  }

  const id = `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  let varsJson: string | null = null;
  if (variables) {
    if (typeof variables === "string") {
      varsJson = variables.trim().startsWith("[")
        ? variables.trim()
        : JSON.stringify(variables.split(",").map((s: string) => s.trim()).filter(Boolean));
    } else if (Array.isArray(variables)) {
      varsJson = JSON.stringify(variables);
    }
  }

  await db.insert(emailTemplate).values({
    id,
    name,
    subject,
    previewText: previewText ?? null,
    bodyHtml: bodyHtml ?? "",
    designJson: designJson ?? null,
    templateKey: templateKey ?? null,
    variables: varsJson,
    variablesSchema: variablesSchema ?? null,
    description: description ?? null,
    category: category ?? "system",
    editorType: editorType ?? "html",
    isActive: isActive !== false,
  });

  return Response.json({ ok: true, id });
}
