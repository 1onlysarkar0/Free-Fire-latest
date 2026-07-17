"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getImageUrl } from "@/lib/image-url";

const CacheVersionContext = createContext<string>("");

export function ImageCacheProvider({ children }: { children: React.ReactNode }) {
  const [cacheVersion, setCacheVersion] = useState("");

  useEffect(() => {
    const cv = (window as any).__CACHE_VERSION;
    if (cv) setCacheVersion(cv);
  }, []);

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
