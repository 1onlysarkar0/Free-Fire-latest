import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { indexingApiConfig, indexingLog } from "@/db/schema";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminOrRole(request, "seo:view");

    const [config] = await db.select().from(indexingApiConfig).limit(1);
    const logs = await db.select().from(indexingLog).orderBy(desc(indexingLog.createdAt)).limit(50);

    const activeConfig = config ? {
      ...config,
      indexNowKey: process.env.INDEXNOW_KEY || "",
    } : {
      id: "default",
      googleServiceAccountJson: "",
      indexNowKey: process.env.INDEXNOW_KEY || "",
      autoSubmitGoogle: false,
      autoSubmitIndexNow: false,
    };

    return NextResponse.json({ config: activeConfig, logs });
  } catch (error: any) {
    console.error("GET Indexing Config Error:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdminOrRole(request, "seo:edit");
    const body = await request.json();

    const [existing] = await db.select().from(indexingApiConfig).limit(1);

    if (existing) {
      await db.update(indexingApiConfig).set({
        googleServiceAccountJson: body.googleServiceAccountJson,
        autoSubmitGoogle: body.autoSubmitGoogle,
        autoSubmitIndexNow: body.autoSubmitIndexNow,
        updatedAt: new Date(),
      });
    } else {
      await db.insert(indexingApiConfig).values({
        id: "default",
        googleServiceAccountJson: body.googleServiceAccountJson,
        autoSubmitGoogle: body.autoSubmitGoogle,
        autoSubmitIndexNow: body.autoSubmitIndexNow,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT Indexing Config Error:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
