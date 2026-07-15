import { headers } from "next/headers";

/**
 * Validates the Origin and Referer headers for state-changing HTTP requests
 * to protect API routes against CSRF (Cross-Site Request Forgery).
 * 
 * Safe methods (GET, HEAD, OPTIONS) do not require validation.
 */
export async function verifyCsrf(request: Request): Promise<boolean> {
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return true;
  }

  const reqHeaders = await headers();
  const origin = reqHeaders.get("origin");
  const referer = reqHeaders.get("referer");
  const host = reqHeaders.get("host");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return true; // If app URL is not configured, skip strict origin checks to avoid breakage
  }

  const allowedOrigins = new Set<string>();
  
  // Standardize target origins
  try {
    const appOrigin = new URL(appUrl).origin;
    allowedOrigins.add(appOrigin);
  } catch {
    // Ignore invalid NEXT_PUBLIC_APP_URL
  }

  // Also trust the host header if origin matches
  if (host) {
    allowedOrigins.add(`http://${host}`);
    allowedOrigins.add(`https://${host}`);
  }

  // If a development domain is configured, trust it
  if (process.env.ONESARKAR_DEV_DOMAIN) {
    allowedOrigins.add(process.env.ONESARKAR_DEV_DOMAIN);
  }
  // AUDIT FIX [6.8]: Filter out wildcard '*' — never add '*' as an allowed origin
  if (process.env.ALLOWED_DEV_ORIGINS) {
    process.env.ALLOWED_DEV_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter((o) => Boolean(o) && o !== "*") // never trust a wildcard origin
      .forEach((o) => allowedOrigins.add(o));
  }

  // Allow localhost in development
  if (process.env.NODE_ENV === "development") {
    allowedOrigins.add("http://localhost:3000");
    allowedOrigins.add("http://localhost:5000");
    allowedOrigins.add("http://127.0.0.1:3000");
    allowedOrigins.add("http://127.0.0.1:5000");
  }

  // 1. Verify Origin header if present (standard for state-changing requests)
  if (origin) {
    if (allowedOrigins.has(origin)) {
      return true;
    }
    console.warn(`[CSRF] Blocked request from unauthorized origin: ${origin}`);
    return false;
  }

  // 2. Fallback to Referer header if Origin is not present
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (allowedOrigins.has(refererOrigin)) {
        return true;
      }
    } catch {
      // Ignore malformed referer URLs
    }
    console.warn(`[CSRF] Blocked request from unauthorized referer: ${referer}`);
    return false;
  }

  // If both Origin and Referer are missing on a state-changing request, block it to be safe
  console.warn(`[CSRF] Blocked state-changing request: missing Origin and Referer headers`);
  return false;
}
