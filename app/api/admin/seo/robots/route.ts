import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { robotsConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const admin = await requireAdminOrRole(request, "seo:view");
  if (admin instanceof Response) return admin;

  const [row] = await db.select().from(robotsConfig).where(eq(robotsConfig.id, "default")).limit(1);
  return Response.json(row || { id: "default", rules: [] });
}

export async function PUT(request: Request) {
  const admin = await requireAdminOrRole(request, "seo:edit");
  if (admin instanceof Response) return admin;

  try {
    const { rules } = await request.json();
    if (!Array.isArray(rules)) {
      return Response.json({ error: "rules must be a JSON array" }, { status: 400 });
    }

    await db.insert(robotsConfig).values({
      id: "default",
      rules,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: robotsConfig.id,
      set: {
        rules,
        updatedAt: new Date(),
      }
    });

    return Response.json({ ok: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
