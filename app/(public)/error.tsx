"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PublicError]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold text-foreground mb-2">Something went wrong</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        An unexpected error occurred. You can try again or go back to the homepage.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
        <Button asChild>
          <Link href="/" prefetch={true}>Go home</Link>
        </Button>
      </div>
    </div>
  );
}
