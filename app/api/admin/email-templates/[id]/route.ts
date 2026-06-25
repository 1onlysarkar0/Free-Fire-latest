import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { emailTemplate } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOrRole(request, "email_templates:edit");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  const { name, subject, bodyHtml, variables, description } = await request.json();

  let varsJson: string | null = null;
  if (variables) {
    if (typeof variables === "string") {
      if (variables.trim().startsWith("[")) {
        varsJson = variables.trim();
      } else {
        varsJson = JSON.stringify(variables.split(",").map((s: string) => s.trim()).filter(Boolean));
      }
    } else if (Array.isArray(variables)) {
      varsJson = JSON.stringify(variables);
    }
  }

  await db.update(emailTemplate).set({
    name, subject, bodyHtml,
    variables: varsJson,
    description: description ?? null,
    updatedAt: new Date(),
  }).where(eq(emailTemplate.id, id));


  return Response.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminOrRole(request, "email_templates:delete");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  await db.delete(emailTemplate).where(eq(emailTemplate.id, id));
  

  return Response.json({ ok: true });
}
