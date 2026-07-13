import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserProfileCached } from "@/lib/user-data";
import SettingsPageClient from "./_settings-client";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const sessionResult = await auth.api.getSession({ headers: await headers() });

  if (!sessionResult) {
    redirect("/sign-in");
  }

  const profile = await getUserProfileCached(sessionResult.user.id);

  if (!profile) {
    redirect("/sign-in");
  }

  const initialProfile = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    image: profile.image,
    gameName: profile.gameName,
    uid: profile.uid,
    twoFactorEnabled: profile.twoFactorEnabled,
    emailVerified: profile.emailVerified,
  };

  return <SettingsPageClient initialProfile={initialProfile} />;
}
