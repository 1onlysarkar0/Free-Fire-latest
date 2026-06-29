import { NextResponse } from "next/server";

interface RateLimitEntry {
  timestamps: number[];
}

// Simple in-memory cache for rate limiting.
// Note: In serverless environments, this is local to the instance.
const cache = new Map<string, RateLimitEntry>();

// Clean up stale cache entries every 5 minutes to prevent memory leaks
if (typeof globalThis !== "undefined") {
  const intervalId = "rate-limit-cleanup";
  if (!(globalThis as any)[intervalId]) {
    (globalThis as any)[intervalId] = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of cache.entries()) {
        entry.timestamps = entry.timestamps.filter((t) => now - t < 3600 * 1000); // Keep last 1 hour
        if (entry.timestamps.length === 0) {
          cache.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }
}

interface RateLimitOptions {
  keyPrefix: string;
  limit: number;       // Max requests
  windowMs: number;    // Time window in milliseconds
}

/**
 * Checks if a request has exceeded the rate limit.
 * Returns { allowed: boolean, remaining: number, resetMs: number }
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
) {
  const now = Date.now();
  const key = `${options.keyPrefix}:${identifier}`;
  const windowStart = now - options.windowMs;

  let entry = cache.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    cache.set(key, entry);
  }

  // Filter timestamps within the current window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= options.limit) {
    const oldestTimestamp = entry.timestamps[0];
    const resetMs = oldestTimestamp + options.windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, resetMs),
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: options.limit - entry.timestamps.length,
    resetMs: options.windowMs,
  };
}

/**
 * Express-like helper to apply rate limiting in Next.js Route Handlers.
 * Returns a response with 429 if limited, or null if allowed.
 */
export function rateLimitRoute(
  identifier: string,
  options: RateLimitOptions
) {
  const result = checkRateLimit(identifier, options);
  
  if (!result.allowed) {
    const seconds = Math.ceil(result.resetMs / 1000);
    return NextResponse.json(
      { 
        error: `Too many requests. Please try again in ${seconds} seconds.` 
      },
      { 
        status: 429,
        headers: {
          "Retry-After": String(seconds),
          "X-RateLimit-Limit": String(options.limit),
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": String(Math.ceil((Date.now() + result.resetMs) / 1000)),
        }
      }
    );
  }
  
  return null;
}
