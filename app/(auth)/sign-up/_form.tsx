"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
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
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Gift,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import Stepper, { Step as StepperStep } from "@/components/ui/stepper";
import { H2, Muted } from "@/components/ui/typography";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SocialAuthButton } from "@/components/auth/social-auth-button";

import OnboardingDialog from "@/components/onboarding-dialog";

type Step = "email" | "password" | "onboarding";

interface InviterInfo {
  valid: boolean;
  inviterName: string;
  code: string;
  inviterImage: string | null;
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
  ];
  return (
    <div className="flex gap-3 mt-2">
      {checks.map((c) => (
        <div key={c.label} className="flex items-center gap-1 text-xs">
          <div
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              c.ok ? "bg-success" : "bg-muted"
            )}
          />
          <span className={c.ok ? "text-success" : "text-muted-foreground"}>
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SignUpForm({ siteName }: { siteName: string }) {
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get("email") || "";
  const refCode = searchParams.get("ref") || "";
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [inviterInfo, setInviterInfo] = useState<InviterInfo | null>(null);

  useEffect(() => {
    if (!refCode) return;
    fetch(`/api/invite/${encodeURIComponent(refCode)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setInviterInfo({
            valid: true,
            inviterName: data.inviterName,
            code: data.code,
            inviterImage: data.inviterImage,
          });
        }
      })
      .catch(() => null);
  }, [refCode]);


  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (data.exists) {
        toast("Account found. Redirecting to sign in...", { duration: 2000 });
        setTimeout(() => {
          router.push(`/sign-in?email=${encodeURIComponent(email.trim())}`);
        }, 800);
        return;
      }

      setStep("password");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    setLoading(true);
    try {
      const result = await authClient.signUp.email(
        { email: email.trim(), password, name: email.trim().split("@")[0] },
        {
          onRequest: () => setLoading(true),
          onResponse: () => setLoading(false),
        }
      );

      if (result?.error) {
        toast.error(result.error.message || "Failed to create account. Please try again.");
        return;
      }

      // Apply referral invite bonus if a ref code is present
      if (refCode) {
        try {
          await fetch("/api/user/apply-invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: refCode }),
          });
          // Silently succeed or fail — do not block signup
        } catch {
          // Ignore — invite apply is non-blocking
        }
      }

      setStep("onboarding");
    } catch {
      toast.error("Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      // Pass ref code through callbackURL so complete-profile can apply the bonus
      const callbackUrl = refCode
        ? `/complete-profile?ref=${encodeURIComponent(refCode)}`
        : "/complete-profile";
      await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
      });
    } catch {
      toast.error("Google sign-up failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  if (step === "onboarding") {
    return (
      <div className="w-full max-w-[400px]">
        <OnboardingDialog needsPassword={false} siteName={siteName} />
      </div>
    );
  }

  if (refCode) {
    return (
      <div className="w-full max-w-[400px]">
        <div className="mb-6 space-y-1">
          <H2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight border-none pb-0 mt-0 font-lora">
            Claim Welcome Bonus
          </H2>
          <Muted className="text-sm font-ibm">
            Sign up to claim your referral signup reward.
          </Muted>
        </div>

        {inviterInfo?.valid ? (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-amber-500/10 border border-primary/30 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/20 text-primary uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> Special Invitation
                </span>
                <p className="text-sm font-bold text-foreground mt-1 truncate">
                  Invited by {inviterInfo.inviterName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Invite Code: <code className="font-mono font-bold text-primary">{inviterInfo.code}</code>
                </p>
              </div>
            </div>
            <div className="mt-3 p-2.5 rounded-xl bg-background/80 border border-border/20 text-[11px] text-muted-foreground flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                To claim your welcome bonus securely, manual email sign-up is disabled for referred accounts. Please sign up using <strong>Google OAuth</strong> below.
              </span>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-3.5 rounded-2xl bg-accent/30 border border-border/30 text-xs text-muted-foreground">
            Invited via referral code <code className="font-mono font-bold text-primary">{refCode}</code>. Manual email signup is disabled for referral bonuses.
          </div>
        )}

        <div className="space-y-4">
          <SocialAuthButton
            provider="google"
            onClick={handleGoogleSignUp}
            loading={googleLoading}
            disabled={loading}
          />

          <Muted className="text-center text-sm mt-6">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              prefetch={true}
              className="font-semibold text-primary hover:underline"
            >
              Sign in
            </Link>
          </Muted>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px]">

      <div className="mb-6">
        {step !== "email" && (
          <button
            onClick={() => setStep("email")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        <>
          <H2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight border-none pb-0 mt-0 font-lora">
            {step === "email" && "Create your account"}
            {step === "password" && "Set a password"}
          </H2>
          <Muted className="text-sm mt-1.5 font-ibm">
            {step === "email" && "Sign up to get started."}
            {step === "password" && (
              <span>
                Creating account for{" "}
                <span className="font-medium text-foreground">{email}</span>
              </span>
            )}
          </Muted>
        </>
      </div>

      <Stepper currentStep={step === "email" ? 1 : 2} disableStepIndicators={true} footerClassName="hidden" className="w-full">
          <StepperStep>
            <div className="pt-1">
              <form onSubmit={handleEmailSubmit}>
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
                      "Continue with Email"
                    )}
                  </Button>
                </FieldGroup>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    or
                  </span>
                </div>
              </div>

              <SocialAuthButton
                provider="google"
                onClick={handleGoogleSignUp}
                loading={googleLoading}
                disabled={loading}
              />

              <Muted className="text-center text-sm mt-6">
                Already have an account?{" "}
                <Link
                  href="/sign-in"
                  prefetch={true}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </Link>
              </Muted>
            </div>
          </StepperStep>

          <StepperStep>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateAccount(); }} className="pt-1">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                  {password && <PasswordStrength password={password} />}
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repeat your password"
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
                    loading || !password || password !== confirmPassword || password.length < 8
                  }
                >
                  {loading ? (
                    <Spinner className="mr-2" />
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </FieldGroup>
            </form>
          </StepperStep>
        </Stepper>
    </div>
  );
}
