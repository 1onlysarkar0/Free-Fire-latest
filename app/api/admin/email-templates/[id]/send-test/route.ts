import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { emailTemplate, siteConfig, navigationItem } from "@/db/schema";
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

  // Fetch site config for globals
  const [config] = await db.select().from(siteConfig).where(eq(siteConfig.id, "default")).limit(1);

  const socialItems = await db
    .select()
    .from(navigationItem)
    .where(eq(navigationItem.isSocial, true));
  
  const instagram = socialItems.find(item => item.title.toLowerCase().includes("instagram"));
  const github = socialItems.find(item => item.title.toLowerCase().includes("github"));

  // Merge sample values from variablesSchema
  const samplePayload: Record<string, string> = {
    siteName: config?.logoTitle ?? "",
    siteLogo: config?.logoSrc ?? "/assets/logo.svg",
    siteUrl: config?.siteUrl ?? "",
    copyrightText: config?.copyrightText ?? "",
    contactEmail: config?.contactEmail ?? "",
    companyAddress: config?.companyAddress ?? "",
    instagramUrl: instagram?.url ?? "",
    githubUrl: github?.url ?? "",
  };

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
  const html = renderTemplate(template.bodyHtml, samplePayload);

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
