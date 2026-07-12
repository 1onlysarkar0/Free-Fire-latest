"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PANEL_EASE = [0.16, 1, 0.3, 1] as const;
const EXPAND_SPRING = {
  type: "spring" as const,
  stiffness: 150,
  damping: 26,
  mass: 1.05,
};
const COLLAPSE_SPRING = {
  type: "spring" as const,
  stiffness: 190,
  damping: 30,
  mass: 1.1,
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export function LandingFaq({ items }: { items: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="relative py-20 w-full border-t border-border/10 bg-background/50">
      <div className="mx-auto w-full max-w-2xl px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 font-lora text-foreground tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-xl mx-auto font-ibm leading-relaxed">
            Got questions? We&apos;ve got answers. If you can&apos;t find what you are looking for, check out our full FAQ.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {items.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl bg-muted/70 dark:bg-muted/30 border border-border"
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset cursor-pointer"
                  type="button"
                >
                  <span className="font-semibold text-[15px] text-foreground leading-6 tracking-[-0.02em] font-ibm">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                <motion.div
                  animate={{ height: isOpen ? "auto" : 0 }}
                  className="overflow-hidden"
                  initial={false}
                  transition={{
                    height: isOpen ? EXPAND_SPRING : COLLAPSE_SPRING,
                  }}
                >
                  <motion.div
                    animate={{
                      opacity: isOpen ? 1 : 0,
                      y: isOpen ? 0 : -6,
                    }}
                    className="px-5 pb-5 text-[14px] text-muted-foreground leading-6 whitespace-pre-wrap font-ibm"
                    initial={false}
                    transition={{
                      opacity: {
                        duration: isOpen ? 0.38 : 0.2,
                        ease: PANEL_EASE,
                        delay: isOpen ? 0.06 : 0,
                      },
                      y: isOpen ? EXPAND_SPRING : COLLAPSE_SPRING,
                    }}
                  >
                    {item.answer}
                  </motion.div>
                </motion.div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center mt-10">
          <Link
            href="/faq"
            prefetch={true}
            className="text-primary hover:text-primary/80 font-semibold transition-colors duration-200 text-[15px] underline"
          >
            View More
          </Link>
        </div>
      </div>
    </section>
  );
}
