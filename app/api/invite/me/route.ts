import { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import { invitation, invitationUse, invitationConfig, user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { eq, desc } from "drizzle-orm";

// GET /api/invite/me
// Returns the current user's invite data + referrals list
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }
  const userId = session.user.id;

  const [[config], [inv]] = await Promise.all([
    db
      .select()
      .from(invitationConfig)
      .where(eq(invitationConfig.id, "default"))
      .limit(1),
    db
      .select()
      .from(invitation)
      .where(eq(invitation.userId, userId))
      .limit(1),
  ]);

  if (!config?.enabled) {
    return apiError("Invitation system is currently disabled.", 403);
  }

  if (!inv) {
    return apiSuccess({
      invitation: null,
      uses: [],
      config: { inviterBonus: config.inviterBonus, inviteeBonus: config.inviteeBonus },
    });
  }

  const uses = await db
    .select({
      id: invitationUse.id,
      signupMethod: invitationUse.signupMethod,
      inviterBonusAmount: invitationUse.inviterBonusAmount,
      inviteeBonusAmount: invitationUse.inviteeBonusAmount,
      createdAt: invitationUse.createdAt,
      inviteeName: userTable.name,
      inviteeEmail: userTable.email,
      inviteeGameName: userTable.gameName,
    })
    .from(invitationUse)
    .innerJoin(userTable, eq(invitationUse.inviteeUserId, userTable.id))
    .where(eq(invitationUse.invitationId, inv.id))
    .orderBy(desc(invitationUse.createdAt));

  return apiSuccess({
    invitation: {
      ...inv,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
    },
    uses: uses.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
    config: { inviterBonus: config.inviterBonus, inviteeBonus: config.inviteeBonus },
  });
}