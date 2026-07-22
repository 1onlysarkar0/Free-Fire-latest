'use client';

import { useState } from "react";
import { format } from "date-fns";
import {
  Share2, Copy, Check, Gift, Coins, Users, Sparkles,
  Link as LinkIcon, ShieldAlert, ArrowRight, UserCheck, MessageCircle, Send
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface InvitationData {
  id: string;
  code: string;
  isActive: boolean;
  totalInvites: number;
  totalEarned: number;
  createdAt: string;
  updatedAt: string;
}

interface ReferralUse {
  id: string;
  signupMethod: string;
  inviterBonusAmount: number;
  inviteeBonusAmount: number;
  createdAt: string;
  inviteeName: string | null;
  inviteeEmail: string | null;
  inviteeGameName: string | null;
}

interface InviteClientProps {
  enabled: boolean;
  inviterBonus: number;
  inviteeBonus: number;
  initialInvitation: InvitationData | null;
  initialUses: ReferralUse[];
}

export default function InviteClient({
  enabled,
  inviterBonus,
  inviteeBonus,
  initialInvitation,
  initialUses,
}: InviteClientProps) {
  const [invitation, setInvitation] = useState<InvitationData | null>(
    initialInvitation
  );
  const [uses, setUses] = useState<ReferralUse[]>(initialUses);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteLink = invitation
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/sign-up?ref=${invitation.code}`
    : "";

  async function handleActivateLink() {
    setLoading(true);
    try {
      const res = await fetch("/api/invite/activate", {
        method: "POST",
      });
      const json = await res.json();
      if (json.success && json.data) {
        toast.success("Your invitation link has been activated!");
        // Refresh full data
        const meRes = await fetch("/api/invite/me");
        const meJson = await meRes.json();
        if (meJson.success && meJson.data?.invitation) {
          setInvitation(meJson.data.invitation);
          setUses(meJson.data.uses ?? []);
        }
      } else {
        toast.error(json.error || "Failed to activate invite link");
      }
    } catch {
      toast.error("Network error activating link");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Invite link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleShare() {
    if (!inviteLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Free Fire Tournaments & Win Coins!",
          text: `Sign up using my invite link and get ₹${inviteeBonus} bonus coins!`,
          url: inviteLink,
        });
      } catch {
        // Share cancelled by user
      }
    } else {
      handleCopy();
    }
  }

  const shareText = encodeURIComponent(
    `🏆 Join Free Fire Tournaments with me! Use my link to sign up and get ₹${inviteeBonus} bonus coins: ${inviteLink}`
  );
  const whatsappUrl = `https://wa.me/?text=${shareText}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(`🏆 Join Free Fire Tournaments with me! Sign up to claim your ₹${inviteeBonus} bonus coins.`)}`;

  if (!enabled) {
    return (
      <div className="w-full max-w-3xl mx-auto py-12 px-4 animate-in fade-in duration-200">
        <Card className="rounded-3xl border border-border/30 bg-card/80 p-8 text-center shadow-lg backdrop-blur-md">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-destructive/10 text-destructive flex items-center justify-center mb-4 border border-destructive/20 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground font-lora">
            Invitation Program Offline
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto font-ibm leading-relaxed">
            The referral and reward system is currently paused by the platform administrator. Check back soon for exciting referral rewards!
          </p>
          <div className="mt-8">
            <Link href="/dashboard">
              <Button className="rounded-2xl h-11 px-8 font-bold gap-2 shadow-sm">
                Return to Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 py-4 sm:py-6 px-3 sm:px-6 animate-in fade-in duration-200 font-ibm">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-amber-500/15 border border-primary/30 p-6 sm:p-10 shadow-sm">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-primary/20 text-primary border border-primary/30 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Invite & Earn Rewards
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight font-lora leading-tight">
            Invite friends, earn <span className="text-primary">₹{inviterBonus} coins</span> per user!
          </h1>
          <p className="text-xs sm:text-base text-muted-foreground leading-relaxed">
            Bring your gaming squad to Free Fire tournaments. When they register using your invite link, they get a <span className="font-bold text-foreground">₹{inviteeBonus} welcome bonus</span>, and you receive <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{inviterBonus} bonus coins</span> credited directly!
          </p>
        </div>
      </div>

      {/* Main Link Activation or Share Area */}
      {!invitation ? (
        <Card className="rounded-3xl border border-border/30 shadow-sm p-6 sm:p-10 text-center bg-card/60 backdrop-blur-md">
          <div className="mx-auto w-14 h-14 rounded-3xl bg-primary/15 text-primary flex items-center justify-center mb-4 border border-primary/20 shadow-inner">
            <Share2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-foreground font-lora">Activate Your Invitation Link</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
            Generate your unique shareable code in 1-click and start collecting rewards for every new user who joins.
          </p>
          <Button
            onClick={handleActivateLink}
            disabled={loading}
            className="mt-6 h-12 px-8 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-white shadow-md text-sm sm:text-base"
          >
            {loading ? "Generating Link..." : "Generate My Invite Link"}
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Link Box & Social Quick Share */}
          <Card className="rounded-3xl border border-primary/30 bg-card/60 backdrop-blur-md p-5 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-primary" /> Your Unique Referral Link
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground font-semibold hidden sm:inline">Code:</span>
                <code className="bg-primary/15 text-primary border border-primary/30 font-mono font-bold px-2.5 py-0.5 rounded-lg text-xs">
                  {invitation.code}
                </code>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Input
                readOnly
                value={inviteLink}
                className="h-12 text-xs sm:text-sm font-mono bg-background/80 border border-border/30 rounded-2xl font-semibold select-all text-foreground flex-1 min-w-0"
              />

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="flex-1 sm:flex-none h-12 px-5 rounded-2xl font-bold border-border/40 hover:bg-accent gap-2 text-xs sm:text-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy Link
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleShare}
                  className="flex-1 sm:flex-none h-12 px-6 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm text-xs sm:text-sm"
                >
                  <Share2 className="w-4 h-4" /> Share
                </Button>
              </div>
            </div>

            {/* Quick Social Instant Share Buttons */}
            <div className="pt-2 border-t border-border/20 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground font-semibold">
                Quick Share with Squad:
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-all"
                >
                  <Send className="w-3.5 h-3.5" /> Telegram
                </a>
              </div>
            </div>
          </Card>

          {/* User Performance Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="rounded-2xl sm:rounded-3xl border border-border/30 bg-card/60 backdrop-blur-xs p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">
                    Total Referred
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
                    {invitation.totalInvites} Users
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="rounded-2xl sm:rounded-3xl border border-border/30 bg-card/60 backdrop-blur-xs p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">
                    Coins Earned
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    ₹{invitation.totalEarned}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Coins className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card className="rounded-2xl sm:rounded-3xl border border-border/30 bg-card/60 backdrop-blur-xs p-5 shadow-sm col-span-1 sm:col-span-2 md:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">
                    Friend Welcome Bonus
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-amber-500 mt-1">
                    ₹{inviteeBonus} Coins
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Gift className="w-6 h-6" />
                </div>
              </div>
            </Card>
          </div>

          {/* Referred Users Squad Audit Log */}
          <Card className="rounded-3xl border border-border/30 bg-card/60 backdrop-blur-xs overflow-hidden shadow-sm">
            <div className="p-5 border-b border-border/20 bg-muted/20 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground font-lora">Referred Squad Log</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-ibm">
                  History of friends who registered for Free Fire tournaments using your invitation link.
                </p>
              </div>
              <span className="text-xs font-extrabold text-muted-foreground bg-background px-3 py-1.5 rounded-full border border-border/30 shrink-0">
                {uses.length} Registrations
              </span>
            </div>

            {uses.length === 0 ? (
              <div className="text-center py-14 px-4">
                <div className="w-14 h-14 rounded-3xl bg-muted/30 p-3 mx-auto mb-3 border border-border/20 flex items-center justify-center text-muted-foreground/50">
                  <UserCheck className="w-8 h-8" />
                </div>
                <p className="text-base font-bold text-foreground">No referral signups yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                  Copy your link above and share it on WhatsApp, Telegram, or Discord to start earning bonus coins!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {uses.map((use) => (
                  <div
                    key={use.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/15 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                        {use.inviteeName?.substring(0, 2).toUpperCase() || "FF"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">
                          {use.inviteeName || "Gamertag Member"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Joined {format(new Date(use.createdAt), "dd MMM yyyy, h:mm a")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 text-xs shrink-0 border-t sm:border-t-0 border-border/20 pt-2 sm:pt-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          use.signupMethod === "google"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                            : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                        }`}
                      >
                        {use.signupMethod === "google" ? "Google Signup" : "Email Signup"}
                      </span>

                      <div className="text-right">
                        <span className="block font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                          +₹{use.inviterBonusAmount} Credited
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          Friend got +₹{use.inviteeBonusAmount}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
