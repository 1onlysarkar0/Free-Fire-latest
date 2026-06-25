"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { H2, Muted } from "@/components/ui/typography";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const result = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: "/reset-password",
      });

      if (result?.error) {
        toast.error(
          result.error.message || "Failed to send reset email. Please try again."
        );
        return;
      }

      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px]">
      <Link
        href="/sign-in"
        prefetch={true}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sign in
      </Link>

      {sent ? (
        <div className="text-center space-y-5 py-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-foreground" />
            </div>
          </div>
          <div>
            <H2 className="text-2xl font-bold text-foreground border-none pb-0 mt-0 font-inter">Check your email</H2>
            <Muted className="text-sm mt-2 leading-relaxed font-ibm">
              We&apos;ve sent a password reset link to{" "}
              <span className="font-medium text-foreground">{email}</span>. The
              link expires in 1 hour.
            </Muted>
          </div>
          <Muted className="text-xs">
            Didn&apos;t receive it? Check your spam folder or{" "}
            <button
              onClick={() => setSent(false)}
              className="text-primary hover:underline font-medium"
            >
              try again
            </button>
            .
          </Muted>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <H2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight border-none pb-0 mt-0 font-inter">
              Reset your password
            </H2>
            <Muted className="text-sm mt-1.5 font-ibm">
              Enter the email address linked to your account and we&apos;ll send
              you a reset link.
            </Muted>
          </div>

          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email address</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                  className="h-11"
                />
              </Field>
              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <Spinner className="mr-2" />
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </FieldGroup>
          </form>
        </>
      )}
    </div>
  );
}
