"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import StepperV2, { Step } from "@/components/ui/stepper-v2";
import { AvatarPicker, avatars, type Avatar } from "@/components/ui/avatar-picker";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { H2, Muted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

interface OnboardingDialogProps {
  needsPassword: boolean;
  siteName: string;
  userName?: string;
}

export default function OnboardingDialog({
  needsPassword,
  siteName,
  userName: _userName,
}: OnboardingDialogProps) {
  const router = useRouter();

  const [selectedAvatar, setSelectedAvatar] = useState<Avatar>(avatars[0]);
  const [username, setUsername] = useState("");
  const [gameName, setGameName] = useState("");
  const [uid, setUid] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [usernameError, setUsernameError] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const canProceed = (() => {
    const passwordOK = password.length >= 8 && password === confirmPassword;
    const usernameOK = username.trim().length >= 3;
    if (needsPassword && currentStep === 1) return passwordOK;
    if ((needsPassword && currentStep === 2) || (!needsPassword && currentStep === 1)) return usernameOK;
    return true;
  })();

  const handleFinalSubmit = async () => {
    try {
      if (needsPassword) {
        const res = await fetch("/api/user/set-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Failed to set password.");
          return;
        }
      }

      const displayName = username.trim() || _userName || "Player";

      const res = await fetch("/api/user/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: displayName,
          gameName: gameName.trim() || null,
          uid: uid.trim() || null,
          avatarId: selectedAvatar.id,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to save profile.");
        return;
      }

      await authClient.updateUser({ name: displayName });

      setDone(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1800);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  if (done) {
    return (
      <div className="text-center space-y-5 py-8">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-foreground" />
          </div>
        </div>
        <div>
          <H2 className="text-2xl font-bold text-foreground border-none pb-0 mt-0 font-inter">
            You&apos;re all set!
          </H2>
          <Muted className="text-sm mt-1.5 font-ibm">
            Welcome to{" "}
            <span className="font-semibold text-primary font-momo">{siteName}</span>,
            {" "}{username.trim() || "Player"}. Redirecting to the dashboard...
          </Muted>
        </div>
        <div className="flex justify-center">
          <Spinner className="size-5 text-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px] mx-auto">
      <StepperV2
        initialStep={1}
        onFinalStepCompleted={handleFinalSubmit}
        onStepChange={setCurrentStep}
        backButtonText="Previous"
        nextButtonText="Continue"
        disableStepIndicators
        canProceed={canProceed}
      >
        {needsPassword && (
          <Step>
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="font-semibold text-xl tracking-tight text-foreground">
                  Set a password
                </h2>
                <p className="text-muted-foreground text-sm">
                  Create a password to sign in via email later.
                </p>
              </div>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="onboard-password">Password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="onboard-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
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
                  <FieldLabel htmlFor="onboard-confirm">Confirm password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="onboard-confirm"
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
              </FieldGroup>
            </div>
          </Step>
        )}

        <Step>
          <AvatarPicker
            selectedAvatar={selectedAvatar}
            onAvatarSelect={setSelectedAvatar}
            username={username}
            onUsernameChange={(v) => {
              setUsername(v);
              if (v.length >= 3) setUsernameError(false);
            }}
            showError={usernameError}
          />
        </Step>

        <Step>
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="font-semibold text-xl tracking-tight text-foreground">
                Game name
              </h2>
              <p className="text-muted-foreground text-sm">
                What name do you use in-game?
              </p>
            </div>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="onboard-gamename">Game name</FieldLabel>
                <Input
                  id="onboard-gamename"
                  type="text"
                  placeholder="Your in-game username"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  className="h-11"
                />
                <Muted className="text-xs mt-1">
                  The name you use in-game (can be updated later).
                </Muted>
              </Field>
            </FieldGroup>
          </div>
        </Step>

        <Step>
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="font-semibold text-xl tracking-tight text-foreground">
                Player UID
              </h2>
              <p className="text-muted-foreground text-sm">
                Enter your unique player ID.
              </p>
            </div>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="onboard-uid">UID</FieldLabel>
                <Input
                  id="onboard-uid"
                  type="text"
                  placeholder="Your player UID"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  className="h-11"
                />
                <Muted className="text-xs mt-1">
                  Your unique player ID (can be updated later).
                </Muted>
              </Field>
            </FieldGroup>
          </div>
        </Step>
      </StepperV2>
    </div>
  );
}
