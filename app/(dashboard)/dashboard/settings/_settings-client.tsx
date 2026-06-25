"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  MailCheck,
  QrCode,
  Settings2,
  Shield,
  ShieldCheck,
  ShieldOff,
  UserCircle2,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

import { AvatarDisplay, getAvatarId } from "@/components/ui/avatar-display";
import { AvatarPicker, avatars, type Avatar } from "@/components/ui/avatar-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { H4, Muted } from "@/components/ui/typography";
import { authClient } from "@/lib/auth-client";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  gameName?: string | null;
  uid?: string | null;
  twoFactorEnabled?: boolean | null;
  emailVerified?: boolean;
}

interface InitialProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  gameName?: string | null;
  uid?: string | null;
  twoFactorEnabled?: boolean | null;
  emailVerified?: boolean;
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-primary transition-colors hover:text-primary/80"
        >
          {visible ? (
            <EyeOff className="h-4 w-4 text-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-foreground" />
          )}
        </button>
      </div>
    </Field>
  );
}

function SettingsContent({ initialProfile }: { initialProfile?: InitialProfile }) {
  const [user, setUser] = useState<UserProfile | null>(initialProfile ?? null);
  const [loading, setLoading] = useState(!initialProfile);
  const [currentTab, setCurrentTab] = useState("profile");

  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState(initialProfile?.name || "");
  const [email, setEmail] = useState(initialProfile?.email || "");
  const [gameName, setGameName] = useState(initialProfile?.gameName || "");
  const [uid, setUid] = useState(initialProfile?.uid || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar>(() => {
    const avatarId = getAvatarId(initialProfile?.image);
    return avatars.find((a) => a.id === avatarId) || avatars[0];
  });
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [hasGoogleLinked, setHasGoogleLinked] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    initialProfile?.twoFactorEnabled ?? false
  );
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [showEnableFlow, setShowEnableFlow] = useState(false);
  const [showDisableFlow, setShowDisableFlow] = useState(false);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "profile" || tab === "security") {
      setCurrentTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      if (initialProfile) {
        setLoading(false);
        return;
      }

      try {
        const session = await authClient.getSession();

        if (!session?.data?.user) {
          router.push("/sign-in");
          return;
        }

        const profileRes = await fetch("/api/user/profile");

        if (profileRes.ok) {
          const profile: UserProfile = await profileRes.json();
          setUser(profile);
          setName(profile.name || "");
          setEmail(profile.email || "");
          setGameName(profile.gameName || "");
          setUid(profile.uid || "");
          setTwoFactorEnabled(profile.twoFactorEnabled ?? false);
        } else {
          const fallbackUser = session.data.user as UserProfile;
          setUser(fallbackUser);
          setName(fallbackUser.name || "");
          setEmail(fallbackUser.email || "");
        }
      } catch (error) {
        console.error("Error fetching settings data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [initialProfile, router]);

  useEffect(() => {
    authClient.listAccounts().then((res) => {
      if (res?.data) {
        setHasGoogleLinked(res.data.some((acc: { providerId: string }) => acc.providerId === "google"));
      }
    }).catch(() => {});
  }, []);

  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  };

  const handleUpdateProfile = async () => {
    setSavingProfile(true);

    try {
      const res = await fetch("/api/user/complete-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          gameName,
          uid,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update profile");
      }

      await authClient.updateUser({
        name,
      });

      setUser((prev) =>
        prev
          ? {
            ...prev,
            name,
            gameName,
            uid,
          }
          : null
      );

      toast.success("Profile updated successfully.");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveAvatar = async () => {
    setSavingAvatar(true);
    try {
      const res = await fetch("/api/user/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          gameName,
          uid,
          avatarId: selectedAvatar.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to save avatar");
      setUser((prev) => prev ? { ...prev, image: `avatar:${selectedAvatar.id}` } : null);
      setShowAvatarPicker(false);
      toast.success("Avatar updated.");
    } catch {
      toast.error("Failed to save avatar.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    setChangingPassword(true);

    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (result?.error) {
        toast.error(result.error.message || "Failed to change password.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast.success("Password changed successfully.");
    } catch {
      toast.error("Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleEnable2FA = async () => {
    if (!twoFactorPassword) {
      toast.error("Please enter your password.");
      return;
    }

    setTwoFactorLoading(true);

    try {
      const result = await authClient.twoFactor.enable({
        password: twoFactorPassword,
      });

      if (result?.error) {
        toast.error(result.error.message || "Failed to initiate 2FA setup.");
        return;
      }

      const uri = (result?.data as { totpURI?: string } | undefined)?.totpURI;

      if (uri) {
        setTotpUri(uri);
      }
    } catch {
      toast.error("Failed to initiate 2FA setup.");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (twoFactorCode.length !== 6) {
      toast.error("Please enter the 6-digit code.");
      return;
    }

    setTwoFactorLoading(true);

    try {
      const result = await authClient.twoFactor.verifyTotp({
        code: twoFactorCode,
      });

      if (result?.error) {
        toast.error(result.error.message || "Invalid code. Please try again.");
        return;
      }

      setTwoFactorEnabled(true);
      setShowEnableFlow(false);
      setTotpUri(null);
      setTwoFactorPassword("");
      setTwoFactorCode("");
      toast.success("Two-factor authentication enabled.");
    } catch {
      toast.error("Failed to verify code.");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword || disableCode.length !== 6) {
      toast.error("Please enter your password and a valid authenticator code.");
      return;
    }

    setTwoFactorLoading(true);

    try {
      const result = await authClient.twoFactor.disable({
        password: disablePassword,
      });

      if (result?.error) {
        toast.error(
          result.error.message || "Failed to disable 2FA. Check your password and code."
        );
        return;
      }

      setTwoFactorEnabled(false);
      setShowDisableFlow(false);
      setDisablePassword("");
      setDisableCode("");
      toast.success("Two-factor authentication disabled.");
    } catch {
      toast.error("Failed to disable 2FA.");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-w-0 p-4 md:p-6">
        <Card>
          <CardContent className="flex min-h-56 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const resolvedUser = user ?? initialProfile ?? null;

  return (
    <div className="w-full min-w-0 p-4 md:p-6">
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full min-w-0 space-y-6">
        <TabsList className="h-auto w-full justify-start rounded-xl bg-accent/60 p-1">
          <TabsTrigger value="profile" className="gap-2 rounded-lg px-4">
            <UserCircle2 className="h-4 w-4 text-foreground" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 rounded-lg px-4">
            <Shield className="h-4 w-4 text-foreground" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0">
          <div className="space-y-5">
            {/* ── Profile Header ── */}
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
              <div className="relative group">
                <AvatarDisplay
                  image={resolvedUser?.image}
                  name={name || resolvedUser?.name}
                  className="h-16 w-16 sm:h-20 sm:w-20 shadow-sm ring-1 ring-border"
                />
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs ring-2 ring-background transition-opacity hover:opacity-90"
                >
                  <Settings2 className="h-3 w-3" />
                </button>
              </div>
              <div className="flex-1 min-w-0 pt-0.5 sm:pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">{name || "Unnamed user"}</h2>
                  {resolvedUser?.emailVerified ? (
                    <MailCheck className="h-4 w-4 text-success shrink-0" />
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground truncate">{email}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    {twoFactorEnabled ? "2FA active" : "2FA off"}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Avatar Picker ── */}
            {showAvatarPicker && (
              <div className="rounded-xl border border-border bg-accent/30 p-4 sm:p-5">
                <AvatarPicker
                  selectedAvatar={selectedAvatar}
                  onAvatarSelect={setSelectedAvatar}
                  username=""
                  onUsernameChange={() => {}}
                  hideUsernameField
                />
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAvatarPicker(false);
                      setSelectedAvatar(
                        avatars.find(
                          (a) => a.id === (getAvatarId(resolvedUser?.image) || 1)
                        ) || avatars[0]
                      );
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveAvatar}
                    disabled={savingAvatar}
                  >
                    {savingAvatar ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-foreground" />
                    ) : null}
                    Save Avatar
                  </Button>
                </div>
              </div>
            )}

            {/* ── Profile Form ── */}
            <Card className="w-full shadow-xs border-border/80">
              <CardHeader className="px-4 sm:px-5 py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCircle2 className="h-4 w-4" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 pb-5">
                <FieldGroup className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="name" className="text-xs font-medium">Full name</FieldLabel>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="h-9 text-sm"
                    />
                  </Field>

                  <Field data-disabled>
                    <FieldLabel htmlFor="email" className="text-xs font-medium">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      placeholder="Email cannot be changed"
                      className="h-9 text-sm"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="gameName" className="text-xs font-medium">Game name</FieldLabel>
                    <Input
                      id="gameName"
                      value={gameName}
                      onChange={(e) => setGameName(e.target.value)}
                      placeholder="Your in-game username"
                      className="h-9 text-sm"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="uid" className="text-xs font-medium">Player UID</FieldLabel>
                    <Input
                      id="uid"
                      value={uid}
                      onChange={(e) => setUid(e.target.value)}
                      placeholder="Your player UID"
                      className="h-9 text-sm"
                    />
                  </Field>
                </FieldGroup>

                <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between border-t border-border mt-4">
                  <Muted className="text-xs">
                    Changes are applied to your account and player-facing identity.
                  </Muted>
                  <Button onClick={handleUpdateProfile} disabled={savingProfile} size="sm">
                    {savingProfile ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-foreground" />
                    ) : null}
                    Save changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-0 space-y-6">
          <Card className="w-full shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle>Change password</CardTitle>
              <CardDescription>
                Update your password and automatically revoke other active sessions.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <FieldGroup className="gap-4">
                <PasswordField
                  id="current-password"
                  label="Current password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder="Enter current password"
                />

                <PasswordField
                  id="new-password"
                  label="New password"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="Choose a new password"
                />

                <Field>
                  <FieldLabel htmlFor="confirm-new-password">Confirm new password</FieldLabel>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat your new password"
                  />
                  {confirmNewPassword && newPassword !== confirmNewPassword ? (
                    <Muted className="mt-2 text-xs text-destructive">
                      Passwords do not match.
                    </Muted>
                  ) : null}
                </Field>
              </FieldGroup>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <Muted className="text-sm">
                  Use a strong password with at least 8 characters.
                </Muted>
                <Button onClick={handleChangePassword} disabled={changingPassword}>
                  {changingPassword ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-foreground" />
                  ) : null}
                  Update password
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-foreground" />
                Two-factor authentication
              </CardTitle>
              <CardDescription>
                Add an authenticator-based verification step for stronger account security.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="flex flex-col gap-4 rounded-2xl bg-accent/50 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {twoFactorEnabled ? (
                      <ShieldCheck className="h-5 w-5 text-foreground" />
                    ) : (
                      <ShieldOff className="h-5 w-5 text-foreground" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {twoFactorEnabled ? "2FA is enabled" : "2FA is disabled"}
                    </p>
                    <Muted className="text-sm">
                      {twoFactorEnabled
                        ? "Your account is currently protected with an authenticator app."
                        : "Enable 2FA to add a second verification step during sign in."}
                    </Muted>
                  </div>
                </div>

                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setShowEnableFlow(true);
                      setShowDisableFlow(false);
                    } else {
                      setShowDisableFlow(true);
                      setShowEnableFlow(false);
                    }
                  }}
                />
              </div>

              {showEnableFlow && !twoFactorEnabled ? (
                <div className="space-y-4 rounded-2xl bg-accent/50 p-4">
                  <div className="space-y-1">
                    <H4 className="mt-0">Enable 2FA</H4>
                    <Muted className="text-sm">
                      Confirm your password, scan the QR code, then verify the 6-digit code from your app.
                    </Muted>
                  </div>

                  {!totpUri ? (
                    <>
                      <Field>
                        <FieldLabel htmlFor="two-factor-password">Your password</FieldLabel>
                        <Input
                          id="two-factor-password"
                          type="password"
                          placeholder="Current password"
                          value={twoFactorPassword}
                          onChange={(e) => setTwoFactorPassword(e.target.value)}
                        />
                      </Field>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={handleEnable2FA}
                          disabled={twoFactorLoading || !twoFactorPassword}
                        >
                          {twoFactorLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin text-foreground" />
                          ) : (
                            <QrCode className="mr-2 h-4 w-4 text-foreground" />
                          )}
                          Generate QR code
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowEnableFlow(false);
                            setTwoFactorPassword("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-2xl bg-card p-4 shadow-xs">
                        <div className="mx-auto flex justify-center">
                          <TotpQrCode uri={totpUri} />
                        </div>
                      </div>

                      <Field>
                        <FieldLabel htmlFor="two-factor-code">
                          6-digit code from your authenticator app
                        </FieldLabel>
                        <div className="flex justify-center pt-1">
                          <InputOTP
                            maxLength={6}
                            value={twoFactorCode}
                            onChange={(val) => setTwoFactorCode(val)}
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
                      </Field>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={handleVerify2FA}
                          disabled={twoFactorLoading || twoFactorCode.length !== 6}
                        >
                          {twoFactorLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin text-foreground" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4 text-foreground" />
                          )}
                          Verify and enable
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowEnableFlow(false);
                            setTotpUri(null);
                            setTwoFactorPassword("");
                            setTwoFactorCode("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {showDisableFlow && twoFactorEnabled ? (
                <div className="space-y-4 rounded-2xl bg-destructive/10 p-4">
                  <div className="space-y-1">
                    <H4 className="mt-0 text-destructive">Disable 2FA</H4>
                    <Muted className="text-sm">
                      Confirm your password and current authenticator code to remove this protection.
                    </Muted>
                  </div>

                  <FieldGroup className="gap-4">
                    <Field>
                      <FieldLabel htmlFor="disable-password">Your password</FieldLabel>
                      <Input
                        id="disable-password"
                        type="password"
                        placeholder="Current password"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="disable-code">Authenticator code</FieldLabel>
                      <div className="flex justify-center pt-1">
                        <InputOTP
                          maxLength={6}
                          value={disableCode}
                          onChange={(val) => setDisableCode(val)}
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
                    </Field>
                  </FieldGroup>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDisable2FA}
                      disabled={twoFactorLoading || !disablePassword || disableCode.length !== 6}
                    >
                      {twoFactorLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-foreground" />
                      ) : null}
                      Disable 2FA
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowDisableFlow(false);
                        setDisablePassword("");
                        setDisableCode("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="w-full shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-foreground" />
                Linked accounts
              </CardTitle>
              <CardDescription>
                Connect your Google account for one-click sign in.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="flex flex-col gap-4 rounded-2xl bg-accent/50 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-foreground mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Google</p>
                    <Muted className="text-sm">
                      {hasGoogleLinked
                        ? "Your Google account is linked. Use it for one-click sign in."
                        : "Link your Google account to sign in without a password."}
                    </Muted>
                  </div>
                </div>

                {hasGoogleLinked ? (
                  <Button variant="outline" disabled className="gap-2 opacity-60">
                    <CheckCircle2 className="h-4 w-4" />
                    Linked
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await authClient.linkSocial({ provider: "google" });
                      setHasGoogleLinked(true);
                    }}
                  >
                    Link Google
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TotpQrCode({ uri }: { uri: string }) {
  const [QRCode, setQRCode] = useState<
    React.ComponentType<{ value: string; size?: number }> | null
  >(null);

  useEffect(() => {
    let mounted = true;

    import("qrcode.react").then((mod) => {
      if (mounted) {
        setQRCode(() => mod.QRCodeSVG);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!QRCode) {
    return (
      <div className="flex h-48 w-48 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-foreground" />
      </div>
    );
  }

  return <QRCode value={uri} size={192} />;
}

export default function SettingsPageClient({
  initialProfile,
}: {
  initialProfile: InitialProfile;
}) {
  return (
    <Suspense fallback={null}>
      <SettingsContent initialProfile={initialProfile} />
    </Suspense>
  );
}