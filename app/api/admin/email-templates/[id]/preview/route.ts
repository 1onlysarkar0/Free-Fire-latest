import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { emailTemplate } from "@/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

function renderTemplate(html: string, variables: Record<string, string>): string {
  let rendered = html;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
    rendered = rendered.replaceAll(`{{ ${key} }}`, value);
  }
  return rendered;
}

/**
 * POST /api/admin/email-templates/[id]/preview
 * Body: { payload?: Record<string, string> }
 * Returns: { html: string, subject: string }
 */
export async function POST(request: Request, { params }: Params) {
  const admin = await requireAdminOrRole(request, "email_templates:view");
  if (admin instanceof Response) return admin;

  const { id } = await params;

  const [template] = await db
    .select()
    .from(emailTemplate)
    .where(eq(emailTemplate.id, id))
    .limit(1);

  if (!template) return Response.json({ error: "Template not found." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const payload: Record<string, string> = body.payload ?? {};

  // Merge with defaults from variablesSchema if provided
  const samplePayload: Record<string, string> = {};
  if (template.variablesSchema) {
    try {
      const schema = JSON.parse(template.variablesSchema) as Array<{ key: string; sample?: string }>;
      for (const v of schema) {
        samplePayload[v.key] = payload[v.key] ?? v.sample ?? `{{${v.key}}}`;
      }
    } catch {
      // malformed schema — ignore
    }
  }

  // Also apply any explicit payload values
  for (const [k, v] of Object.entries(payload)) {
    samplePayload[k] = v;
  }

  const renderedHtml = renderTemplate(template.bodyHtml, samplePayload);
  const renderedSubject = renderTemplate(template.subject, samplePayload);

  return Response.json({
    html: renderedHtml,
    subject: renderedSubject,
    previewText: template.previewText ?? null,
  });
}
