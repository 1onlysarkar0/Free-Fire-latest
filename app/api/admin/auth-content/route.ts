import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { authPageContent } from "@/db/schema";

export async function GET(request: Request) {
  const admin = await requireAdminOrRole(request, "auth_content:view");
  if (admin instanceof Response) return admin;

  const items = await db.select().from(authPageContent).orderBy(authPageContent.id);
  return Response.json(items);
}
