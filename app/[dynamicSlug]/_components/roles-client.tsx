"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Shield, Users, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Muted } from "@/components/ui/typography";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Role {
  id: string; name: string; description: string | null;
  permissions: string; createdAt: string; userCount: number;
}

export default function RolesPage({ initialData }: { initialData: Role[] }) {
  const router = useRouter();
  const params = useParams();
  const panelSlug = params.dynamicSlug as string;
  const [roles, setRoles] = useState<Role[]>(initialData);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const data = await fetch("/api/admin/roles").then(r => r.json());
    setRoles(data);
    setLoading(false);
  }
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete role "${name}"? Users with this role will lose their permissions.`)) return;
    const res = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
    if (res.ok) { 
      toast.success("Role deleted."); 
      load(); 
      router.refresh();
    }
    else toast.error("Delete failed.");
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="header-admin">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Roles & Permissions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Create roles, assign permissions, then assign roles to users.</p>
          </div>
        </div>
        <Link href={`/${panelSlug}/roles/new`} prefetch={false}>
          <Button><Plus className="h-4 w-4" />New Role</Button>
        </Link>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <p className="font-semibold">How RBAC works</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Create a role and select which admin sections & actions it can access.</li>
            <li>Go to <Link href={`/${panelSlug}/users`} prefetch={false} className="underline">Users</Link> and assign the role to a user.</li>
            <li>That user can now access only their permitted sections in the admin panel.</li>
          </ol>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-widget animate-pulse p-5">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-accent/60 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-accent/60" />
                  <div className="h-3 w-64 rounded bg-accent/40" />
                  <div className="flex gap-2 mt-2">
                    <div className="h-5 w-20 rounded bg-accent/40" />
                    <div className="h-5 w-24 rounded bg-accent/40" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : roles.length === 0 ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center bg-background px-6 py-10 text-center rounded-2xl border">
          <Shield className="mb-4 h-6 w-6 text-foreground" />
          <h4 className="text-sm font-semibold text-foreground">No roles yet</h4>
          <Muted className="mt-1 text-sm mb-4">Create your first role to get started.</Muted>
          <Link href={`/${panelSlug}/roles/new`} prefetch={false}>
            <Button variant="outline"><Plus className="h-4 w-4" />Create Role</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {roles.map(role => {
            const perms: string[] = JSON.parse(role.permissions || "[]");
            return (
              <Card key={role.id} className="card-widget">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{role.name}</span>
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Users className="h-3 w-3" />
                        {role.userCount} user{role.userCount !== 1 ? "s" : ""}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{perms.length} permission{perms.length !== 1 ? "s" : ""}</span>
                    </div>
                    {role.description && <p className="text-sm text-muted-foreground mt-1">{role.description}</p>}
                    {perms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {perms.slice(0, 8).map(p => (
                          <Badge key={p} variant="secondary" className="text-[10px] font-mono">{p}</Badge>
                        ))}
                        {perms.length > 8 && <Badge variant="secondary" className="text-[10px]">+{perms.length - 8} more</Badge>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link href={`/${panelSlug}/roles/${role.id}`} prefetch={false}>
                      <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(role.id, role.name)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
