import AuthLeftPanel from "@/components/auth/auth-left-panel";
import { getAuthPageConfig } from "@/lib/auth-page-config";
import { getAuthPageText } from "@/lib/content";
import { getSeoData, buildMetadata } from "@/lib/seo";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "./_form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const seo = await getSeoData("reset-password");
    return buildMetadata(seo, process.env.NEXT_PUBLIC_APP_URL as string);
  } catch {
    return {};
  }
}

export default async function ResetPasswordPage() {
  const [config, text] = await Promise.all([
    getAuthPageConfig(),
    getAuthPageText("reset-password"),
  ]);

  return (
    <div className="min-h-dvh flex bg-background">
      <AuthLeftPanel config={config} quote={text.quote} subtext={text.subtext} />

      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 md:p-10">
        <Link
          href={config.logo.url}
          prefetch={true}
          className="flex items-center gap-2 mb-6 sm:mb-8 lg:hidden"
        >
          <Image
            src={config.logo.src}
            alt={config.logo.alt}
            width={28}
            height={28}
            className="rounded-sm"
            priority
          />
          <span className="text-lg sm:text-xl font-bold font-momo text-foreground">
            {config.logo.title}
          </span>
        </Link>

        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
