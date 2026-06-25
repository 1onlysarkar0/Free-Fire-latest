"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ArrowLeft, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { PERMISSION_GROUPS } from "@/lib/admin-permissions";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function NewRoleClient() {
  const router = useRouter();
  const params = useParams();
  const panelSlug = params.dynamicSlug as string;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  function togglePerm(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleGroup(groupKey: string) {
    const group = PERMISSION_GROUPS.find(g => g.key === groupKey);
    if (!group) return;
    const allKeys = group.permissions.map(p => p.key);
    const allSelected = allKeys.every(k => selected.has(k));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) allKeys.forEach(k => next.delete(k));
      else allKeys.forEach(k => next.add(k));
      return next;
    });
  }

  function selectAll() {
    const all = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));
    setSelected(new Set(all));
  }

  function clearAll() { setSelected(new Set()); }

  async function handleSave() {
    if (!name.trim()) { toast.error("Role name is required."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, permissions: Array.from(selected) }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Role "${name}" created.`);
      router.push(`/${panelSlug}/roles`);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/${panelSlug}/roles`} prefetch={true}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground font-lora">Create Role</h1>
          <p className="text-base text-muted-foreground mt-1 font-ibm">Define a role name and select which admin panel permissions it grants.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Create Role
        </Button>
      </div>

      {/* Role info */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Role Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Content Manager" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What this role can do..." className="h-9" />
          </div>
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Permission Matrix</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{selected.size} selected</span>
            <Button variant="outline" size="sm" onClick={selectAll} className="h-7 text-xs px-2.5">Select All</Button>
            <Button variant="outline" size="sm" onClick={clearAll} className="h-7 text-xs px-2.5">Clear All</Button>
          </div>
        </div>

        {PERMISSION_GROUPS.map(group => {
          const allSelected = group.permissions.every(p => selected.has(p.key));
          const someSelected = group.permissions.some(p => selected.has(p.key));
          return (
            <div key={group.key} className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
              >
                <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${allSelected ? "bg-primary border-primary" : someSelected ? "bg-primary/20 border-primary/30" : "border-muted"}`}>
                  {allSelected ? <CheckSquare className="h-3.5 w-3.5 text-white" /> : someSelected ? <span className="h-2 w-2 bg-primary rounded-sm" /> : null}
                </div>
                <span className="font-semibold text-foreground text-sm">{group.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">{group.permissions.filter(p => selected.has(p.key)).length}/{group.permissions.length}</span>
              </button>
              {/* Individual permissions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-t border-border/50 divide-y divide-border/30">
                {group.permissions.map(perm => {
                  const isChecked = selected.has(perm.key);
                  return (
                    <button
                      key={perm.key}
                      onClick={() => togglePerm(perm.key)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50 ${isChecked ? "bg-primary/10" : ""}`}
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isChecked ? "bg-primary border-primary" : "border-muted"}`}>
                        {isChecked && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-muted-foreground">{perm.label}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{perm.key}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
