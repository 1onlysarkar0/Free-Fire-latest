import { NextResponse } from "next/server";

export function apiSuccess(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function rethrowIfPrerenderError(error: unknown) {
  if (error && typeof error === "object" && "digest" in error) {
    const digest = String((error as any).digest || "");
    if (digest.startsWith("NEXT_PRERENDER") || digest.includes("HANGING_PROMISE")) {
      throw error;
    }
  }
}
