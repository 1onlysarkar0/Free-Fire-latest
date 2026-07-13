"use client";

import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { avatars } from "@/components/ui/avatar-picker";
import { cn } from "@/lib/utils";

export function isAvatarRef(image: string | null | undefined): boolean {
  return typeof image === "string" && image.startsWith("avatar:");
}

export function getAvatarId(image: string | null | undefined): number | null {
  if (!isAvatarRef(image)) return null;
  const id = parseInt(image!.split(":")[1], 10);
  return id >= 1 && id <= 4 ? id : null;
}

interface AvatarDisplayProps {
  image?: string | null;
  name?: string | null;
  className?: string;
}

export function AvatarDisplay({ image, name, className }: AvatarDisplayProps) {
  const avatarId = getAvatarId(image);
  const svgAvatar = avatarId ? avatars.find((a) => a.id === avatarId) : undefined;

  return (
    <Avatar className={cn("overflow-hidden", className)}>
      {svgAvatar ? (
        <div className="flex h-full w-full items-center justify-center bg-muted [&>svg]:h-full [&>svg]:w-full [&>svg]:max-h-full [&>svg]:max-w-full">
          {svgAvatar.svg}
        </div>
      ) : image && isAvatarRef(image) ? (
        <AvatarFallback>
          {name?.charAt(0)?.toUpperCase() || "U"}
        </AvatarFallback>
      ) : image ? (
        <Image
          src={image}
          alt={name || "User avatar"}
          width={96}
          height={96}
          sizes="96px"
          className="aspect-square h-full w-full rounded-full object-cover"
        />
      ) : (
        <AvatarFallback>
          {name?.charAt(0)?.toUpperCase() || "U"}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
