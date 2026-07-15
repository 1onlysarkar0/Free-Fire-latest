import { headers } from "next/headers";

const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

/**
 * Simple in-memory rate limiter.
 * Note: In a multi-instance production environment (e.g. Vercel), 
 * this only rate limits per instance. For global rate limiting, use Redis.
 * 
 * @param reqId Identifier for the rate limit (e.g. IP + endpoint)
 * @param limit Max requests allowed
 * @param windowMs Time window in milliseconds
 * @returns boolean True if allowed, false if rate limited
 */
export function rateLimit(reqId: string, limit: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(reqId);

  if (!record) {
    rateLimitMap.set(reqId, { count: 1, timestamp: now });
    return true;
  }

  // If outside the window, reset the count
  if (now - record.timestamp > windowMs) {
    rateLimitMap.set(reqId, { count: 1, timestamp: now });
    return true;
  }

  // If inside the window and over limit, reject
  if (record.count >= limit) {
    return false;
  }

  // Otherwise, increment and allow
  record.count += 1;
  return true;
}

/**
 * Helper to get the client IP from headers.
 */
export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = headersList.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown-ip";
}
