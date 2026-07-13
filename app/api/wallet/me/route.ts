import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getOrCreateWallet } from "@/lib/wallet";
import { apiSuccess, apiError, rethrowIfPrerenderError } from "@/lib/api-response";
import type { NextRequest } from "next/server";

export const instant = false;

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
    if (!session?.user?.id) {
      return apiError("Authentication required", 401);
    }

    const walletRow = await getOrCreateWallet(session.user.id);

    return apiSuccess({ balance: walletRow.balance });
  } catch (err) {
    rethrowIfPrerenderError(err);
    console.error("[API/wallet/me] error:", err);
    return apiError("Failed to fetch wallet", 500);
  }
}
