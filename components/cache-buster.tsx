"use client";

import { useEffect } from "react";

const STORAGE_KEY = "app_cache_version";

/**
 * CacheBuster — runs silently on every page load for every user.
 *
 * Logic:
 * 1. Fetch the current cache version from /api/cache-version (no auth, no-store).
 * 2. Compare to the version stored in localStorage.
 * 3. If they MATCH → do nothing. Zero cost, zero disruption.
 * 4. If they DIFFER → clear all browser caches (Cache API, localStorage,
 *    sessionStorage), store the new version, then hard-reload ONCE.
 *    This ensures every user gets a fresh page after an admin purge.
 *
 * The reload only happens once per version bump — not in a loop.
 */
export default function CacheBuster() {
  useEffect(() => {
    let cancelled = false;

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

        if (stored === version) {
          // Versions match — everything is up to date, do nothing
          return;
        }

        // ── Version mismatch: purge all client-side caches ────────────────
        console.info(
          `[CacheBuster] Cache version changed (${stored ?? "none"} → ${version}). Clearing caches…`
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

        // 2. Save new version BEFORE clearing localStorage so we don't loop
        const keysToPreserve: Record<string, string | null> = {
          [STORAGE_KEY]: version,
        };

        // 3. Clear localStorage & sessionStorage
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {
          /* non-critical */
        }

        // 4. Restore the new version key so the reload doesn't re-trigger
        try {
          Object.entries(keysToPreserve).forEach(([k, v]) => {
            if (v !== null) localStorage.setItem(k, v);
          });
        } catch {
          /* non-critical */
        }

        if (cancelled) return;

        // 5. Hard-reload to pick up fresh assets
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
