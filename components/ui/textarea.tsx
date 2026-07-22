import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-border/70 placeholder:text-muted-foreground/70 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-lg border bg-muted/30 dark:bg-muted/20 px-3 py-2 text-xs sm:text-sm shadow-2xs transition-all duration-180 ease-out focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring focus-visible:border-primary/50 focus-visible:bg-background disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
