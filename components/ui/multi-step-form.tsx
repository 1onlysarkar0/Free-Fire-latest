// components/ui/multi-step-form.tsx
"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card
        ref={ref}
        className={cn(
          "bg-card/75 backdrop-blur-md border border-border/40 shadow-xl rounded-2xl md:rounded-3xl p-2 md:p-4",
          multiStepFormVariants({ size }),
          "mx-auto w-full",
          className
        )}
        {...props}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl md:text-2xl font-bold font-lora text-foreground tracking-tight">{title}</CardTitle>
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
          <CardDescription className="text-sm font-medium text-muted-foreground mt-1.5 leading-relaxed">
            {description}
          </CardDescription>

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

          {/* Step dots */}
          <div className="flex items-center gap-2 pt-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i + 1 < currentStep
                    ? "bg-primary/60 w-4"
                    : i + 1 === currentStep
                    ? "bg-primary w-8 shadow-xs shadow-primary/20"
                    : "bg-muted-foreground/20 w-4"
                )}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="min-h-[290px] md:min-h-[310px] overflow-hidden py-2">
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
        </CardContent>

        <CardFooter className="flex items-center justify-between pt-5 mt-2 border-t border-border/10">
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
        </CardFooter>
      </Card>
    );
  }
);

MultiStepForm.displayName = "MultiStepForm";

export { MultiStepForm };
