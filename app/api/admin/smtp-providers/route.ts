import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { smtpProviders } from "@/db/schema";
import { z } from "zod";
import { invalidateAdminCache } from "@/lib/cache";

const MASKED = "••••••••";

const providerSchema = z.object({
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

function maskProvider(p: typeof smtpProviders.$inferSelect) {
  return { ...p, password: p.password ? MASKED : "" };
}

export async function GET(request: Request) {
  const admin = await requireAdminOrRole(request, "smtp:view");
  if (admin instanceof Response) return admin;

  const providers = await db
    .select()
    .from(smtpProviders)
    .orderBy(smtpProviders.createdAt);

  return Response.json(providers.map(maskProvider));
}

export async function POST(request: Request) {
  const admin = await requireAdminOrRole(request, "smtp:edit");
  if (admin instanceof Response) return admin;

  const body = await request.json().catch(() => null);
  const parsed = providerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const id = `smtp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // If this is set as default, unset all others first
  if (data.isDefault) {
    await db.update(smtpProviders).set({ isDefault: false });
  }

  await db.insert(smtpProviders).values({
    id,
    label: data.label,
    providerType: data.providerType,
    host: data.host,
    port: data.port,
    secure: data.secure,
    username: data.username,
    password: data.password,
    fromName: data.fromName,
    fromEmail: data.fromEmail,
    replyTo: data.replyTo ?? null,
    isDefault: data.isDefault,
    isActive: data.isActive,
  });
  await invalidateAdminCache();
  return Response.json({ ok: true, id });
}
