"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AvatarDisplay } from "@/components/ui/avatar-display";
import { P } from "@/components/ui/typography";
import { Shield, Star, LayoutDashboard } from "lucide-react";
import { slugify } from "@/lib/utils";

export interface PermissionData {
  isAdmin: boolean;
  permissions: string[];
  roles: { id: string; name: string }[];
  adminSlug?: string | null;
}

export default function UserProfile({ 
  mini, 
  initialUser, 
  initialPermData,
  myAccountText = "My Account",
  logOutText = "Log out"
}: { 
  mini?: boolean; 
  initialUser?: { name?: string | null; email?: string | null; image?: string | null; [key: string]: unknown };
  initialPermData?: PermissionData;
  myAccountText?: string;
  logOutText?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [permData, setPermData] = useState<PermissionData | null>(initialPermData ?? null);
  const { data: session, isPending: loading } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && (session?.user || initialUser) && !initialPermData) {
      fetch("/api/user/permissions")
        .then((r) => r.json())
        .then((d) => setPermData(d))
        .catch(() => {});
    }
  }, [mounted, session?.user, initialUser, initialPermData]);

  useEffect(() => {
    if (mounted && !loading && !session?.user && !initialUser) {
      router.push("/sign-in");
    }
  }, [session, loading, router, mounted, initialUser]);

  const userInfo = session?.user || initialUser;

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in");
        },
      },
    });
  };

  const roleLabel = permData?.isAdmin
    ? "Super Admin"
    : permData?.roles?.length
      ? permData.roles.map((r) => r.name).join(", ")
      : null;

  const panelUrl = permData?.isAdmin
    ? `/${permData.adminSlug || "admin"}`
    : permData?.roles?.length
      ? `/${slugify(permData.roles[0].name)}`
      : null;

  const panelLabel = permData?.isAdmin
    ? "Admin Panel"
    : permData?.roles?.length
      ? `${permData.roles[0].name} Panel`
      : null;

  if (!mounted && !initialUser) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex gap-2 justify-start items-center w-full rounded cursor-pointer text-left border-0 bg-transparent focus:outline-none ${mini ? "" : "px-4 pt-2 pb-3"}`}
        >
          <AvatarDisplay
            image={userInfo?.image}
            name={userInfo?.name}
            className="h-8 w-8 shrink-0"
          />
          {mini ? null : (
            <div className="flex flex-col min-w-0">
              <P className="font-medium text-md mt-0 truncate">
                {!userInfo && loading ? "Loading..." : userInfo?.name || "User"}
              </P>
              {roleLabel && (
                <span className="text-xs text-primary font-semibold truncate">{roleLabel}</span>
              )}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span>{userInfo?.name || myAccountText}</span>
          {roleLabel && (
            <span className="flex items-center gap-1 text-xs font-medium text-primary">
              {permData?.isAdmin
                ? <Shield className="h-3 w-3" />
                : <Star className="h-3 w-3" />
              }
              {roleLabel}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/dashboard/settings?tab=profile" prefetch={true}>
            <DropdownMenuItem>
              Profile
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
          </Link>
          <Link href="/dashboard/settings?tab=security" prefetch={true}>
            <DropdownMenuItem>
              Security
              <DropdownMenuShortcut>⇧⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>

        {panelUrl && panelLabel && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link href={panelUrl} prefetch={true}>
                <DropdownMenuItem className="text-primary focus:text-primary focus:bg-primary/10">
                  <LayoutDashboard className="h-4 w-4 mr-2 shrink-0 text-foreground" />
                  {panelLabel}
                  <DropdownMenuShortcut>⇧⌘A</DropdownMenuShortcut>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          {logOutText}
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
