"use client";

import { createContext, useContext } from "react";
import { getImageUrl } from "@/lib/image-url";

const CacheVersionContext = createContext<string>("");

export function ImageCacheProvider({ children, cacheVersion: serverVersion }: { children: React.ReactNode; cacheVersion?: string }) {
  const cacheVersion = serverVersion || (typeof window !== "undefined" ? (window as any).__CACHE_VERSION : "");

  return (
    <CacheVersionContext.Provider value={cacheVersion}>
      {children}
    </CacheVersionContext.Provider>
  );
}

export function useImageUrl() {
  const cacheVersion = useContext(CacheVersionContext);
  return (src: string | null | undefined) => getImageUrl(src, cacheVersion);
}
