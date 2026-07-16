import { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import { invitation, invitationUse, user as userTable } from "@/db/schema";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdminOrRole(request, "invitation:view");
  if (auth instanceof Response) return auth;

  const { userId } = await params;

  const [inv] = await db
    .select()
    .from(invitation)
    .where(eq(invitation.userId, userId))
    .limit(1);

  if (!inv) {
    return apiError("No invitation found for this user", 404);
  }

  const uses = await db
    .select({
      id: invitationUse.id,
      signupMethod: invitationUse.signupMethod,
      inviterBonusAmount: invitationUse.inviterBonusAmount,
      inviteeBonusAmount: invitationUse.inviteeBonusAmount,
      createdAt: invitationUse.createdAt,
      inviteeUserId: invitationUse.inviteeUserId,
      inviteeName: userTable.name,
      inviteeEmail: userTable.email,
      inviteeGameName: userTable.gameName,
      inviteeImage: userTable.image,
    })
    .from(invitationUse)
    .innerJoin(userTable, eq(invitationUse.inviteeUserId, userTable.id))
    .where(eq(invitationUse.invitationId, inv.id))
    .orderBy(desc(invitationUse.createdAt));

  const [inviter] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      image: userTable.image,
      gameName: userTable.gameName,
      createdAt: userTable.createdAt,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  return apiSuccess({
    inviter: inviter
      ? { ...inviter, createdAt: inviter.createdAt.toISOString() }
      : null,
    invitation: {
      ...inv,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
    },
    uses: uses.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}