import AuthLeftPanel from "@/components/auth/auth-left-panel";
import { getAuthPageConfig } from "@/lib/auth-page-config";
import { getAuthPageText } from "@/lib/content";
import { getSeoData, buildMetadata } from "@/lib/seo";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { SignInForm } from "./_form";
import { getSiteUrl } from "@/lib/site-url";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// TODO: Cache Components adoption — restore export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [seo, siteUrl] = await Promise.all([
      getSeoData("sign-in"),
      getSiteUrl(),
    ]);
    return buildMetadata(seo, siteUrl || undefined, undefined, undefined, undefined, "/sign-in");
  } catch {
    return {};
  }
}

export default async function SignInPage() {
  const [config, text] = await Promise.all([
    getAuthPageConfig(),
    getAuthPageText("sign-in"),
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
            className="w-7 h-7 rounded-sm"
            priority
          />
          <span className="text-lg sm:text-xl font-bold font-momo text-foreground">
            {config.logo.title}
          </span>
        </Link>

        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  );
}
