import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { smtpProviders } from "@/db/schema";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import { z } from "zod";

const testSchema = z.object({
  to: z.string().trim().email(),
});

type Params = { params: Promise<{ id: string }> };

/** POST /api/admin/smtp-providers/[id]/test — sends a test email via this provider */
export async function POST(request: Request, { params }: Params) {
  const admin = await requireAdminOrRole(request, "smtp:edit");
  if (admin instanceof Response) return admin;

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "A valid recipient email is required." }, { status: 400 });
  }

  const [provider] = await db
    .select()
    .from(smtpProviders)
    .where(eq(smtpProviders.id, id))
    .limit(1);

  if (!provider) {
    return Response.json({ error: "Provider not found." }, { status: 404 });
  }

  if (!provider.host || !provider.username || !provider.password) {
    return Response.json({ error: "Provider configuration is incomplete." }, { status: 400 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: provider.host,
      port: provider.port,
      secure: provider.secure,
      auth: { user: provider.username, pass: provider.password },
      connectionTimeout: 10000,
    });

    const from = `"${provider.fromName}" <${provider.fromEmail}>`;

    await transporter.sendMail({
      from,
      to: parsed.data.to,
      subject: "SMTP Test Email",
      html: `<p>This is a test email from provider <strong>${provider.label}</strong>.</p><p>If you received this, SMTP is configured correctly.</p>`,
      ...(provider.replyTo ? { replyTo: provider.replyTo } : {}),
    });

    return Response.json({ ok: true, message: `Test email sent to ${parsed.data.to}.` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `SMTP test failed: ${message}` }, { status: 500 });
  }
}
