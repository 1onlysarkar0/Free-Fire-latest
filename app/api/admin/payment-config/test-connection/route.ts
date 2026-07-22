import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrRole } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const adminUser = await requireAdminOrRole(request, "payment:config_edit");
  if (adminUser instanceof Response) return adminUser;

  return NextResponse.json({
    success: true,
    message: "Email Webhook Ingestion mode active. Cloudflare Worker handles incoming payment emails.",
  });
}
