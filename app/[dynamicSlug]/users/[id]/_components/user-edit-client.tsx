"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, KeyRound, AlertTriangle, Trash2, ArrowLeft, Save, Wallet, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AvatarDisplay } from "@/components/ui/avatar-display";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Role { id: string; name: string; description: string | null; }

function WalletCard({ userId, initialBalance }: { userId: string; initialBalance: number }) {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(initialBalance);
  const [loading] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [action, setAction] = useState<"credit" | "debit">("credit");

  async function handleAdjust() {
    const amt = parseInt(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid positive amount");
    setAdjusting(true);
    try {
      const res = await fetch("/api/admin/wallet/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: amt, action, description: description || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${action === "credit" ? "Credited" : "Debited"} ₹${amt}. New balance: ₹${data.newBalance}`);
        setBalance(data.newBalance);
        setAmount("");
        setDescription("");
        router.refresh();
      } else {
        toast.error(data.error || "Wallet adjustment failed");
      }
    } catch {
      toast.error("Failed to adjust wallet");
    } finally {
      setAdjusting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-foreground" />
            <span className="font-semibold text-foreground">Wallet Balance</span>
          </div>
          {loading ? null : (
            <span className="text-2xl font-black text-primary">₹{balance ?? 0}</span>
          )}
        </div>
      </div>

      <div className="max-w-sm space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAction("credit")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold border transition-colors ${action === "credit" ? "bg-success text-white border-green-500" : "bg-card text-muted-foreground border-border hover:border-muted"}`}
          >
            <Plus className="h-4 w-4" /> Credit
          </button>
          <button
            type="button"
            onClick={() => setAction("debit")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold border transition-colors ${action === "debit" ? "bg-destructive text-white border-red-500" : "bg-card text-muted-foreground border-border hover:border-muted"}`}
          >
            <Minus className="h-4 w-4" /> Debit
          </button>
        </div>

        <div>
          <Label className="text-xs font-semibold">Amount (₹)</Label>
          <Input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 100"
            className="mt-1 h-9"
          />
        </div>

        <div>
          <Label className="text-xs font-semibold">Reason (optional)</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`${action === "credit" ? "Credit reason" : "Debit reason"}…`}
            className="mt-1 h-9"
          />
        </div>

        <Button
          onClick={handleAdjust}
          disabled={adjusting || !amount}
          className={`w-full ${action === "credit" ? "bg-success hover:bg-green-600" : "bg-destructive hover:bg-destructive"} text-white`}
        >
          {adjusting
            ? <span className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
            : action === "credit" ? <Plus className="h-4 w-4 mr-2" /> : <Minus className="h-4 w-4 mr-2" />
          }
          {action === "credit" ? "Credit" : "Debit"}
        </Button>
      </div>
    </div>
  );
}

export default function UserEditClient({
  dynamicSlug,
  userId,
  initialUser,
  initialRoles,
  initialUserRoleIds,
  initialUserRoles,
  initialWalletBalance
}: {
  dynamicSlug: string;
  userId: string;
  initialUser: {
    name?: string | null;
    email?: string | null;
    gameName?: string | null;
    uid?: string | null;
    image?: string | null;
    topPlayer?: boolean | null;
    emailVerified?: boolean | null;
    isBanned?: boolean | null;
    banReason?: string | null;
  };
  initialRoles: Role[];
  initialUserRoleIds: string[];
  initialUserRoles?: { id: string; name: string; assignedAt: string | null }[];
  initialWalletBalance: number;
}) {
  const router = useRouter();

  const [roles] = useState<Role[]>(initialRoles);
  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [editForm, setEditForm] = useState({
    name: initialUser.name ?? "",
    email: initialUser.email ?? "",
    gameName: initialUser.gameName ?? "",
    uid: initialUser.uid ?? "",
    image: initialUser.image ?? "",
    topPlayer: initialUser.topPlayer ?? false,
    emailVerified: initialUser.emailVerified ?? false,
    isBanned: initialUser.isBanned ?? false,
    banReason: initialUser.banReason ?? "",
    roleId: initialUserRoleIds[0] || "",
    newPassword: "",
  });

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name,
        email: editForm.email,
        gameName: editForm.gameName || null,
        uid: editForm.uid || null,
        image: editForm.image || null,
        topPlayer: editForm.topPlayer,
        emailVerified: editForm.emailVerified,
        isBanned: editForm.isBanned,
        banReason: editForm.isBanned ? (editForm.banReason || null) : null,
        roleId: editForm.roleId || null,
      };
      if (editForm.newPassword.trim().length >= 8) {
        payload.newPassword = editForm.newPassword.trim();
      }
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("User updated.");
      router.refresh();
      router.push(`/${dynamicSlug}/users`);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast.success("User permanently deleted.");
      router.refresh();
      router.push(`/${dynamicSlug}/users`);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setDeleting(false); }
  }

  if (loading) return null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/${dynamicSlug}/users`} prefetch={true}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground font-inter flex items-center gap-3">
            <AvatarDisplay
              image={editForm.image}
              name={editForm.name}
              className="h-8 w-8"
            />
            Edit User
          </h1>
          <p className="text-sm text-muted-foreground font-ibm mt-1">Modifying {editForm.email}</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white gap-2">
          {saving
            ? <span className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
            : <Save className="h-4 w-4" />
          }
          Save Changes
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full grid grid-cols-5 rounded-none border-b bg-muted/50 h-12 p-0">
            <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary">Profile</TabsTrigger>
            <TabsTrigger value="gaming" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary">Gaming</TabsTrigger>
            <TabsTrigger value="access" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary">Access</TabsTrigger>
            <TabsTrigger value="wallet" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary">Wallet</TabsTrigger>
            <TabsTrigger value="security" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary">Security</TabsTrigger>
          </TabsList>

          <div className="p-6">
            {/* Profile Tab */}
            <TabsContent value="profile" className="mt-0 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Display Name</Label>
                <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Email Address</Label>
                <Input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} className="h-10" type="email" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-sm font-semibold">Profile Image URL</Label>
                <div className="flex gap-4">
                  {editForm.image && (
                    <AvatarDisplay
                      image={editForm.image}
                      name={editForm.name}
                      className="h-10 w-10 shrink-0"
                    />
                  )}
                  <Input value={editForm.image} onChange={e => setEditForm(p => ({ ...p, image: e.target.value }))} className="h-10 flex-1" placeholder="https://..." />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border md:col-span-2 bg-muted/50">
                <div>
                  <Label className="text-sm font-medium">Email Verified</Label>
                  <p className="text-xs text-muted-foreground mt-1">Mark email as verified without resending.</p>
                </div>
                <Switch checked={editForm.emailVerified} onCheckedChange={v => setEditForm(p => ({ ...p, emailVerified: v }))} />
              </div>
            </TabsContent>

            {/* Gaming Tab */}
            <TabsContent value="gaming" className="mt-0 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">In-Game Name</Label>
                <Input value={editForm.gameName} onChange={e => setEditForm(p => ({ ...p, gameName: e.target.value }))} className="h-10" placeholder="Player123" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Game UID</Label>
                <Input value={editForm.uid} onChange={e => setEditForm(p => ({ ...p, uid: e.target.value }))} className="h-10" placeholder="123456789" />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border md:col-span-2 bg-muted/50">
                <div>
                  <Label className="text-sm font-medium">Top Player</Label>
                  <p className="text-xs text-muted-foreground mt-1">Featured in the homepage marquee.</p>
                </div>
                <Switch checked={editForm.topPlayer} onCheckedChange={v => setEditForm(p => ({ ...p, topPlayer: v }))} />
              </div>
            </TabsContent>

            {/* Access Tab */}
            <TabsContent value="access" className="mt-0 space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">ℹ Superadmin access can only be granted directly in the database. It cannot be toggled here.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Assign Role</Label>
                <div className="relative max-w-md">
                  <select
                    value={editForm.roleId}
                    onChange={e => setEditForm(p => ({ ...p, roleId: e.target.value }))}
                    className="w-full h-10 px-3 pr-8 rounded-md border border-border text-sm bg-card appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">— No Role —</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground pointer-events-none" />
                </div>
                <p className="text-xs text-muted-foreground">Assigns the selected role&apos;s permissions to this user.</p>
                {editForm.roleId && (() => {
                  const current = initialUserRoles?.find(r => r.id === editForm.roleId);
                  return current?.assignedAt ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Assigned on {new Date(current.assignedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  ) : null;
                })()}
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/10">
                  <div>
                    <Label className="text-sm font-semibold text-destructive">Ban User</Label>
                    <p className="text-xs text-foreground/80 mt-1">Banned users cannot access their account.</p>
                  </div>
                  <Switch
                    checked={editForm.isBanned}
                    onCheckedChange={v => setEditForm(p => ({ ...p, isBanned: v, banReason: v ? p.banReason : "" }))}
                    className="data-[state=checked]:bg-destructive"
                  />
                </div>
                {editForm.isBanned && (
                  <div className="space-y-1.5 max-w-2xl">
                    <Label className="text-sm font-semibold text-destructive">Ban Reason</Label>
                    <Textarea
                      value={editForm.banReason}
                      onChange={e => setEditForm(p => ({ ...p, banReason: e.target.value }))}
                      placeholder="Reason for banning this user..."
                      className="resize-none min-h-24 text-sm border-destructive/20 focus:border-destructive focus:ring-red-400"
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Wallet Tab */}
            <TabsContent value="wallet" className="mt-0 space-y-6">
              <WalletCard userId={userId} initialBalance={initialWalletBalance} />
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="mt-0 space-y-8">
              <div className="max-w-md space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound className="h-5 w-5 text-amber-600" />
                    <span className="text-base font-semibold text-amber-700">Reset Password</span>
                  </div>
                  <p className="text-sm text-amber-600/90 leading-relaxed">Leave blank to keep the current password. If providing a new one, it must be at least 8 characters.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">New Password</Label>
                  <Input
                    type="password"
                    value={editForm.newPassword}
                    onChange={e => setEditForm(p => ({ ...p, newPassword: e.target.value }))}
                    className="h-10"
                    placeholder="Leave blank to keep current"
                  />
                  {editForm.newPassword && editForm.newPassword.length < 8 && (
                    <p className="text-xs text-destructive mt-1">Minimum 8 characters required.</p>
                  )}
                </div>
              </div>

              <div className="pt-8 mt-8 border-t border-border space-y-4 max-w-xl">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-foreground" />
                  <span className="text-lg font-bold text-destructive font-inter">Danger Zone</span>
                </div>
                {!deleteConfirm ? (
                  <Button
                    variant="outline"
                    className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive hover:text-destructive gap-2 h-10"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4" />Delete User Account
                  </Button>
                ) : (
                  <div className="p-5 bg-destructive/10 border border-destructive/20 rounded-lg space-y-4">
                    <p className="text-base font-semibold text-destructive font-ibm">⚠ This cannot be undone!</p>
                    <p className="text-sm text-destructive leading-relaxed">This will permanently delete <strong>{editForm.name}</strong> and all associated data. Are you absolutely sure?</p>
                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" onClick={() => setDeleteConfirm(false)} className="flex-1 bg-card">Cancel</Button>
                      <Button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 bg-destructive hover:bg-destructive text-white gap-2"
                      >
                        {deleting
                          ? <span className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                          : <Trash2 className="h-4 w-4" />
                        }
                        Yes, Delete Permanently
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
