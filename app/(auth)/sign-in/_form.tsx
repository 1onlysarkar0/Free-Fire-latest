"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Stepper, { Step as StepperStep } from "@/components/ui/stepper";
import { H2, Muted } from "@/components/ui/typography";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SocialAuthButton } from "@/components/auth/social-auth-button";

type Step = "email" | "password" | "two-factor";


export function SignInForm() {
  const [step, setStep] = useState<Step>("email");
  const [steps, setSteps] = useState<Step[]>(["email", "password"]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  const returnTo = (() => {
    const raw = searchParams.get("returnTo");
    if (!raw) return "/dashboard";
    return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  })();

  const currentStepIdx = steps.indexOf(step);

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

      if (!data.exists) {
        toast("No account found. Redirecting to sign up...", { duration: 2000 });
        setTimeout(() => {
          router.push(`/sign-up?email=${encodeURIComponent(email.trim())}`);
        }, 800);
        return;
      }

      if (!data.hasPassword) {
        toast.error(
          "This account uses Google sign-in. Please use 'Continue with Google'."
        );
        return;
      }

      if (data.hasTwoFactor) {
        setSteps(["email", "password", "two-factor"]);
      } else {
        setSteps(["email", "password"]);
      }

      setStep("password");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    try {
      const result = await authClient.signIn.email(
        { email: email.trim(), password },
        {
          onRequest: () => setLoading(true),
          onResponse: () => setLoading(false),
        }
      );

      if (result?.error) {
        if (
          result.error.status === 403 ||
          result.error.message?.toLowerCase().includes("two")
        ) {
          setStep("two-factor");
        } else {
          toast.error(result.error.message || "Invalid email or password.");
        }
        return;
      }

      if ((result?.data as { twoFactorRedirect?: boolean })?.twoFactorRedirect) {
        setStep("two-factor");
        return;
      }

      router.push(returnTo || "/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("two") || msg.toLowerCase().includes("otp")) {
        setStep("two-factor");
      } else {
        toast.error("Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) return;

    setLoading(true);
    try {
      const result = await authClient.twoFactor.verifyTotp(
        { code: twoFactorCode.trim() },
        {
          onRequest: () => setLoading(true),
          onResponse: () => setLoading(false),
        }
      );

      if (result?.error) {
        toast.error(result.error.message || "Invalid code. Please try again.");
        return;
      }

      router.push(returnTo || "/dashboard");
      router.refresh();
    } catch {
      toast.error("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/complete-profile",
      });
    } catch {
      toast.error("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-6">
        {step !== "email" && (
          <button
            onClick={() => {
              if (step === "two-factor") setStep("password");
              else setStep("email");
              setPassword("");
              setTwoFactorCode("");
            }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        <H2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight border-none pb-0 mt-0 font-lora">
          {step === "email" && "Welcome back"}
          {step === "password" && "Enter your password"}
          {step === "two-factor" && "Two-factor authentication"}
        </H2>
        <Muted className="text-sm mt-1.5 font-ibm">
          {step === "email" && "Sign in to your account to continue."}
          {step === "password" && (
            <span>
              Signing in as{" "}
              <span className="font-medium text-foreground">{email}</span>
            </span>
          )}
          {step === "two-factor" &&
            "Enter the 6-digit code from your authenticator app."}
        </Muted>
      </div>

      {/* Progress indicator via Stepper */}
      <Stepper
        currentStep={currentStepIdx + 1}
        disableStepIndicators={true}
        footerClassName="hidden"
        stepContainerClassName={currentStepIdx === 0 ? "hidden mb-0" : ""}
        className="w-full"
      >
        <StepperStep>
          {/* Email step */}
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
              onClick={handleGoogleSignIn}
              loading={googleLoading}
              disabled={loading}
            />

            <Muted className="text-center text-sm mt-6">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                prefetch={true}
                className="font-semibold text-primary hover:underline"
              >
                Sign up
              </Link>
            </Muted>
          </div>
        </StepperStep>

        <StepperStep>
          {/* Password step */}
          <form onSubmit={handlePasswordSubmit} className="pt-1">
            <FieldGroup>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    href="/forgot-password"
                    prefetch={true}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
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
              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold"
                disabled={loading}
              >
                {loading ? <Spinner className="mr-2" /> : "Sign In"}
              </Button>
            </FieldGroup>
          </form>
        </StepperStep>

        {steps.includes("two-factor") && (
          <StepperStep>
            <form onSubmit={handleTwoFactorSubmit} className="pt-1 space-y-6">
              <div className="flex justify-center">
                <ShieldCheck className="h-10 w-10 text-foreground" />
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(val) => setTwoFactorCode(val)}
                  autoFocus
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold"
                disabled={loading || twoFactorCode.length !== 6}
              >
                {loading ? (
                  <Spinner className="mr-2" />
                ) : (
                  "Verify Code"
                )}
              </Button>
            </form>
          </StepperStep>
        )}
      </Stepper>

    </div>
  );
}
