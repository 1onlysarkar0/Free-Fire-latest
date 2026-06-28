import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { smtpProviders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { invalidateAdminCache } from "@/lib/cache";

type Params = { params: Promise<{ id: string }> };

/** POST /api/admin/smtp-providers/[id]/default — sets this provider as the default */
export async function POST(request: Request, { params }: Params) {
  const admin = await requireAdminOrRole(request, "smtp:edit");
  if (admin instanceof Response) return admin;

  const { id } = await params;

  // Unset all defaults first
  await db.update(smtpProviders).set({ isDefault: false });

  // Set this one as default
  await db
    .update(smtpProviders)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(eq(smtpProviders.id, id));

  await invalidateAdminCache();
  return Response.json({ ok: true });
}
