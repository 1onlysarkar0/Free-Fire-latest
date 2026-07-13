import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserTournamentsForDashboard } from "@/lib/user-data";
import MyTournamentsClient from "./_components/my-tournaments-client";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export default async function MyTournamentsPage() {
  const session = await auth.api.getSession({ 
    headers: await headers() 
  }).catch(() => null);

  if (!session?.user) {
    redirect("/sign-in?returnTo=/dashboard/my-tournaments");
    return;
  }

  const initialData = await getUserTournamentsForDashboard(session.user.id);

  return <MyTournamentsClient initialData={initialData} />;
}
