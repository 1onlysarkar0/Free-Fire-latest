'use client';

import { useState } from "react";
import { format } from "date-fns";
import {
  Share2, Copy, Check, Gift, Coins, Users, Sparkles,
  Link as LinkIcon, ShieldAlert, ArrowRight, UserCheck, MessageCircle, Send
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  const [invitation, setInvitation] = useState<InvitationData | null>(initialInvitation);
  const [uses, setUses] = useState<ReferralUse[]>(initialUses);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteLink = invitation
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/sign-up?ref=${invitation.code}`
    : "";

  async function handleActivateLink() {
    setLoading(true);
    try {
      const res = await fetch("/api/invite/activate", { method: "POST" });
      const json = await res.json();
      if (json.success && json.data) {
        toast.success("Invitation link activated!");
        const meRes = await fetch("/api/invite/me");
        const meJson = await meRes.json();
        if (meJson.success && meJson.data?.invitation) {
          setInvitation(meJson.data.invitation);
          setUses(meJson.data.uses ?? []);
        }
      } else {
        toast.error(json.error || "Failed to activate link");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  const shareText = encodeURIComponent(
    `🏆 Join Free Fire Tournaments with me! Use my link to sign up and get ₹${inviteeBonus} bonus coins: ${inviteLink}`
  );
  const whatsappUrl = `https://wa.me/?text=${shareText}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(`🏆 Join Free Fire Tournaments with me! Sign up to claim your ₹${inviteeBonus} bonus coins.`)}`;

  if (!enabled) {
    return (
      <div className="w-full max-w-xl mx-auto py-12 px-4 text-foreground font-ibm">
        <Card className="rounded-2xl border border-border/40 bg-card p-6 text-center shadow-3xs">
          <ShieldAlert className="w-8 h-8 text-destructive mx-auto mb-3" />
          <h2 className="text-lg font-bold font-lora">Referral Program Offline</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            The referral system is currently paused by platform administrators.
          </p>
          <Button asChild className="mt-5 text-xs h-9 px-4 rounded-xl font-semibold">
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 pb-6 text-foreground font-ibm">
      {/* Hero Card */}
      <Card className="p-4 sm:p-5 rounded-2xl border border-primary/20 bg-primary/5 shadow-3xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-primary/10 text-primary uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> Invite Rewards
            </div>
            <h1 className="text-lg sm:text-xl font-bold font-lora text-foreground">
              Invite friends, earn <span className="text-primary font-mono">₹{inviterBonus}</span> per user!
            </h1>
            <p className="text-xs text-muted-foreground max-w-lg">
              Friends get <strong className="text-foreground">₹{inviteeBonus} bonus coins</strong> on signup, and you receive <strong className="text-emerald-600 dark:text-emerald-400 font-mono">₹{inviterBonus} coins</strong> directly!
            </p>
          </div>

          {!invitation && (
            <Button onClick={handleActivateLink} disabled={loading} className="h-9 text-xs font-bold rounded-xl px-4 shrink-0">
              {loading ? "Generating..." : "Activate Invite Link"}
            </Button>
          )}
        </div>
      </Card>

      {invitation && (
        <>
          {/* Active Referral Box */}
          <Card className="p-4 rounded-2xl border border-border/40 bg-card space-y-3 shadow-3xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <LinkIcon className="w-3.5 h-3.5 text-primary" /> Your Referral Link
              </span>
              <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                Code: {invitation.code}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Input
                readOnly
                value={inviteLink}
                className="h-9 text-xs font-mono bg-secondary/50 border border-border/40 rounded-xl font-semibold text-foreground flex-1 min-w-0"
              />
              <div className="flex items-center gap-2 shrink-0">
                <Button onClick={handleCopy} variant="outline" className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 border-border/50">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 h-9 px-3 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
                <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 h-9 px-3 rounded-xl text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-colors">
                  <Send className="w-3.5 h-3.5" /> Telegram
                </a>
              </div>
            </div>
          </Card>

          {/* Referral Performance Stats */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            <Card className="p-4 rounded-2xl border border-border/40 bg-card shadow-3xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Referred</p>
                <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground font-mono tabular-nums mt-1">{invitation.totalInvites} Users</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Users className="h-4 w-4" />
              </div>
            </Card>

            <Card className="p-4 rounded-2xl border border-border/40 bg-card shadow-3xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Coins Earned</p>
                <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">₹{invitation.totalEarned}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Coins className="h-4 w-4" />
              </div>
            </Card>

            <Card className="p-4 rounded-2xl border border-border/40 bg-card shadow-3xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Friend Bonus</p>
                <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-amber-500 font-mono tabular-nums mt-1">₹{inviteeBonus}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Gift className="h-4 w-4" />
              </div>
            </Card>
          </div>

          {/* Squad Log */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Referred Friends ({uses.length})</h2>
            </div>

            {uses.length === 0 ? (
              <Card className="p-6 rounded-2xl border border-border/40 bg-card/60 text-center">
                <UserCheck className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs font-bold text-foreground">No signups recorded yet</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Share your link to start receiving bonus coin credits.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {uses.map((use) => (
                  <Card key={use.id} className="p-3 rounded-xl border border-border/40 bg-card flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                        {use.inviteeName?.substring(0, 2).toUpperCase() || "FF"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{use.inviteeName || "Gamertag Member"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{format(new Date(use.createdAt), "dd MMM yyyy, h:mm a")}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">+₹{use.inviterBonusAmount}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">Friend got +₹{use.inviteeBonusAmount}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
