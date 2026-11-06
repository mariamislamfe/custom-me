import type { NextConfig } from "next";

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // 90 for product photos (ProductArt), 75 for everything else
    qualities: [75, 90],
    // Larger sizes so 2400 px product photos stay sharp on big retina screens
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2400],
    // With Supabase, product photos are served from its public "products" bucket.
    // Any Supabase project is allowed (photos bucket only), so it works even if the
    // keys were added while the server was already running.
    remotePatterns: [
      { protocol: "https", hostname: supabase?.hostname ?? "*.supabase.co", pathname: "/storage/v1/object/public/products/**" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/products/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nobody can show the store inside their own site
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
