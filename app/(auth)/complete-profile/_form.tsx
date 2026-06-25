"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/spinner";
import OnboardingDialog from "@/components/onboarding-dialog";

export function CompleteProfileForm({ siteName }: { siteName: string }) {
  const [checking, setChecking] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [userName, setUserName] = useState("");
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const session = await authClient.getSession();
      if (!session?.data?.user) {
        router.push("/sign-in");
        return;
      }

      const profileRes = await fetch("/api/user/profile");
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile.gameName) {
          router.push("/dashboard");
          return;
        }
        if (profile.name) setUserName(profile.name);
        if (profile.hasPassword !== undefined && !profile.hasPassword) {
          setNeedsPassword(true);
        }
      }

      setChecking(false);
    };

    check();
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center w-full max-w-[400px]">
        <Spinner className="size-8 text-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px]">
      <OnboardingDialog needsPassword={needsPassword} siteName={siteName} userName={userName} />
    </div>
  );
}
