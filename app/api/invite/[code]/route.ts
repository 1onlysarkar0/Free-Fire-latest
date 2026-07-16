import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { invitation, invitationConfig, user as userTable } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/invite/[code]
// Public: validates an invite code and returns inviter details for sign-up form UX
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!code || code.length < 3) {
    return NextResponse.json({ valid: false, reason: "invalid_code" });
  }

  const [[config], [inv]] = await Promise.all([
    db
      .select({ enabled: invitationConfig.enabled })
      .from(invitationConfig)
      .where(eq(invitationConfig.id, "default"))
      .limit(1),
    db
      .select({
        id: invitation.id,
        code: invitation.code,
        isActive: invitation.isActive,
        userId: invitation.userId,
        inviterName: userTable.name,
        inviterImage: userTable.image,
      })
      .from(invitation)
      .innerJoin(userTable, eq(invitation.userId, userTable.id))
      .where(eq(invitation.code, code))
      .limit(1),
  ]);

  if (!config?.enabled) {
    return NextResponse.json({ valid: false, reason: "disabled" });
  }

  if (!inv || !inv.isActive) {
    return NextResponse.json({ valid: false, reason: "not_found" });
  }

  return NextResponse.json({
    valid: true,
    code: inv.code,
    inviterName: inv.inviterName || "A Gaming Member",
    inviterImage: inv.inviterImage ?? null,
  });
}