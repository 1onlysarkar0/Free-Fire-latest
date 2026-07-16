import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { db } from "@/db/drizzle";
import { invitation, invitationUse, invitationConfig, user as userTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import InviteClient from "./_components/invite-client";

export const instant = false;

export default async function InvitePage() {
  await connection();
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);


  if (!session?.user?.id) {
    redirect("/sign-in?returnTo=/dashboard/invite");
  }

  const userId = session.user.id;

  const [[configRow], [invRow]] = await Promise.all([
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

  const enabled = configRow?.enabled ?? false;
  const inviterBonus = configRow?.inviterBonus ?? 50;
  const inviteeBonus = configRow?.inviteeBonus ?? 25;

  let initialUses: Array<{
    id: string;
    signupMethod: string;
    inviterBonusAmount: number;
    inviteeBonusAmount: number;
    createdAt: string;
    inviteeName: string | null;
    inviteeEmail: string | null;
    inviteeGameName: string | null;
  }> = [];

  if (invRow) {
    const rawUses = await db
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
      .where(eq(invitationUse.invitationId, invRow.id))
      .orderBy(desc(invitationUse.createdAt));

    initialUses = rawUses.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  return (
    <InviteClient
      enabled={enabled}
      inviterBonus={inviterBonus}
      inviteeBonus={inviteeBonus}
      initialInvitation={
        invRow
          ? {
              ...invRow,
              createdAt: invRow.createdAt.toISOString(),
              updatedAt: invRow.updatedAt.toISOString(),
            }
          : null
      }
      initialUses={initialUses}
    />
  );
}
