import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        [
          "flex w-full min-w-0",
          "rounded-lg border border-border/70 bg-muted/30 dark:bg-muted/20",
          "px-3 py-1.5 sm:py-2",
          "h-9 sm:h-10",
          "text-xs sm:text-sm text-foreground",
          "shadow-2xs",
          "transition-all duration-180 ease-out",
          "placeholder:text-muted-foreground/70",
          "selection:bg-primary selection:text-primary-foreground",
          "file:mr-3 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs file:font-semibold file:text-foreground",
          "focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring focus-visible:border-primary/50 focus-visible:bg-background",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        ].join(" "),
        className
      )}
      {...props}
    />
  );
}

export { Input };