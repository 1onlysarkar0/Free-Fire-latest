import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { emailTemplate } from "@/db/schema";

export async function GET(request: Request) {
  const admin = await requireAdminOrRole(request, "email_templates:view");
  if (admin instanceof Response) return admin;

  const templates = await db.select().from(emailTemplate).orderBy(emailTemplate.name);
  return Response.json(templates);
}

export async function POST(request: Request) {
  const admin = await requireAdminOrRole(request, "email_templates:create");
  if (admin instanceof Response) return admin;

  const { name, subject, bodyHtml, variables, description } = await request.json();
  if (!name || !subject) return Response.json({ error: "name and subject are required" }, { status: 400 });

  const id = `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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

  await db.insert(emailTemplate).values({
    id, name, subject, bodyHtml: bodyHtml ?? "",
    variables: varsJson,
    description: description ?? null,
  });


  return Response.json({ ok: true, id });
}
