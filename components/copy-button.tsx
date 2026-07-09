"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CopyButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  value: string;
  variant?: "icon" | "inline";
}

export function CopyButton({ value, variant = "icon", className, ...props }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!value) return;
    
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy text.");
    }
  };

  if (variant === "inline") {
    return (
      <button
        onClick={onCopy}
        className={cn(
          "inline-flex items-center gap-1.5 hover:bg-primary/30 transition-colors cursor-pointer",
          className
        )}
        title="Click to copy"
        {...props}
      >
        {props.children}
        {copied ? (
          <Check className="h-3 w-3 text-foreground" />
        ) : (
          <Copy className="h-3 w-3 text-foreground/70 opacity-50 hover:opacity-100 transition-opacity" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onCopy}
      className={cn(
        "absolute right-2 top-2 z-10 p-2 rounded-md bg-card/80 backdrop-blur-sm border border-border shadow-sm text-muted-foreground hover:text-foreground hover:bg-card transition-all opacity-100 md:opacity-0 group-hover:opacity-100",
        copied && "text-success hover:text-success bg-card border-success/30",
        className
      )}
      aria-label="Copy to clipboard"
      title="Copy to clipboard"
      {...props}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

import { useRef } from "react";

export function CopyWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const onCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!contentRef.current) return;
    const textToCopy = contentRef.current.innerText || contentRef.current.textContent || "";
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy text.");
    }
  };

  return (
    <div className={cn("relative group min-w-0", className)}>
      <div ref={contentRef} className="w-full">
        {children}
      </div>
      <button
        onClick={onCopy}
        className={cn(
          "absolute right-2 top-2 z-10 p-2 rounded-md bg-card/80 backdrop-blur-sm border border-border shadow-sm text-muted-foreground hover:text-foreground hover:bg-card transition-all opacity-100 md:opacity-0 group-hover:opacity-100",
          copied && "text-success hover:text-success bg-card border-success/30"
        )}
        aria-label="Copy to clipboard"
        title="Copy"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
