"use client";

import { useEffect } from "react";

const STORAGE_KEY = "app_cache_version";

/**
 * CacheBuster — runs silently on every page load for every user.
 *
 * Logic:
 * 1. Automatically cleans up any leftover `__cv` or `purge` query parameters from URL.
 * 2. Fetches current cache version from /api/cache-version (no-store).
 * 3. Compares to the version stored in localStorage.
 * 4. If they DIFFER → clears all browser caches (Cache API, Service Workers,
 *    localStorage, sessionStorage), stores the new version, then reloads ONCE cleanly.
 *    This forces every user to fetch 100% fresh CSS, JS, images, and data.
 */
export default function CacheBuster() {
  useEffect(() => {
    let cancelled = false;

    // ── Clean URL parameters immediately on mount ─────────────────────────────
    if (typeof window !== "undefined" && window.location.search) {
      const url = new URL(window.location.href);
      if (url.searchParams.has("__cv") || url.searchParams.has("purge")) {
        url.searchParams.delete("__cv");
        url.searchParams.delete("purge");
        const cleanPath =
          url.pathname +
          (url.searchParams.toString() ? "?" + url.searchParams.toString() : "") +
          url.hash;
        window.history.replaceState(null, "", cleanPath);
      }
    }

    async function checkVersion() {
      try {
        const res = await fetch("/api/cache-version", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok || cancelled) return;

        const { version } = await res.json();
        if (!version || cancelled) return;

        const stored = localStorage.getItem(STORAGE_KEY);

        if (!stored) {
          // First visit or fresh storage — initialize stored version silently without reloading
          localStorage.setItem(STORAGE_KEY, version);
          return;
        }

        if (stored === version) {
          // Versions match — everything is up to date
          return;
        }

        // ── Version mismatch: purge all client-side caches ────────────────
        console.info(
          `[CacheBuster] Cache version changed (${stored ?? "none"} → ${version}). Clearing all caches…`
        );

        // 1. Clear Cache API (service worker caches, browser HTTP cache)
        if ("caches" in window) {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((name) => caches.delete(name)));
          } catch {
            /* non-critical */
          }
        }

        // 2. Unregister any Service Workers
        if ("serviceWorker" in navigator) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((r) => r.unregister()));
          } catch {
            /* non-critical */
          }
        }

        // 3. Save new version BEFORE clearing localStorage so we don't loop
        const keysToPreserve: Record<string, string | null> = {
          [STORAGE_KEY]: version,
        };

        // 4. Clear localStorage & sessionStorage
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {
          /* non-critical */
        }

        // 5. Restore the new version key so the reload doesn't re-trigger
        try {
          Object.entries(keysToPreserve).forEach(([k, v]) => {
            if (v !== null) localStorage.setItem(k, v);
          });
        } catch {
          /* non-critical */
        }

        if (cancelled) return;

        // 6. Hard-reload page cleanly without leaving query parameters in URL
        window.location.reload();
      } catch {
        // Network error or API down — silently skip, never crash
      }
    }

    checkVersion();

    return () => {
      cancelled = true;
    };
  }, []);

  // Renders nothing — purely a side-effect component
  return null;
}
