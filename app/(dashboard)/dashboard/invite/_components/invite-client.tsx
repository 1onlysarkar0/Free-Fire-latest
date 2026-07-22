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
    <div className="w-full min-w-0 space-y-5 pb-6">
      
      {/* Compact Invite Header Banner */}
      <Card className="p-4 bg-card border border-border/60 rounded-xl shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h1 className="text-base font-bold text-foreground font-lora">
                Invite Friends & Earn Rewards
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Earn <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">₹{inviterBonus} coins</span> for every friend who signs up. They receive <span className="font-bold text-foreground font-mono">₹{inviteeBonus} welcome coins</span>!
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Card className="p-2.5 px-3 bg-muted/40 border-border/60 rounded-lg text-center">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Invited</span>
              <span className="text-lg font-bold font-mono text-foreground">{invitation?.totalInvites ?? 0}</span>
            </Card>
            <Card className="p-2.5 px-3 bg-muted/40 border-border/60 rounded-lg text-center">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Earned</span>
              <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">₹{invitation?.totalEarned ?? 0}</span>
            </Card>
          </div>
        </div>
      </Card>

      {/* Main Link Activation or Share Area */}
      {!invitation ? (
        <Card className="p-6 border border-dashed border-border/80 text-center bg-card rounded-xl">
          <Share2 className="w-6 h-6 text-primary mx-auto mb-2" />
          <h3 className="text-xs font-bold text-foreground">Activate Your Invite Link</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs mx-auto">
            Generate your unique shareable code in 1-click and start collecting rewards.
          </p>
          <Button
            onClick={handleActivateLink}
            disabled={loading}
            className="mt-3 h-8 px-4 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loading ? "Generating..." : "Generate Invite Link"}
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Active Link Box & Social Quick Share */}
          <Card className="p-4 border border-border/60 bg-card rounded-xl shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <LinkIcon className="w-3.5 h-3.5 text-primary" /> Share Code: <code className="font-mono font-bold text-primary">{invitation.code}</code>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={inviteLink}
                className="h-9 text-xs font-mono bg-muted/30 border-border/60 rounded-lg font-medium select-all text-foreground flex-1 min-w-0"
              />

              <Button
                onClick={handleCopy}
                variant="outline"
                className="h-9 px-3 rounded-lg font-semibold border-border/60 text-xs gap-1.5 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </>
                )}
              </Button>
              <Button
                onClick={handleShare}
                className="h-9 px-3 rounded-lg font-semibold bg-primary text-primary-foreground text-xs gap-1.5 shrink-0"
              >
                <Share2 className="w-3.5 h-3.5" /> Share
              </Button>
            </div>

            {/* Quick Social Instant Share Buttons */}
            <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground font-medium">
                Quick Share:
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                >
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </a>
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-all"
                >
                  <Send className="w-3 h-3" /> Telegram
                </a>
              </div>
            </div>
          </Card>
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
