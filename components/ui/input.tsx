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
          "rounded-xl border border-input bg-background",
          "px-3 py-2",
          "min-h-11",
          "text-sm text-foreground",
          "shadow-sm",
          "transition-colors duration-200",
          "placeholder:text-muted-foreground",
          "selection:bg-primary selection:text-primary-foreground",
          "file:mr-3 file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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