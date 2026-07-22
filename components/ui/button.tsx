import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2",
    "whitespace-nowrap rounded-xl",
    "text-xs font-semibold sm:text-sm",
    "transition-all duration-200 ease-out",
    "outline-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 sm:[&_svg:not([class*='size-'])]:size-4",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90 hover:shadow-xs active:bg-primary/95",
        destructive:
          "bg-destructive text-destructive-foreground shadow-2xs hover:bg-destructive/90 active:bg-destructive/95",
        outline:
          "border border-border/70 bg-card text-foreground shadow-2xs hover:bg-accent hover:border-border hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-2xs hover:bg-secondary/85",
        ghost:
          "text-foreground hover:bg-accent/70 hover:text-accent-foreground",
        link:
          "h-auto rounded-none px-0 py-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5 py-2 sm:h-10 sm:px-4",
        sm: "h-8 px-3 py-1.5 text-xs",
        xs: "h-7 px-2.5 py-1 text-[11px]",
        lg: "h-11 px-5 py-2.5 text-sm sm:h-12 sm:px-6",
        icon: "size-9 sm:size-10",
        "icon-xs": "size-7 sm:size-8",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false,
    },
  }
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  fullWidth,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : type ?? "button"}
      className={cn(buttonVariants({ variant, size, fullWidth, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };