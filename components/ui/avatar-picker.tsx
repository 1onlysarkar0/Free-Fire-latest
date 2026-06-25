"use client";

import { Check, User2 } from "lucide-react";
import type { Variants } from "motion/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Avatar {
  id: number;
  svg: ReactNode;
  alt: string;
}

const AVATAR_RGB: Record<number, string> = {
  1: "255, 0, 91",
  2: "255, 125, 16",
  3: "255, 0, 91",
  4: "137, 252, 179",
};

const avatars: Avatar[] = [
  {
    id: 1,
    svg: (
      <svg aria-label="Avatar 1" fill="none" height="40" role="img" viewBox="0 0 36 36" width="40" xmlns="http://www.w3.org/2000/svg">
        <title>Avatar 1</title>
        <mask height="36" id=":r111:" maskUnits="userSpaceOnUse" width="36" x="0" y="0">
          <rect fill="#FFFFFF" height="36" rx="72" width="36" />
        </mask>
        <g mask="url(#:r111:)">
          <rect fill="#ff005b" height="36" width="36" />
          <rect fill="#ffb238" height="36" rx="6" transform="translate(9 -5) rotate(219 18 18) scale(1)" width="36" x="0" y="0" />
          <g transform="translate(4.5 -4) rotate(9 18 18)">
            <path d="M15 19c2 1 4 1 6 0" fill="none" stroke="#000000" strokeLinecap="round" />
            <rect fill="#000000" height="2" rx="1" stroke="none" width="1.5" x="10" y="14" />
            <rect fill="#000000" height="2" rx="1" stroke="none" width="1.5" x="24" y="14" />
          </g>
        </g>
      </svg>
    ),
    alt: "Avatar 1",
  },
  {
    id: 2,
    svg: (
      <svg aria-label="Avatar 2" fill="none" height="40" role="img" viewBox="0 0 36 36" width="40" xmlns="http://www.w3.org/2000/svg">
        <title>Avatar 2</title>
        <mask height="36" id=":R4mrttb:" maskUnits="userSpaceOnUse" width="36" x="0" y="0">
          <rect fill="#FFFFFF" height="36" rx="72" width="36" />
        </mask>
        <g mask="url(#:R4mrttb:)">
          <rect fill="#ff7d10" height="36" width="36" />
          <rect fill="#0a0310" height="36" rx="6" transform="translate(5 -1) rotate(55 18 18) scale(1.1)" width="36" x="0" y="0" />
          <g transform="translate(7 -6) rotate(-5 18 18)">
            <path d="M15 20c2 1 4 1 6 0" fill="none" stroke="#FFFFFF" strokeLinecap="round" />
            <rect fill="#FFFFFF" height="2" rx="1" stroke="none" width="1.5" x="14" y="14" />
            <rect fill="#FFFFFF" height="2" rx="1" stroke="none" width="1.5" x="20" y="14" />
          </g>
        </g>
      </svg>
    ),
    alt: "Avatar 2",
  },
  {
    id: 3,
    svg: (
      <svg aria-label="Avatar 3" fill="none" height="40" role="img" viewBox="0 0 36 36" width="40" xmlns="http://www.w3.org/2000/svg">
        <title>Avatar 3</title>
        <mask height="36" id=":r11c:" maskUnits="userSpaceOnUse" width="36" x="0" y="0">
          <rect fill="#FFFFFF" height="36" rx="72" width="36" />
        </mask>
        <g mask="url(#:r11c:)">
          <rect fill="#0a0310" height="36" width="36" />
          <rect fill="#ff005b" height="36" rx="36" transform="translate(-3 7) rotate(227 18 18) scale(1.2)" width="36" x="0" y="0" />
          <g transform="translate(-3 3.5) rotate(7 18 18)">
            <path d="M13,21 a1,0.75 0 0,0 10,0" fill="#FFFFFF" />
            <rect fill="#FFFFFF" height="2" rx="1" stroke="none" width="1.5" x="12" y="14" />
            <rect fill="#FFFFFF" height="2" rx="1" stroke="none" width="1.5" x="22" y="14" />
          </g>
        </g>
      </svg>
    ),
    alt: "Avatar 3",
  },
  {
    id: 4,
    svg: (
      <svg aria-label="Avatar 4" fill="none" height="40" role="img" viewBox="0 0 36 36" width="40" xmlns="http://www.w3.org/2000/svg">
        <title>Avatar 4</title>
        <mask height="36" id=":r1gg:" maskUnits="userSpaceOnUse" width="36" x="0" y="0">
          <rect fill="#FFFFFF" height="36" rx="72" width="36" />
        </mask>
        <g mask="url(#:r1gg:)">
          <rect fill="#d8fcb3" height="36" width="36" />
          <rect fill="#89fcb3" height="36" rx="6" transform="translate(9 -5) rotate(219 18 18) scale(1)" width="36" x="0" y="0" />
          <g transform="translate(4.5 -4) rotate(9 18 18)">
            <path d="M15 19c2 1 4 1 6 0" fill="none" stroke="#000000" strokeLinecap="round" />
            <rect fill="#000000" height="2" rx="1" stroke="none" width="1.5" x="10" y="14" />
            <rect fill="#000000" height="2" rx="1" stroke="none" width="1.5" x="24" y="14" />
          </g>
        </g>
      </svg>
    ),
    alt: "Avatar 4",
  },
];

interface AvatarPickerProps {
  selectedAvatar: Avatar;
  onAvatarSelect: (avatar: Avatar) => void;
  username: string;
  onUsernameChange: (value: string) => void;
  showError?: boolean;
  hideUsernameField?: boolean;
}

const containerVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const thumbnailVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: "easeOut" },
  },
};

export function AvatarPicker({
  selectedAvatar,
  onAvatarSelect,
  username,
  onUsernameChange,
  showError,
  hideUsernameField,
}: AvatarPickerProps) {
  const [isFocused, setIsFocused] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const rgb = AVATAR_RGB[selectedAvatar.id];

  return (
    <div className="space-y-8">
      <div className="space-y-1 text-center">
        <h2 className="font-semibold text-xl tracking-tight text-foreground">
          Pick Your Avatar
        </h2>
        <p className="text-muted-foreground text-sm">
          Choose one to get started
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative h-32 w-32 sm:h-40 sm:w-40">
          <motion.div
            animate={{
              boxShadow: `0 0 0 2px rgba(${rgb}, 0.55), 0 6px 24px rgba(${rgb}, 0.18)`,
            }}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full"
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.45, ease: "easeOut" }
            }
          />
          <div className="relative h-full w-full overflow-hidden rounded-full">
            <AnimatePresence mode="wait">
              <motion.div
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key={selectedAvatar.id}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { duration: 0.2, ease: "easeOut" }
                }
              >
                <div className="flex h-full w-full items-center justify-center [&>svg]:h-full [&>svg]:w-full [&>svg]:max-h-full [&>svg]:max-w-full">{selectedAvatar.svg}</div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.span
            animate={{ opacity: 1 }}
            className="text-[11px] text-muted-foreground uppercase tracking-[0.12em]"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key={selectedAvatar.id}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.16, ease: "easeOut" }
            }
          >
            {selectedAvatar.alt}
          </motion.span>
        </AnimatePresence>

        <motion.div
          animate="animate"
          className="flex gap-3"
          initial="initial"
          variants={containerVariants}
        >
          {avatars.map((avatar) => {
            const isSelected = selectedAvatar.id === avatar.id;
            return (
              <motion.button
                aria-label={`Select ${avatar.alt}`}
                aria-pressed={isSelected}
                className={cn(
                  "relative h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-xl border bg-muted transition-[opacity,box-shadow] duration-200 ease-out",
                  isSelected
                    ? "border-foreground/20 opacity-100 ring-2 ring-foreground/70 ring-offset-2 ring-offset-background"
                    : "border-border opacity-50 hover:opacity-100"
                )}
                key={avatar.id}
                onClick={() => onAvatarSelect(avatar)}
                type="button"
                variants={thumbnailVariants}
                whileHover={shouldReduceMotion ? {} : { scale: 1.06 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.94 }}
              >
                <div className="absolute inset-0 flex items-center justify-center [&>svg]:h-full [&>svg]:w-full [&>svg]:max-h-full [&>svg]:max-w-full">
                  {avatar.svg}
                </div>
                {isSelected && (
                  <div className="absolute -right-0.5 -bottom-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground">
                    <Check
                      aria-hidden="true"
                      className="h-3 w-3 text-background"
                    />
                  </div>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {!hideUsernameField && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-sm text-foreground" htmlFor="username">
                Username
              </label>
              <span
                className={cn(
                  "text-xs tabular-nums transition-colors duration-200 ease-out",
                  username.length >= 18
                    ? "text-amber-500"
                    : "text-muted-foreground/50"
                )}
              >
                {username.length}/20
              </span>
            </div>

            <div className="relative">
              <Input
                autoComplete="username"
                className={cn(
                  "h-10 pl-9 text-sm",
                  showError && "border-destructive/50 focus-visible:ring-destructive"
                )}
                id="username"
                maxLength={20}
                name="username"
                onBlur={() => setIsFocused(false)}
                onChange={(e) => onUsernameChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                placeholder="your_username…"
                spellCheck={false}
                type="text"
                value={username}
              />
              <User2
                aria-hidden="true"
                className={cn(
                  "absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors duration-200 ease-out",
                  isFocused ? "text-foreground" : "text-muted-foreground"
                )}
              />
            </div>

            <AnimatePresence>
              {showError && (
                <motion.p
                  animate={{ opacity: 1, y: 0 }}
                  className="ml-0.5 text-destructive text-xs"
                  exit={{ opacity: 0, y: -4 }}
                  initial={{ opacity: 0, y: -4 }}
                  role="alert"
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  Username must be at least 3 characters
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

export function getAvatarById(id: number): Avatar | undefined {
  return avatars.find((a) => a.id === id);
}

export { avatars };
export type { Avatar };
