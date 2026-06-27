import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { emailTemplate } from "@/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

/** POST /api/admin/email-templates/[id]/duplicate */
export async function POST(request: Request, { params }: Params) {
  const admin = await requireAdminOrRole(request, "email_templates:create");
  if (admin instanceof Response) return admin;

  const { id } = await params;

  const [original] = await db
    .select()
    .from(emailTemplate)
    .where(eq(emailTemplate.id, id))
    .limit(1);

  if (!original) return Response.json({ error: "Template not found." }, { status: 404 });

  const newId = `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const newName = `${original.name} (copy)`;

  await db.insert(emailTemplate).values({
    ...original,
    id: newId,
    name: newName,
    isActive: false, // duplicates start inactive
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return Response.json({ ok: true, id: newId, name: newName });
}
