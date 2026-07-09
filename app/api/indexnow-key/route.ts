import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { indexingApiConfig } from "@/db/schema";
import { getOrGenerateIndexNowKey } from "@/lib/indexing";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const key = await getOrGenerateIndexNowKey();

    return new NextResponse(key, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    console.error("IndexNow Key Error:", error);
    return new NextResponse("Error fetching key", { status: 500 });
  }
}
