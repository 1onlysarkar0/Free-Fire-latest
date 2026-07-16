import { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import {
  invitation,
  invitationConfig,
  invitationUse,
  user as userTable,
  account,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { creditWallet } from "@/lib/wallet";
import { createNotification } from "@/lib/notifications";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

const BodySchema = z.object({
  code: z.string().min(1).max(50),
});

// POST /api/user/apply-invite
// Called right after a user signs up to apply an invite bonus.
// Security guarantees:
// - Requires valid session (user must be authenticated)
// - Validates code exists and is active
// - Prevents self-invite
// - REQUIRE GOOGLE OAUTH: Manual email signups cannot claim referral bonuses
// - Unique index on invitee_user_id prevents double-crediting
// - All wallet ops inside db.transaction() with idempotency keys
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }
  const inviteeUserId = session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid invite code", 400);
  }

  const { code } = parsed.data;

  // Run in a transaction for atomicity
  try {
    const result = await db.transaction(async (tx) => {
      // 1. Check system enabled
      const [config] = await tx
        .select()
        .from(invitationConfig)
        .where(eq(invitationConfig.id, "default"))
        .limit(1);

      if (!config?.enabled) {
        return { error: "Invitation system is disabled", status: 403 };
      }

      // 2. Validate code
      const [inv] = await tx
        .select()
        .from(invitation)
        .where(eq(invitation.code, code))
        .limit(1);

      if (!inv || !inv.isActive) {
        return { error: "Invalid or inactive invite code", status: 400 };
      }

      // 3. Prevent self-invite
      if (inv.userId === inviteeUserId) {
        return { error: "Cannot use your own invite link", status: 400 };
      }

      // 4. Idempotency: check if this user already used any invite
      const existingUse = await tx
        .select({ id: invitationUse.id })
        .from(invitationUse)
        .where(eq(invitationUse.inviteeUserId, inviteeUserId))
        .limit(1);

      if (existingUse[0]) {
        return { error: "You have already used an invite link", status: 409 };
      }

      // 5. REQUIRE GOOGLE OAUTH: Strictly check Google Account row
      const [googleAccount] = await tx
        .select({ id: account.id })
        .from(account)
        .where(
          and(
            eq(account.userId, inviteeUserId),
            eq(account.providerId, "google")
          )
        )
        .limit(1);

      if (!googleAccount) {
        return {
          error: "Referred signups require Google Authentication.",
          status: 400,
        };
      }
      const signupMethod = "google";


      // 6. Credit both wallets with idempotent keys
      const inviteUseId = nanoid();
      const inviterKey = `invite-inviter-${inviteUseId}`;
      const inviteeKey = `invite-invitee-${inviteUseId}`;

      let inviterTxId: string | undefined;
      let inviteeTxId: string | undefined;

      if (config.inviterBonus > 0) {
        const res = await creditWallet({
          userId: inv.userId,
          amount: config.inviterBonus,
          type: "INVITE_BONUS",
          referenceId: inviteUseId,
          description: `Invite bonus: new user signed up using your link`,
          idempotencyKey: inviterKey,
          tx,
        });
        inviterTxId = res.transactionId;
      }

      if (config.inviteeBonus > 0) {
        const res = await creditWallet({
          userId: inviteeUserId,
          amount: config.inviteeBonus,
          type: "SIGNUP_BONUS",
          referenceId: inviteUseId,
          description: `Welcome bonus: you signed up via an invite link`,
          idempotencyKey: inviteeKey,
          tx,
        });
        inviteeTxId = res.transactionId;
      }

      // 7. Insert invitation_use record
      await tx.insert(invitationUse).values({
        id: inviteUseId,
        invitationId: inv.id,
        inviterUserId: inv.userId,
        inviteeUserId,
        signupMethod,
        inviterBonusAmount: config.inviterBonus,
        inviteeBonusAmount: config.inviteeBonus,
        inviterTransactionId: inviterTxId ?? null,
        inviteeTransactionId: inviteeTxId ?? null,
        createdAt: new Date(),
      });

      // 8. Update invitation stats
      await tx
        .update(invitation)
        .set({
          totalInvites: inv.totalInvites + 1,
          totalEarned: inv.totalEarned + config.inviterBonus,
          updatedAt: new Date(),
        })
        .where(eq(invitation.id, inv.id));

      return {
        success: true,
        inviterBonus: config.inviterBonus,
        inviteeBonus: config.inviteeBonus,
        inviterUserId: inv.userId,
      };
    });

    if ("error" in result) {
      return apiError(result.error as string, result.status as number);
    }

    // Send notifications outside the transaction (fire-and-forget)
    const [inviteeUser, inviterUser] = await Promise.all([
      db.select({ name: userTable.name }).from(userTable).where(eq(userTable.id, inviteeUserId)).limit(1),
      db.select({ name: userTable.name }).from(userTable).where(eq(userTable.id, result.inviterUserId)).limit(1),
    ]);

    const promNotifications: Promise<void>[] = [];

    if (result.inviterBonus > 0) {
      promNotifications.push(
        createNotification({
          userId: result.inviterUserId,
          title: "Invite Bonus Earned!",
          message: `${inviteeUser[0]?.name ?? "Someone"} signed up using your invite link. You earned ${result.inviterBonus} coins!`,
          type: "INVITE_BONUS",
        })
      );
    }

    if (result.inviteeBonus > 0) {
      promNotifications.push(
        createNotification({
          userId: inviteeUserId,
          title: "Welcome Bonus!",
          message: `You received ${result.inviteeBonus} coins as a welcome bonus for signing up via an invite link!`,
          type: "SIGNUP_BONUS",
        })
      );
    }

    await Promise.allSettled(promNotifications);

    return apiSuccess({
      message: "Invite applied successfully.",
      inviterBonus: result.inviterBonus,
      inviteeBonus: result.inviteeBonus,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to apply invite";
    console.error("[apply-invite] Error:", message);
    // Unique constraint on invitee means double-use returns a pg error
    if (message.includes("unique") || message.includes("duplicate")) {
      return apiError("Invite already applied for this account.", 409);
    }
    return apiError("Failed to apply invite bonus.", 500);
  }
}