import Link from "next/link";
import Image from "next/image";
import * as LucideIcons from "lucide-react";
import { getFooterConfig } from "@/lib/navigation";
import { Separator } from "@/components/ui/separator";
import { Large, Muted } from "@/components/ui/typography";

const getSocialIcon = (name: string) => {
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!IconComponent) {
    const GlobeIcon = LucideIcons.Globe;
    return <GlobeIcon className="size-7" />;
  }
  return <IconComponent className="size-7" />;
};

export default async function FooterSection() {
  const config = await getFooterConfig();
  const { logo, menu, socials, copyright } = config;

  return (
    <footer className="bg-background pt-10 pb-12">
      <div className="mx-auto max-w-5xl px-6">

        {/* Divider */}
        <div className="mb-10 px-8">
          <Separator className="bg-border" />
        </div>

        {/* Brand Logo and Title */}
        <Link
          href={logo.url}
          prefetch={true}
          className="mx-auto flex items-center justify-center gap-2.5 hover:opacity-90 transition-opacity size-fit"
        >
          <Image src={logo.src} className="w-8 h-8 object-contain" alt={logo.alt} width={32} height={32} suppressHydrationWarning />
          <Large className="text-2xl font-normal tracking-tight font-momo text-foreground">
            {logo.title}
          </Large>
        </Link>

        {/* Dynamic Navigation Links */}
        {menu.length > 0 && (
          <div className="mt-8 mb-6 flex flex-wrap justify-center gap-6">
            {menu.map((link, index) => (
              <Link
                key={index}
                href={link.url}
                prefetch={true}
                className="text-sm font-semibold text-foreground hover:text-primary transition-colors duration-150 hover:no-underline footer-nav-link"
              >
                <span>{link.title}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Dynamic Social Media Icon Links */}
        {socials.length > 0 && (
          <div className="my-6 flex flex-wrap justify-center gap-5">
            {socials.map((social, idx) => (
              <Link
                key={idx}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.title}
                className="text-foreground hover:text-foreground transition-colors duration-150 footer-social-link"
              >
                {getSocialIcon(social.icon)}
              </Link>
            ))}
          </div>
        )}


        {/* Copyright — sourced from DB siteConfig.copyrightText */}
        <Muted
          className="block text-center text-xs tracking-wide mt-6 text-muted-foreground"
        >
          {copyright}
        </Muted>
      </div>
    </footer>
  );
}
