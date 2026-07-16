import { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import { invitation, invitationConfig } from "@/db/schema";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// POST /api/invite/activate
// Creates or reactivates the logged-in user's invite link
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }
  const userId = session.user.id;

  // Check invitation system is enabled
  const [config] = await db
    .select({ enabled: invitationConfig.enabled })
    .from(invitationConfig)
    .where(eq(invitationConfig.id, "default"))
    .limit(1);

  if (!config?.enabled) {
    return apiError("Invitation system is currently disabled.", 403);
  }

  // Upsert invitation row for this user
  const existingRows = await db
    .select()
    .from(invitation)
    .where(eq(invitation.userId, userId))
    .limit(1);

  if (existingRows[0]) {
    // Already has one — just make sure it's active
    if (!existingRows[0].isActive) {
      await db
        .update(invitation)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(invitation.userId, userId));
    }
    return apiSuccess({
      code: existingRows[0].code,
      isActive: true,
      message: "Invite link activated.",
    });
  }

  // Create new invite record with a unique code
  const code = nanoid(10);
  const id = nanoid();
  await db.insert(invitation).values({
    id,
    userId,
    code,
    isActive: true,
    totalInvites: 0,
    totalEarned: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return apiSuccess({
    code,
    isActive: true,
    message: "Invite link created successfully.",
  });
}