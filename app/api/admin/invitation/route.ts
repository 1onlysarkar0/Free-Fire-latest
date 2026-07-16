import { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import {
  invitation,
  invitationConfig,
  user as userTable,
} from "@/db/schema";
import { requireAdminOrRole } from "@/lib/admin-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { invalidateInvitationCache } from "@/lib/cache";
import { eq, desc, count } from "drizzle-orm";
import { z } from "zod";

const ConfigSchema = z.object({
  enabled: z.boolean(),
  inviterBonus: z.number().int().min(0).max(100000),
  inviteeBonus: z.number().int().min(0).max(100000),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdminOrRole(request, "invitation:view");
  if (auth instanceof Response) return auth;

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10));
  const offset = (page - 1) * limit;

  const [configRow, inviterRows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(invitationConfig)
      .where(eq(invitationConfig.id, "default"))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select({
        id: invitation.id,
        code: invitation.code,
        isActive: invitation.isActive,
        totalInvites: invitation.totalInvites,
        totalEarned: invitation.totalEarned,
        createdAt: invitation.createdAt,
        updatedAt: invitation.updatedAt,
        userId: userTable.id,
        userName: userTable.name,
        userEmail: userTable.email,
        userImage: userTable.image,
        userGameName: userTable.gameName,
      })
      .from(invitation)
      .innerJoin(userTable, eq(invitation.userId, userTable.id))
      .orderBy(desc(invitation.totalInvites), desc(invitation.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(invitation),
  ]);

  return apiSuccess({
    config: configRow ?? {
      id: "default",
      enabled: false,
      inviterBonus: 50,
      inviteeBonus: 25,
    },
    users: inviterRows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdminOrRole(request, "invitation:edit");
  if (auth instanceof Response) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = ConfigSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid data", 400);
  }

  const { enabled, inviterBonus, inviteeBonus } = parsed.data;

  await db
    .insert(invitationConfig)
    .values({
      id: "default",
      enabled,
      inviterBonus,
      inviteeBonus,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: invitationConfig.id,
      set: { enabled, inviterBonus, inviteeBonus, updatedAt: new Date() },
    });

  await invalidateInvitationCache();
  return apiSuccess({ message: "Invitation settings updated." });
}
