import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { smtpProviders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { invalidateAdminCache } from "@/lib/cache";

const MASKED = "••••••••";

const updateSchema = z.object({
  label: z.string().trim().min(1).max(120),
  providerType: z.enum(["gmail_smtp", "resend_smtp"]).default("gmail_smtp"),
  host: z.string().trim().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean().default(false),
  username: z.string().trim().min(1).max(320),
  password: z.string().max(512),
  fromName: z.string().trim().min(1).max(120),
  fromEmail: z.string().trim().email().max(320),
  replyTo: z.string().trim().email().max(320).nullable().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const admin = await requireAdminOrRole(request, "smtp:view");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  const [row] = await db.select().from(smtpProviders).where(eq(smtpProviders.id, id)).limit(1);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ ...row, password: row.password ? MASKED : "" });
}

export async function PUT(request: Request, { params }: Params) {
  const admin = await requireAdminOrRole(request, "smtp:edit");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Resolve password — if masked sentinel, keep existing
  const [existing] = await db
    .select({ password: smtpProviders.password })
    .from(smtpProviders)
    .where(eq(smtpProviders.id, id))
    .limit(1);

  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const finalPassword =
    !data.password || data.password === MASKED ? existing.password : data.password;

  // If setting as default, unset others
  if (data.isDefault) {
    await db.update(smtpProviders).set({ isDefault: false });
  }

  await db.update(smtpProviders).set({
    label: data.label,
    providerType: data.providerType,
    host: data.host,
    port: data.port,
    secure: data.secure,
    username: data.username,
    password: finalPassword,
    fromName: data.fromName,
    fromEmail: data.fromEmail,
    replyTo: data.replyTo ?? null,
    isDefault: data.isDefault,
    isActive: data.isActive,
    updatedAt: new Date(),
  }).where(eq(smtpProviders.id, id));

  await invalidateAdminCache();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const admin = await requireAdminOrRole(request, "smtp:edit");
  if (admin instanceof Response) return admin;

  const { id } = await params;
  await db.delete(smtpProviders).where(eq(smtpProviders.id, id));

  await invalidateAdminCache();
  return Response.json({ ok: true });
}
