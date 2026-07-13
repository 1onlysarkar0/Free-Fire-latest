import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { indexingApiConfig } from "@/db/schema";
import { getOrGenerateIndexNowKey } from "@/lib/indexing";

export const instant = false;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedKey = searchParams.get("key");
    const actualKey = await getOrGenerateIndexNowKey();

    if (requestedKey && requestedKey !== actualKey) {
      return new NextResponse("Key not found", { status: 404 });
    }

    return new NextResponse(actualKey, {
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
