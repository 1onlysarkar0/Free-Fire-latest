import { requireAdminOrRole } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const admin = await requireAdminOrRole(request);
  if (admin instanceof Response) return admin;

  try {
    // Purge the entire Next.js Cache (Server-side)
    revalidatePath("/", "layout");

    // Respond to the client to clear browser caches using Clear-Site-Data header
    return new Response(
      JSON.stringify({ ok: true, message: "Cache purged successfully" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Clear-Site-Data": '"cache"',
        },
      }
    );
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Failed to purge cache" },
      { status: 500 }
    );
  }
}
