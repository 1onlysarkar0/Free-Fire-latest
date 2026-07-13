import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CtaSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  imageSrc: string;
  imageAlt: string;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
}

const CtaSection = React.forwardRef<HTMLDivElement, CtaSectionProps>(
  ({ className, imageSrc, imageAlt, title, subtitle, description, buttonText, buttonUrl, ...props }, ref) => {
    return (
      <section className="py-16 px-8 md:px-12 w-full bg-background/30 border-t border-border/10">
        <div className="mx-auto max-w-7xl w-full">
          {/* Centered Heading */}
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold font-lora text-foreground tracking-tight">
              {title}
            </h2>
          </div>

          {/* Grid Layout sitting directly on the background */}
          <div
            ref={ref}
            className={cn(
              "grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center w-full",
              className
            )}
            {...props}
          >
            {/* Image Section */}
            <div className="w-full overflow-hidden rounded-2xl">
              <Image
                src={imageSrc}
                alt={imageAlt}
                width={600}
                height={400}
                className="w-full h-full object-cover"
                priority
              />
            </div>

            {/* Content Section */}
            <div className="w-full flex flex-col justify-center py-2">
              <div>
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight font-lora text-foreground leading-tight">
                  {subtitle}
                </h3>
                <p className="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed font-ibm">
                  {description}
                </p>
                <div className="mt-6">
                  <Link
                    href={buttonUrl}
                    prefetch={true}
                    className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors duration-150 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2.5 shadow-xs w-fit font-ibm"
                  >
                    {buttonText}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
);
CtaSection.displayName = "CtaSection";

export { CtaSection };
