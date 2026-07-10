// components/ui/multi-step-form.tsx
"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";


import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const multiStepFormVariants = cva("flex flex-col w-full", {
  variants: {
    size: {
      default: "md:max-w-[700px]",
      sm: "md:max-w-[550px]",
      lg: "md:max-w-[850px]",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

interface MultiStepFormProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof multiStepFormVariants> {
  currentStep: number;
  totalSteps: number;
  title: string;
  description: string;
  onBack: () => void;
  onNext: () => void;
  onClose?: () => void;
  backButtonText?: string;
  nextButtonText?: string;
  footerContent?: React.ReactNode;
  isLoading?: boolean;
}

const MultiStepForm = React.forwardRef<HTMLDivElement, MultiStepFormProps>(
  (
    {
      className,
      size,
      currentStep,
      totalSteps,
      title,
      description,
      onBack,
      onNext,
      onClose,
      backButtonText = "Back",
      nextButtonText = "Next Step",
      footerContent,
      children,
      isLoading,
      ...props
    },
    ref
  ) => {
    const progress = Math.round((currentStep / totalSteps) * 100);

    const variants = {
      hidden: { opacity: 0, x: 40 },
      enter: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -40 },
    };

    return (
      <div
        ref={ref}
        className={cn(
          multiStepFormVariants({ size }),
          "mx-auto w-full space-y-6",
          className
        )}
        {...props}
      >
        <div className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-xl md:text-2xl font-bold font-lora text-foreground tracking-tight">{title}</h3>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 h-8 w-8 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Button>
            )}
          </div>
          <p className="text-sm font-medium text-muted-foreground mt-1.5 leading-relaxed">
            {description}
          </p>

          {/* Progress bar */}
          <div className="flex items-center gap-3 pt-4">
            <div className="relative flex-1 h-2 bg-accent/60 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs font-bold text-muted-foreground whitespace-nowrap shrink-0 font-ibm">
              {currentStep}/{totalSteps}
            </p>
          </div>

        </div>

        <div className="min-h-[140px] md:min-h-[180px] overflow-hidden py-2 px-4 -mx-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              variants={variants}
              initial="hidden"
              animate="enter"
              exit="exit"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between pt-5 mt-2 border-t border-border/10">
          <div className="text-xs md:text-sm font-semibold text-muted-foreground font-ibm">{footerContent}</div>
          <div className="flex items-center gap-2.5">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={onBack}
                disabled={isLoading}
                className="font-ibm font-bold h-10 px-4 rounded-xl border-border/40 hover:bg-accent/40 active:scale-[0.98] transition-all duration-150 cursor-pointer"
              >
                {backButtonText}
              </Button>
            )}
            <Button
              onClick={onNext}
              disabled={isLoading}
              className="font-ibm font-bold h-10 px-6 rounded-xl min-w-[120px] active:scale-[0.98] hover:shadow-md hover:shadow-primary/10 transition-all duration-150 cursor-pointer"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  Submitting...
                </span>
              ) : (
                nextButtonText
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

MultiStepForm.displayName = "MultiStepForm";

export { MultiStepForm };
