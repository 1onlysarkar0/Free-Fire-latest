import { requireAdminOrRole } from "@/lib/admin-auth";
import { db } from "@/db/drizzle";
import { seoConfig, seoAuditLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auditSeo } from "@/lib/seo/audit";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  const admin = await requireAdminOrRole(request, "seo:edit");
  if (admin instanceof Response) return admin;

  try {
    const { pageId } = await request.json();
    if (!pageId) {
      return Response.json({ error: "pageId is required" }, { status: 400 });
    }

    // Fetch the seo_config row
    const [row] = await db.select().from(seoConfig).where(eq(seoConfig.id, pageId)).limit(1);
    if (!row) {
      return Response.json({ error: "SEO configuration not found" }, { status: 404 });
    }

    // Run audit
    const result = auditSeo(pageId, row);

    // Save to seo_audit_log
    const logId = nanoid();
    await db.insert(seoAuditLog).values({
      id: logId,
      pageId,
      score: result.score,
      grade: result.grade,
      checks: result.checks,
      criticalIssues: result.criticalIssues,
      warnings: result.warnings,
      suggestions: result.suggestions,
      checkedAt: new Date(),
    });

    // Update seo_config score & timestamp
    await db.update(seoConfig).set({
      seoScore: result.score,
      lastAudited: new Date(),
      updatedAt: new Date(),
    }).where(eq(seoConfig.id, pageId));

    return Response.json({ success: true, result });
  } catch (error: any) {
    console.error("SEO Audit failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
