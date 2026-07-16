'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Share2, RefreshCw, Save, Users, Calendar, ShieldAlert,
  Coins, Gift, Eye, ChevronRight, Search, Gamepad2, ShieldCheck,
  Sliders, UserCheck, Sparkles, Filter
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface InvitationConfig {
  enabled: boolean;
  inviterBonus: number;
  inviteeBonus: number;
}

interface InviterUser {
  id: string;
  code: string;
  isActive: boolean;
  totalInvites: number;
  totalEarned: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  userGameName: string | null;
}

interface InviteeUse {
  id: string;
  signupMethod: string;
  inviterBonusAmount: number;
  inviteeBonusAmount: number;
  createdAt: string;
  inviteeUserId: string;
  inviteeName: string | null;
  inviteeEmail: string | null;
  inviteeGameName: string | null;
  inviteeImage: string | null;
}

export default function InvitationAdminClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users" | "config">("users");

  const [config, setConfig] = useState<InvitationConfig>({
    enabled: false,
    inviterBonus: 50,
    inviteeBonus: 25,
  });
  const [configSaving, setConfigSaving] = useState(false);

  const [users, setUsers] = useState<InviterUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<InviterUser | null>(null);
  const [userUses, setUserUses] = useState<InviteeUse[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadData(1);
  }, []);

  async function loadData(p: number) {
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/admin/invitation?page=${p}&limit=50`);
      if (!res.ok) throw new Error("Failed to load data");
      const json = await res.json();
      if (json.success && json.data) {
        setConfig(json.data.config);
        setUsers(json.data.users ?? []);
        setTotalPages(json.data.pagination?.totalPages ?? 1);
        setPage(p);
      }
    } catch {
      toast.error("Failed to load invitation system data");
    } finally {
      setUsersLoading(false);
    }
  }

  async function saveConfig() {
    setConfigSaving(true);
    try {
      const res = await fetch("/api/admin/invitation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Invitation system settings saved successfully!");
        router.refresh();
      } else {
        toast.error(json.error || "Failed to update settings");
      }
    } catch {
      toast.error("Network error saving configuration");
    } finally {
      setConfigSaving(false);
    }
  }

  async function openUserDetail(u: InviterUser) {
    setSelectedUser(u);
    setUserUses([]);
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/invitation/${u.userId}`);
      if (!res.ok) throw new Error("Failed to fetch user details");
      const json = await res.json();
      if (json.success && json.data) {
        setUserUses(json.data.uses ?? []);
      }
    } catch {
      toast.error("Failed to load user historical signups");
    } finally {
      setDetailLoading(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.userName?.toLowerCase().includes(q) ||
      u.userEmail?.toLowerCase().includes(q) ||
      u.code.toLowerCase().includes(q) ||
      u.userGameName?.toLowerCase().includes(q)
    );
  });

  const totalInvitesCount = users.reduce((acc, u) => acc + u.totalInvites, 0);
  const totalCoinsPaid = users.reduce((acc, u) => acc + u.totalEarned, 0);

  return (
    <div className="w-full min-w-0 space-y-6 animate-in fade-in duration-200">
      {/* Responsive Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl border border-border/30 bg-card/60 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="rounded-2xl bg-primary/15 p-3 text-primary shrink-0 border border-primary/20">
            <Share2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-lora">
                Invitation System
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="h-3 w-3" /> Growth Engine
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-ibm">
              Manage global referral bonuses, inspect active inviters queue, and audit referred signups.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {!config.enabled ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-1.5 text-xs font-bold text-destructive shadow-xs">
              <ShieldAlert className="h-4 w-4" />
              <span>System Disabled</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-xs">
              <ShieldCheck className="h-4 w-4" />
              <span>System Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Container */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "users" | "config")}
        className="w-full space-y-6"
      >
        <TabsList className="w-full sm:w-auto flex h-auto items-center justify-start rounded-2xl bg-muted/40 p-1.5 border border-border/30 overflow-x-auto">
          <TabsTrigger
            value="users"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:shadow-xs"
          >
            <Users className="h-4 w-4 text-primary" />
            <span>Inviters Queue & Audit</span>
          </TabsTrigger>
          <TabsTrigger
            value="config"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:shadow-xs"
          >
            <Sliders className="h-4 w-4 text-amber-500" />
            <span>System Settings & Bonuses</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Users & Queue */}
        <TabsContent value="users" className="outline-none space-y-6">
          {/* Stat Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="rounded-2xl sm:rounded-3xl border border-border/30 bg-card/60 backdrop-blur-xs p-5 shadow-sm">
              <CardContent className="p-0 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {users.length}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                    Active Inviters
                  </div>
                </div>
                <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10 text-primary border border-primary/20">
                  <Users className="h-5.5 w-5.5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl sm:rounded-3xl border border-border/30 bg-card/60 backdrop-blur-xs p-5 shadow-sm">
              <CardContent className="p-0 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-500">
                    {totalInvitesCount}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                    Total Referred Users
                  </div>
                </div>
                <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Gift className="h-5.5 w-5.5" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl sm:rounded-3xl border border-border/30 bg-card/60 backdrop-blur-xs p-5 shadow-sm col-span-1 sm:col-span-2 md:col-span-1">
              <CardContent className="p-0 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-500">
                    ₹{totalCoinsPaid}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                    Total Coins Awarded
                  </div>
                </div>
                <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Coins className="h-5.5 w-5.5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main User List Section */}
          <Card className="rounded-2xl sm:rounded-3xl border border-border/30 bg-card/60 backdrop-blur-xs overflow-hidden shadow-sm">
            {/* Search & Actions Control Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border/20 bg-muted/20">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, gamertag, or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 rounded-xl text-xs sm:text-sm bg-background/80 border-border/30"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl border border-border/30 bg-background/80 hover:bg-muted px-4 text-xs font-bold inline-flex items-center justify-center gap-2 shrink-0"
                onClick={() => loadData(page)}
                disabled={usersLoading}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-muted-foreground ${
                    usersLoading ? "animate-spin text-primary" : ""
                  }`}
                />
                Refresh Queue
              </Button>
            </div>

            {/* List Body */}
            {usersLoading ? (
              <div className="divide-y divide-border/20">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-5 flex items-center justify-between gap-4 animate-pulse">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-1/3 bg-muted rounded" />
                        <div className="h-3 w-1/4 bg-muted rounded" />
                      </div>
                    </div>
                    <div className="h-4 w-20 bg-muted rounded shrink-0 hidden sm:block" />
                    <div className="h-8 w-24 bg-muted rounded-xl shrink-0" />
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 sm:p-16 text-center">
                <div className="rounded-3xl bg-muted/30 p-5 mb-3 border border-border/20">
                  <Share2 className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-base font-bold text-foreground">No inviters found</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                  {searchQuery
                    ? `No users match "${searchQuery}".`
                    : "No users have generated or activated an invite code yet."}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile & Tablet Card Layout (screens below xl) */}
                <div className="xl:hidden divide-y divide-border/20">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-4 sm:p-5 hover:bg-muted/15 transition-colors cursor-pointer"
                      onClick={() => openUserDetail(u)}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10 border border-border/40 shrink-0">
                            <AvatarImage src={u.userImage ?? undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                              {u.userName?.substring(0, 2).toUpperCase() || "US"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-foreground truncate">
                              {u.userName || "User"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.userEmail}
                            </p>
                            {u.userGameName && (
                              <p className="text-[11px] text-primary flex items-center gap-1 font-semibold mt-0.5">
                                <Gamepad2 className="h-3 w-3" /> {u.userGameName}
                              </p>
                            )}
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border shrink-0 ${
                            u.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-muted text-muted-foreground border-border/40"
                          }`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs bg-muted/20 border border-border/20 rounded-2xl p-3 sm:p-4">
                        <div>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
                            Invite Code
                          </p>
                          <code className="font-mono text-xs font-bold text-primary bg-background border border-primary/20 rounded-lg px-2 py-1 inline-block">
                            {u.code}
                          </code>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
                            Total Invites
                          </p>
                          <p className="font-extrabold text-sm text-foreground">
                            {u.totalInvites} users
                          </p>
                        </div>
                        <div className="col-span-2 flex items-center justify-between border-t border-border/20 pt-2 mt-1">
                          <span className="text-xs font-semibold text-muted-foreground">Total Earned:</span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                            ₹{u.totalEarned} Coins
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="text-[11px]">
                          Activated: {format(new Date(u.createdAt), "dd MMM yyyy")}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-bold text-primary hover:text-primary gap-1 px-2"
                        >
                          Inspect Signups <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Large Desktop Table Layout (xl and up) */}
                <div className="hidden xl:block overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-muted/30 border-b border-border/20">
                      <tr>
                        <th className="text-left px-6 py-4 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          Inviter Member
                        </th>
                        <th className="text-left px-6 py-4 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          Invite Code
                        </th>
                        <th className="text-center px-6 py-4 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          Referred Count
                        </th>
                        <th className="text-right px-6 py-4 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          Earned Coins
                        </th>
                        <th className="text-left px-6 py-4 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          Link Status
                        </th>
                        <th className="text-left px-6 py-4 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          Activated On
                        </th>
                        <th className="text-right px-6 py-4 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {filteredUsers.map((u) => (
                        <tr
                          key={u.id}
                          className="hover:bg-muted/15 transition-colors cursor-pointer group"
                          onClick={() => openUserDetail(u)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border border-border/40 shrink-0">
                                <AvatarImage src={u.userImage ?? undefined} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                                  {u.userName?.substring(0, 2).toUpperCase() || "US"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-foreground truncate">
                                  {u.userName || "User"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {u.userEmail}
                                </p>
                                {u.userGameName && (
                                  <p className="text-[11px] text-primary/90 flex items-center gap-1 font-semibold">
                                    <Gamepad2 className="h-3 w-3" /> {u.userGameName}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <code className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-1 font-mono inline-block">
                              {u.code}
                            </code>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center h-7 px-3.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs border border-emerald-500/20">
                              {u.totalInvites} users
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <span className="font-extrabold text-base text-foreground">
                              ₹{u.totalEarned}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                                u.isActive
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : "bg-muted text-muted-foreground border-border/40"
                              }`}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  u.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                                }`}
                              />
                              {u.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-xs text-muted-foreground">
                            {format(new Date(u.createdAt), "dd MMM yyyy, h:mm a")}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-xl border-border/30 hover:bg-muted text-xs font-bold gap-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                openUserDetail(u);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 text-primary" />
                              Inspect Log
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-border/20 bg-muted/10">
                <span className="text-xs text-muted-foreground font-semibold">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={usersLoading || page <= 1}
                    onClick={() => loadData(page - 1)}
                    className="flex-1 sm:flex-none h-9 rounded-xl font-bold"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={usersLoading || page >= totalPages}
                    onClick={() => loadData(page + 1)}
                    className="flex-1 sm:flex-none h-9 rounded-xl font-bold"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Tab 2: System Settings */}
        <TabsContent value="config" className="outline-none">
          <Card className="rounded-2xl sm:rounded-3xl border border-border/30 bg-card/60 backdrop-blur-xs overflow-hidden shadow-sm">
            <div className="p-5 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/20 pb-6">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground font-lora">
                    Referral System Rules & Coin Allocations
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-ibm">
                    Manage global system availability, referrer coin reward, and new signup bonus amount.
                  </p>
                </div>
                <Button
                  onClick={saveConfig}
                  disabled={configSaving}
                  className="gap-2 h-11 w-full sm:w-auto px-6 rounded-2xl font-bold shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  {configSaving ? "Saving Settings..." : "Save Settings"}
                </Button>
              </div>

              <div className="space-y-6 max-w-xl">
                {/* On/Off Switch Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-muted/20 border border-border/30">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">
                        Global Invitation System
                      </p>
                      {config.enabled ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      When turned off, users cannot generate links or access their invite hub page.
                    </p>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(v) => setConfig({ ...config, enabled: v })}
                    className="shrink-0 self-end sm:self-center"
                  />
                </div>

                {/* Inviter Bonus Field */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-500" /> Inviter Reward (Coins per Signup)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={config.inviterBonus}
                    onChange={(e) =>
                      setConfig({ ...config, inviterBonus: parseInt(e.target.value) || 0 })
                    }
                    className="h-11 text-base rounded-xl font-bold bg-background/80"
                  />
                  <p className="text-xs text-muted-foreground">
                    Bonus coins credited to the referrer when an invited user registers.
                  </p>
                </div>

                {/* Invitee Bonus Field */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Gift className="h-4 w-4 text-emerald-500" /> Invitee Signup Bonus (Coins)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={config.inviteeBonus}
                    onChange={(e) =>
                      setConfig({ ...config, inviteeBonus: parseInt(e.target.value) || 0 })
                    }
                    className="h-11 text-base rounded-xl font-bold bg-background/80"
                  />
                  <p className="text-xs text-muted-foreground">
                    Welcome bonus coins credited to the newly registered account.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Referral Audit Dialog Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="rounded-3xl sm:max-w-2xl border border-border/30 shadow-xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-card/95 backdrop-blur-md">
          <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-border/20 bg-muted/20">
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 font-lora">
              <Share2 className="h-5 w-5 text-primary" />
              Referral Audit Trail — {selectedUser?.userName || "User"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1 font-ibm">
              Detailed list of all accounts registered using code{" "}
              <code className="font-mono font-bold text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">
                {selectedUser?.code}
              </code>
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
            {detailLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : userUses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-bold text-foreground">No signups linked to this code yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userUses.map((use) => (
                  <div
                    key={use.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-muted/20 border border-border/20 hover:border-border/40 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 border border-border/40 shrink-0">
                        <AvatarImage src={use.inviteeImage ?? undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                          {use.inviteeName?.substring(0, 2).toUpperCase() || "US"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">
                          {use.inviteeName || "New Member"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {use.inviteeEmail}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-xs shrink-0 border-t sm:border-t-0 border-border/20 pt-2 sm:pt-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          use.signupMethod === "google"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                            : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                        }`}
                      >
                        {use.signupMethod === "google" ? "Google OAuth" : "Email"}
                      </span>

                      <div className="text-right">
                        <span className="block font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                          +₹{use.inviterBonusAmount} (Inviter)
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          +₹{use.inviteeBonusAmount} (Invitee)
                        </span>
                      </div>

                      <div className="text-right text-[11px] text-muted-foreground shrink-0">
                        {format(new Date(use.createdAt), "dd MMM, h:mm a")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
