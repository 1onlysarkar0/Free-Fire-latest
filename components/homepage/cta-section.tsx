"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRight, Trophy } from "lucide-react";
import { useImageUrl } from "@/components/image-cache-provider";

interface CtaSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  imageSrc?: string;
  imageAlt?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
}

const CtaSection = React.forwardRef<HTMLDivElement, CtaSectionProps>(
  ({ className, imageSrc = "/assets/cta-image.svg", imageAlt = "Free Fire Tournament Arena", title = "Join the Arena", subtitle = "Turn Your Free Fire Skills Into Real Cash.", description = "Enter daily solo, duo, and squad rooms. Dominate the battleground, build your leaderboard rank, and withdraw your cash prizes instantly via UPI.", buttonText = "Get Started", buttonUrl = "/sign-in", ...props }, ref) => {
    const imgUrl = useImageUrl();
    return (
      <section className="w-full overflow-x-hidden my-4 sm:my-8 lg:my-12" style={{ background: 'transparent', padding: 'clamp(64px, 10vw, 136px) 0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 clamp(20px, 5vw, 48px)' }}>
          <div
            ref={ref}
            className={cn("grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center w-full", className)}
            {...props}
          >

            {/* IMAGE COLUMN */}
            <div className="relative w-full max-w-lg lg:max-w-none mx-auto px-3 sm:px-4 lg:px-0">
              {/* Glow */}
              <div style={{
                position: 'absolute', inset: '-10% -6%',
                background: 'radial-gradient(ellipse at 40% 50%, rgba(255,51,0,0.09) 0%, transparent 68%)',
                pointerEvents: 'none', zIndex: 0,
              }} />
              {/* Bracket top-left */}
              <div className="absolute -top-2 -left-1 sm:-top-3 sm:-left-2 w-8 h-8 sm:w-10 sm:h-10 border-t-2 border-l-2 border-[#FF3300] rounded-tl z-20 opacity-60 pointer-events-none" />
              {/* Bracket bottom-right */}
              <div className="absolute -bottom-2 -right-1 sm:-bottom-3 sm:-right-2 w-8 h-8 sm:w-10 sm:h-10 border-b-2 border-r-2 border-[#FF3300] rounded-br z-20 opacity-60 pointer-events-none" />
              
              <Image
                src={imgUrl(imageSrc)}
                alt={imageAlt}
                width={420}
                height={420}
                style={{
                  position: 'relative', zIndex: 1,
                  width: '100%', aspectRatio: '1 / 1',
                  objectFit: 'cover', display: 'block',
                  borderRadius: '16px',
                  boxShadow: '0 24px 64px rgba(44,42,40,0.12), 0 6px 16px rgba(44,42,40,0.07)',
                }}
                className="max-w-[420px] mx-auto"
              />
            </div>

            {/* CONTENT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>

              {/* Eyebrow */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ width: '28px', height: '2px', background: '#FF3300', borderRadius: '1px', flexShrink: 0 }} />
                <span style={{
                  color: '#FF3300', fontSize: '11px',
                  letterSpacing: '0.16em', fontWeight: 700, textTransform: 'uppercase',
                }}>
                  {title}
                </span>
              </div>

              {/* Headline */}
              <h2 style={{
                fontFamily: 'var(--font-lora), serif',
                fontSize: 'clamp(28px, 3.5vw, 46px)',
                lineHeight: 1.12, fontWeight: 600,
                color: 'hsl(var(--foreground))',
                letterSpacing: '-0.02em', marginBottom: '18px',
              }}>
                Turn Your Free Fire Skills Into{' '}
                <span style={{ color: '#FF3300', whiteSpace: 'nowrap' }}>Real Cash.</span>
              </h2>

              {/* Divider */}
              <div style={{
                width: '48px', height: '2px',
                background: 'hsl(var(--border))',
                borderRadius: '1px', marginBottom: '20px',
              }} />

              {/* Body */}
              <p style={{
                color: 'hsl(var(--muted-foreground))',
                fontSize: 'clamp(14px, 1.6vw, 16px)',
                lineHeight: 1.75, marginBottom: '32px',
              }}>
                {description}
              </p>

              {/* Ghost Button */}
              <Link
                href={buttonUrl}
                prefetch={true}
                className="group inline-flex items-center gap-[7px] px-5 py-[9px] bg-transparent text-[#FF3300] hover:bg-[#FF3300] hover:text-white border border-[#FF3300] hover:border-[#FF3300] rounded-[7px] font-semibold text-[13px] no-underline tracking-[0.01em] transition-colors duration-200"
              >
                <Trophy style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                {buttonText}
                <ArrowRight style={{ width: '13px', height: '13px', flexShrink: 0 }} />
              </Link>

            </div>
          </div>
        </div>
      </section>
    );
  }
);
CtaSection.displayName = "CtaSection";

export { CtaSection };
