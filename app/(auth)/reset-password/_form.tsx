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
import { cn } from "@/lib/utils";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { H2, Muted } from "@/components/ui/typography";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid or expired reset link. Please request a new one.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });

      if (result?.error) {
        toast.error(
          result.error.message ||
            "Failed to reset password. The link may have expired."
        );
        return;
      }

      setDone(true);
      setTimeout(() => router.push("/sign-in"), 2500);
    } catch {
      toast.error("Something went wrong. Please request a new reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px]">
      {done ? (
        <div className="text-center space-y-5 py-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-foreground" />
            </div>
          </div>
          <div>
            <H2 className="text-2xl font-bold text-foreground border-none pb-0 mt-0 font-inter">Password reset!</H2>
            <Muted className="text-sm mt-1.5 font-ibm">
              Your password has been updated. Redirecting you to sign in...
            </Muted>
          </div>
          <Spinner className="size-5 text-foreground mx-auto" />
        </div>
      ) : (
        <>
          {!token && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              This reset link is invalid or has expired.{" "}
              <Link href="/forgot-password" prefetch={true} className="font-semibold underline">
                Request a new one
              </Link>
              .
            </div>
          )}

          <div className="mb-8">
            <H2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight border-none pb-0 mt-0 font-inter">
              Set new password
            </H2>
            <Muted className="text-sm mt-1.5 font-ibm">
              Your new password must be at least 8 characters.
            </Muted>
          </div>

          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="password">New password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Choose a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat the password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={cn(
                      "h-11 pr-10",
                      confirmPassword &&
                        password !== confirmPassword &&
                        "border-destructive focus-visible:ring-destructive/30"
                    )}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <Muted className="text-xs text-destructive mt-1">Passwords do not match.</Muted>
                )}
              </Field>

              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold"
                disabled={
                  loading || !token || !password || password !== confirmPassword
                }
              >
                {loading ? (
                  <Spinner className="mr-2" />
                ) : (
                  "Reset Password"
                )}
              </Button>
            </FieldGroup>
          </form>
        </>
      )}
    </div>
  );
}
