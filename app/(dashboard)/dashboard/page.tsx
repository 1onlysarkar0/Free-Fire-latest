// Dashboard reads live session data — never cache at page level
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getDashboardConfig } from "@/lib/content";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { H1, P } from "@/components/ui/typography";

export default async function Dashboard() {
  const sessionResult = await auth.api.getSession({ headers: await headers() });

  if (!sessionResult?.user?.id) {
    redirect("/sign-in");
  }

  const userName = sessionResult.user.name || "User";
  const dashConfig = await getDashboardConfig();

  return (
    <section className="flex flex-col items-start justify-start w-full h-full bg-background">
      <div className="w-full bg-background p-6">
        <div className="flex flex-col items-start justify-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-4 py-1.5 mb-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary">
              Welcome Back
            </span>
          </div>
          <H1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground border-none pb-0 mt-0 font-lora">
            Hey, {userName}!
          </H1>
          <P className="text-base text-muted-foreground mt-1 max-w-xl font-ibm">
            {dashConfig.welcomeMessage}
          </P>
        </div>
      </div>
    </section>
  );
}
