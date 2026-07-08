// components/ui/multi-step-form.tsx
"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
        className={cn(multiStepFormVariants({ size }), "mx-auto", className)}
        {...props}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl font-lora">{title}</CardTitle>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 h-8 w-8"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Button>
            )}
          </div>
          <CardDescription className="text-sm text-muted-foreground mt-1">
            {description}
          </CardDescription>

          {/* Progress bar */}
          <div className="flex items-center gap-3 pt-3">
            <div className="relative flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs font-medium text-muted-foreground whitespace-nowrap shrink-0">
              {currentStep}/{totalSteps}
            </p>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-2 pt-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i + 1 < currentStep
                    ? "bg-primary w-4"
                    : i + 1 === currentStep
                    ? "bg-primary w-6"
                    : "bg-muted w-4"
                )}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="min-h-[280px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              variants={variants}
              initial="hidden"
              animate="enter"
              exit="exit"
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </CardContent>

        <CardFooter className="flex items-center justify-between pt-4 border-t border-border/10">
          <div className="text-sm text-muted-foreground">{footerContent}</div>
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={onBack}
                disabled={isLoading}
                className="font-ibm"
              >
                {backButtonText}
              </Button>
            )}
            <Button
              onClick={onNext}
              disabled={isLoading}
              className="font-ibm min-w-[120px]"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
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
