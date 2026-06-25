import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { smtpConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const MASKED_SECRET = "••••••••";
const smtpUpdateSchema = z.object({
  host: z.string().trim().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65_535),
  username: z.string().trim().max(320),
  password: z.string().max(512),
  fromName: z.string().trim().min(1).max(120),
  fromEmail: z.string().trim().email().max(320),
  secure: z.boolean(),
  enabled: z.boolean(),
});

export async function GET(request: Request) {
  const admin = await requireAdminOrRole(request, "smtp:view");
  if (admin instanceof Response) return admin;

  const [row] = await db.select().from(smtpConfig).where(eq(smtpConfig.id, "default")).limit(1);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ...row, password: row.password ? MASKED_SECRET : "" });
}

export async function PUT(request: Request) {
  const admin = await requireAdminOrRole(request, "smtp:edit");
  if (admin instanceof Response) return admin;

  const body = await request.json().catch(() => null);
  const parsed = smtpUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { host, port, username, password, fromName, fromEmail, secure, enabled } = parsed.data;
  const [existing] = await db
    .select({ password: smtpConfig.password })
    .from(smtpConfig)
    .where(eq(smtpConfig.id, "default"))
    .limit(1);
  const finalPassword = !password || password === MASKED_SECRET
    ? existing?.password ?? ""
    : password;

  await db.update(smtpConfig).set({
    host,
    port,
    username,
    password: finalPassword,
    fromName,
    fromEmail,
    secure,
    enabled,
    updatedAt: new Date(),
  }).where(eq(smtpConfig.id, "default"));


  return Response.json({ ok: true });
}
