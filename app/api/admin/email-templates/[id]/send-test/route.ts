import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { emailTemplate } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendRawEmail } from "@/lib/mailer";
import { z } from "zod";

const testSchema = z.object({
  to: z.string().trim().email(),
  payload: z.record(z.string()).optional(),
  providerId: z.string().optional(),
});

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
 * POST /api/admin/email-templates/[id]/send-test
 * Body: { to: string, payload?: Record<string,string>, providerId?: string }
 */
export async function POST(request: Request, { params }: Params) {
  const admin = await requireAdminOrRole(request, "email_templates:edit");
  if (admin instanceof Response) return admin;

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "A valid recipient email is required." }, { status: 400 });
  }

  const [template] = await db
    .select()
    .from(emailTemplate)
    .where(eq(emailTemplate.id, id))
    .limit(1);

  if (!template) return Response.json({ error: "Template not found." }, { status: 404 });

  const payload: Record<string, string> = parsed.data.payload ?? {};

  // Merge sample values from variablesSchema
  const samplePayload: Record<string, string> = {};
  if (template.variablesSchema) {
    try {
      const schema = JSON.parse(template.variablesSchema) as Array<{ key: string; sample?: string }>;
      for (const v of schema) {
        samplePayload[v.key] = payload[v.key] ?? v.sample ?? `[${v.key}]`;
      }
    } catch {
      // malformed schema — ignore
    }
  }
  for (const [k, v] of Object.entries(payload)) {
    samplePayload[k] = v;
  }

  const subject = renderTemplate(template.subject, samplePayload);
  let html = "";
  if (template.editorType === "react_email" && template.templateKey) {
    const { renderReactEmail } = await import("@/emails/registry");
    try {
      html = await renderReactEmail(template.templateKey, samplePayload);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return Response.json({ error: `Error rendering React Email template: ${msg}` }, { status: 500 });
    }
  } else {
    html = renderTemplate(template.bodyHtml, samplePayload);
  }

  try {
    await sendRawEmail({
      to: parsed.data.to,
      subject: `[TEST] ${subject}`,
      html,
      providerId: parsed.data.providerId,
    });

    return Response.json({ ok: true, message: `Test email sent to ${parsed.data.to}.` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Failed to send test email: ${message}` }, { status: 500 });
  }
}
