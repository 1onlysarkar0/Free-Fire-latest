import type { AuthPageConfig } from "@/lib/auth-page-config";
import Image from "next/image";
import Link from "next/link";
import { Large, P, Muted, Blockquote } from "@/components/ui/typography";

interface AuthLeftPanelProps {
  config: AuthPageConfig;
  quote: string;
  subtext: string;
}

export default function AuthLeftPanel({ config, quote, subtext }: AuthLeftPanelProps) {
  const hasImage = !!config.panel.imageUrl;

  return (
    <div
      className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 overflow-hidden"
      style={
        hasImage
          ? {
              backgroundImage: `url(${config.panel.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : { backgroundColor: config.panel.color || "var(--color-primary)" }
      }
    >
      {hasImage && (
        <div className="absolute inset-0 bg-black/55" />
      )}

      <div className="relative z-10">
        <Link href={config.logo.url} prefetch={true} className="flex items-center gap-2.5">
          <Image
            src={config.logo.src}
            alt={config.logo.alt}
            width={36}
            height={36}
            className="w-9 h-9 rounded-sm"
            priority
          />
          <Large className="text-white text-2xl font-bold font-momo">
            {config.logo.title}
          </Large>
        </Link>
      </div>

      <div className="relative z-10">
        <Blockquote className="text-white text-3xl font-semibold leading-snug mb-4 border-none pl-0 italic">
          &ldquo;{quote}&rdquo;
        </Blockquote>
        <P className="text-white/80 text-base">{subtext}</P>
      </div>

      <Muted className="relative z-10 text-white/50 text-sm">{config.copyright}</Muted>
    </div>
  );
}
