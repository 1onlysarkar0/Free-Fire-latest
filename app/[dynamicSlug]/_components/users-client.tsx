"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Pencil, Ban, CheckCircle, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AvatarDisplay } from "@/components/ui/avatar-display";
import { Badge } from "@/components/ui/badge";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useParams } from "next/navigation";

interface User {
  id: string; name: string; email: string; image: string | null;
  gameName: string | null; uid: string | null;
  isAdmin: boolean; topPlayer: boolean; emailVerified: boolean;
  isBanned: boolean; banReason: string | null;
  createdAt: string; roles: { id: string; name: string }[];
}

export default function UsersPage({ initialData }: { initialData: User[] }) {
  const router = useRouter();
  const params = useParams();
  const panelSlug = params.dynamicSlug as string;

  const [users, setUsers] = useState<User[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banTargetUser, setBanTargetUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const usersData = await res.json();
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleBanToggle(u: User) {
    if (!u.isBanned) {
      setBanTargetUser(u);
      setBanReason("");
      setBanDialogOpen(true);
    } else {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned: false, banReason: null }),
      });
      if (res.ok) { 
        toast.success(`${u.name} unbanned.`); 
        load(); 
        router.refresh();
      }
      else toast.error("Failed to unban.");
    }
  }

  async function confirmBan() {
    if (!banTargetUser) return;
    const res = await fetch(`/api/admin/users/${banTargetUser.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBanned: true, banReason: banReason.trim() || null }),
    });
    if (res.ok) {
      toast.success(`${banTargetUser.name} banned.`);
      setBanDialogOpen(false);
      load();
      router.refresh();
    } else toast.error("Failed to ban user.");
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.gameName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full min-w-0 p-4 md:p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Users</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Manage platform users, roles, and access.</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-9 w-full sm:w-64" />
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-accent/40 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-accent/60">
                    {["User","Game Info","Role / Status","Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[1,2,3,4].map(i => (
                    <tr key={i} className="animate-pulse">
                      {[1,2,3,4].map(j => (
                        <td key={j} className="px-4 py-3"><div className="h-4 w-20 rounded bg-accent/60" /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <Card className="rounded-2xl bg-accent/40 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b bg-accent/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Game Info</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Role / Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(u => (
                    <tr key={u.id} className={`hover:bg-accent/20 transition-colors ${u.isBanned ? "bg-destructive/5" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <AvatarDisplay image={u.image} name={u.name} className="h-8 w-8" />
                            {u.isBanned && (
                              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-destructive rounded-full flex items-center justify-center">
                                <Ban className="h-2 w-2 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm text-foreground truncate max-w-[140px]">{u.name}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[140px]">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.gameName ? (
                          <div>
                            <div className="font-medium text-muted-foreground text-xs">{u.gameName}</div>
                            <div className="text-xs text-muted-foreground">{u.uid || "No UID"}</div>
                          </div>
                        ) : <span className="text-muted-foreground/60 text-xs">Not set</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map(r => <Badge key={r.id} variant="secondary" className="text-[10px]">{r.name}</Badge>)}
                            {u.roles.length === 0 && <span className="text-muted-foreground/60 text-xs">No role</span>}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {u.topPlayer && <span className="flex items-center gap-0.5 text-[10px] text-amber-600"><Star className="h-3 w-3 fill-current" />Top</span>}
                            {u.isBanned && <span className="text-[10px] text-destructive font-medium flex items-center gap-0.5"><Ban className="h-3 w-3" />Banned</span>}
                            <span className={`text-[10px] font-medium ${u.emailVerified ? "text-success" : "text-muted-foreground"}`}>{u.emailVerified ? "✓ Verified" : "Unverified"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" asChild className="h-7 px-2.5 text-xs gap-1">
                            <Link href={`/${panelSlug}/users/${u.id}`} prefetch={true}>
                              <Pencil className="h-3 w-3" />Edit
                            </Link>
                          </Button>
                          <button
                            onClick={() => handleBanToggle(u)}
                            className={`p-1.5 rounded-lg transition-colors ${u.isBanned ? "hover:bg-success/10 text-red-400 hover:text-success" : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"}`}
                            title={u.isBanned ? "Unban user" : "Ban user"}
                          >
                            {u.isBanned ? <CheckCircle className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-10 text-muted-foreground text-sm">No users match your search.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Ban className="h-5 w-5" />Ban User: {banTargetUser?.name}
              </DialogTitle>
              <DialogDescription>This will prevent the user from accessing their account.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Ban Reason (optional)</Label>
                <Textarea value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="e.g. Cheating, violation of community guidelines..." className="resize-none min-h-16 text-sm" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBanDialogOpen(false)}>Cancel</Button>
              <Button onClick={confirmBan} className="bg-destructive hover:bg-destructive text-white gap-2">
                <Ban className="h-4 w-4" />Ban User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
