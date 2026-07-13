import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "10.109.88.98",
    "localhost",
    "127.0.0.1",
    ...(process.env.ONESARKAR_DEV_DOMAIN ? [process.env.ONESARKAR_DEV_DOMAIN] : []),
    ...(process.env.ALLOWED_DEV_ORIGINS
      ? process.env.ALLOWED_DEV_ORIGINS.split(",").map((o) => o.trim())
      : []),
  ],
  output: "standalone",
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  transpilePackages: ["@uiw/react-md-editor", "@uiw/react-markdown-preview"],
  serverExternalPackages: [
    "postgres",
    "pg",
    "pg-native",
    "nodemailer",
    "dotenv",
  ],
  typescript: {
    ignoreBuildErrors: false,
  },
  cacheComponents: true,
  experimental: {
    serverActions: {
      allowedOrigins: [
        ...(process.env.ONESARKAR_DEV_DOMAIN ? [process.env.ONESARKAR_DEV_DOMAIN] : []),
        ...(process.env.ALLOWED_DEV_ORIGINS
          ? process.env.ALLOWED_DEV_ORIGINS.split(",").map((o) => o.trim())
          : []),
      ],
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "jdj14ctwppwprnqu.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    const isProd = process.env.NODE_ENV === "production";

    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://cdn.vercel-insights.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com wss:",
      "frame-src 'self' data: blob: about:",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          ...(isProd
            ? [
              { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
              { key: "Content-Security-Policy", value: cspDirectives },
            ]
            : []),
        ],
      },
      {
        source: "/fonts/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/assets/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // NOTE: /_next/static/ is intentionally NOT overridden here.
      // Next.js automatically sets max-age=31536000, immutable for production
      // static assets because they are content-hashed (e.g. abc123.css).
      // Overriding it here breaks dev mode by caching unhashed CSS as immutable.
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/:key([a-zA-Z0-9]{8,128}).txt",
          destination: "/api/indexnow-key?key=:key",
        },
      ],
    };
  },
};

export default nextConfig;