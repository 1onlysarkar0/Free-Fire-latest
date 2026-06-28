import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { emailTemplate } from "@/db/schema";
import { eq } from "drizzle-orm";
import { invalidateAdminCache } from "@/lib/cache";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const admin = await requireAdminOrRole(request, "email_templates:view");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  const [row] = await db.select().from(emailTemplate).where(eq(emailTemplate.id, id)).limit(1);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json(row);
}

export async function PUT(request: Request, { params }: Params) {
  const admin = await requireAdminOrRole(request, "email_templates:edit");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const {
    name, subject, previewText, bodyHtml, designJson, templateKey,
    variables, variablesSchema, description, category, editorType, isActive,
  } = body;

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

  await db.update(emailTemplate).set({
    ...(name !== undefined && { name }),
    ...(subject !== undefined && { subject }),
    previewText: previewText ?? null,
    bodyHtml: bodyHtml ?? "",
    designJson: designJson ?? null,
    templateKey: templateKey ?? null,
    variables: varsJson,
    variablesSchema: variablesSchema ?? null,
    description: description ?? null,
    ...(category !== undefined && { category }),
    ...(editorType !== undefined && { editorType }),
    ...(isActive !== undefined && { isActive }),
    updatedAt: new Date(),
  }).where(eq(emailTemplate.id, id));

  await invalidateAdminCache();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const admin = await requireAdminOrRole(request, "email_templates:delete");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  await db.delete(emailTemplate).where(eq(emailTemplate.id, id));

  await invalidateAdminCache();
  return Response.json({ ok: true });
}
