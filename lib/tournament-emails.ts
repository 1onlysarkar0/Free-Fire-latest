import "server-only";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { sendRawEmail } from "@/lib/mailer";
import { getAdminSiteConfigCached } from "@/lib/admin-data";
import { createNotification, createNotificationsForUsers } from "@/lib/notifications";

// ─────────────────────────────────────────────────────────────────────────────
// Email helpers — all fire-and-forget (do not await at call site)
// ─────────────────────────────────────────────────────────────────────────────

function buildEmailWrapper(title: string, bodyContent: string, siteName = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#FF5A1F;padding:32px 40px;text-align:center;">
          <span style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">${siteName}</span>
        </td></tr>
        <tr><td style="padding:40px 40px 20px 40px;">
          ${bodyContent}
        </td></tr>
        <tr><td style="padding:20px 40px 32px 40px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">&copy; ${siteName} &middot; All rights reserved</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Notify all participants that room credentials are available.
 * Does NOT include the actual Room ID/Password in the email for security.
 * Fire-and-forget — do NOT await this at the call site.
 */
export async function sendRoomRevealedNotifications(opts: {
  tournamentId: string;
  tournamentName: string;
  startTime: Date;
  participantUserIds: string[];
  siteUrl?: string;
}) {
  const { tournamentId, tournamentName, startTime, participantUserIds, siteUrl } = opts;
  const baseUrl = siteUrl || process.env.NEXT_PUBLIC_APP_URL || "";
  if (participantUserIds.length === 0) return;

  const config = await getAdminSiteConfigCached().catch(() => null);
  const siteName = config?.logoTitle ?? "";

  // Create in-app notifications
  try {
    await createNotificationsForUsers({
      userIds: participantUserIds,
      title: "Room Credentials Released!",
      message: `Room ID & Password for "${tournamentName}" are now available. Log in and view them on the tournament page immediately.`,
      type: "ROOM_REVEALED",
      referenceId: tournamentId,
    });
  } catch (err) {
    console.error("[TournamentEmails] Failed to create room-revealed notifications:", err);
  }

  // Send emails in parallel
  try {
    const users = await db
      .select({ email: user.email, name: user.name })
      .from(user)
      .where(inArray(user.id, participantUserIds));

    const startStr = startTime.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });

    await Promise.allSettled(
      users.map((u) => {
        const body = `
        <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">🔑 Room ID & Password Released!</h1>
        <p style="margin:0 0 16px 0;font-size:15px;color:#6b7280;line-height:1.6;">
          Hi <strong>${u.name}</strong>, the Room ID and Password for <strong>${tournamentName}</strong> are now available!
        </p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0;font-size:14px;color:#c2410c;font-weight:600;">⚠️ Important</p>
          <p style="margin:8px 0 0 0;font-size:14px;color:#9a3412;line-height:1.5;">
            For security, credentials are NOT included in this email. Log in to your account immediately to view them on the tournament page.
          </p>
        </div>
        <p style="margin:0 0 8px 0;font-size:14px;color:#6b7280;">Tournament: <strong>${tournamentName}</strong></p>
        <p style="margin:0 0 20px 0;font-size:14px;color:#6b7280;">Start Time: <strong>${startStr} (IST)</strong></p>
        <a href="${baseUrl}/tournaments/${tournamentId}" style="display:inline-block;background:#FF5A1F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;margin-bottom:16px;">
          View Room Credentials
        </a>
        <p style="margin:8px 0 0 0;font-size:13px;color:#9ca3af;">Do NOT share room credentials with anyone outside your team.</p>
      `;
        return sendRawEmail({
          to: u.email,
          subject: `Room ID & Password Released — ${tournamentName} is Starting!`,
          html: buildEmailWrapper("Room Credentials Released", body, siteName),
        }).catch((err) => console.error(`[TournamentEmails] Email failed for ${u.email}:`, err));
      })
    );
  } catch (err) {
    console.error("[TournamentEmails] Room-revealed email batch failed:", err);
  }
}

/**
 * Notify all participants of a tournament cancellation with refund info.
 * Fire-and-forget — do NOT await at call site.
 */
