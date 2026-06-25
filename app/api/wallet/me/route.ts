import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getOrCreateWallet } from "@/lib/wallet";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return apiError("Authentication required", 401);
    }

    const walletRow = await getOrCreateWallet(session.user.id);

    return apiSuccess({ balance: walletRow.balance });
  } catch (err) {
    console.error("[API/wallet/me] error:", err);
    return apiError("Failed to fetch wallet", 500);
  }
}
