import { NextResponse } from "next/server";
import { submitUrlForIndexing } from "@/lib/indexing";
import { requireAdminOrRole } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireAdminOrRole(request, "seo:edit");
    const body = await request.json();

    if (!body.url) {
      return new NextResponse("Missing URL", { status: 400 });
    }

    // Call the submission wrapper
    await submitUrlForIndexing(body.url, "URL_UPDATED");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Manual Submit Indexing Error:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