export async function sendTournamentCancelledNotifications(opts: {
  tournamentId: string;
  tournamentName: string;
  cancellationReason: string;
  participants: { userId: string; refundAmount: number }[];
  siteUrl?: string;
}) {
  const { tournamentId, tournamentName, cancellationReason, participants, siteUrl } = opts;
  const baseUrl = siteUrl || process.env.NEXT_PUBLIC_APP_URL || "";
  if (participants.length === 0) return;

  const config = await getAdminSiteConfigCached().catch(() => null);
  const siteName = config?.logoTitle ?? "";

  const userIds = participants.map((p) => p.userId);
  const refundMap = new Map(participants.map((p) => [p.userId, p.refundAmount]));

  // In-app notifications
  try {
    await createNotificationsForUsers({
      userIds,
      title: `Tournament Cancelled: ${tournamentName}`,
      message: `${tournamentName} has been cancelled. Reason: ${cancellationReason}. Any refunds have been credited to your wallet.`,
      type: "TOURNAMENT_CANCELLED",
      referenceId: tournamentId,
    });
  } catch (err) {
    console.error("[TournamentEmails] Failed to create cancellation notifications:", err);
  }

  // Emails in parallel
  try {
    const users = await db
      .select({ id: user.id, email: user.email, name: user.name })
      .from(user)
      .where(inArray(user.id, userIds));

    await Promise.allSettled(
      users.map((u) => {
        const refundAmount = refundMap.get(u.id) ?? 0;
        const refundLine =
          refundAmount > 0
            ? `<p style="margin:0 0 8px 0;font-size:14px;color:#6b7280;">Refund Credited: <strong style="color:#16a34a;">${refundAmount} coins</strong> have been added to your wallet.</p>`
            : `<p style="margin:0 0 8px 0;font-size:14px;color:#6b7280;">No refund was issued for your slot.</p>`;

        const body = `
        <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">Tournament Cancelled</h1>
        <p style="margin:0 0 16px 0;font-size:15px;color:#6b7280;line-height:1.6;">
          Hi <strong>${u.name}</strong>, we regret to inform you that <strong>${tournamentName}</strong> has been cancelled.
        </p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0;font-size:14px;color:#991b1b;font-weight:600;">Cancellation Reason</p>
          <p style="margin:8px 0 0 0;font-size:14px;color:#7f1d1d;">${cancellationReason}</p>
        </div>
        ${refundLine}
        <a href="${baseUrl}/dashboard/wallet" style="display:inline-block;background:#FF5A1F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;margin-top:8px;">
          View Wallet Balance
        </a>
      `;

        return sendRawEmail({
          to: u.email,
          subject: `${tournamentName} has been Cancelled`,
          html: buildEmailWrapper("Tournament Cancelled", body, siteName),
        }).catch((err) => console.error(`[TournamentEmails] Cancellation email failed for ${u.email}:`, err));
      })
    );
  } catch (err) {
    console.error("[TournamentEmails] Cancellation email batch failed:", err);
  }
}

/**
 * Notify a winner that their prize has been credited.
 * Fire-and-forget — do NOT await at call site.
 */
export async function sendPrizeCreditedNotification(opts: {
  userId: string;
  tournamentId: string;
  tournamentName: string;
  prizeAmount: number;
  placement: string;
  siteUrl?: string;
}) {
  const { userId, tournamentId, tournamentName, prizeAmount, placement, siteUrl } = opts;
  const baseUrl = siteUrl || process.env.NEXT_PUBLIC_APP_URL || "";

  const config = await getAdminSiteConfigCached().catch(() => null);
  const siteName = config?.logoTitle ?? "";

  // In-app notification
  try {
    await createNotification({
      userId,
      title: `🏆 You Won ${prizeAmount} Coins!`,
      message: `Congratulations! You placed ${placement} in "${tournamentName}" and won ${prizeAmount} coins. Prize has been credited to your wallet.`,
      type: "PRIZE_CREDITED",
      referenceId: tournamentId,
    });
  } catch (err) {
    console.error("[TournamentEmails] Failed to create prize notification:", err);
  }

  // Email
  try {
    const [u] = await db
      .select({ email: user.email, name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!u) return;

    const body = `
      <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#111827;">🏆 Congratulations, ${u.name}!</h1>
      <p style="margin:0 0 16px 0;font-size:15px;color:#6b7280;line-height:1.6;">
        You finished <strong>${placement}</strong> in <strong>${tournamentName}</strong> and your prize has been credited!
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
        <p style="margin:0;font-size:13px;color:#166534;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Prize Credited</p>
        <p style="margin:8px 0 0 0;font-size:36px;font-weight:800;color:#15803d;">${prizeAmount} coins</p>
      </div>
      <a href="${baseUrl}/dashboard/wallet" style="display:inline-block;background:#FF5A1F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
        View My Wallet
      </a>
    `;

    await sendRawEmail({
      to: u.email,
      subject: `Congratulations! You won ${prizeAmount} coins in ${tournamentName}!`,
      html: buildEmailWrapper("Prize Credited", body, siteName),
    }).catch((err) => console.error(`[TournamentEmails] Prize email failed for ${u.email}:`, err));
  } catch (err) {
    console.error("[TournamentEmails] Prize email failed:", err);
  }
}
