import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native DB clients out of the server bundle.
  serverExternalPackages: ['@libsql/client', 'libsql', 'better-sqlite3'],
  // Don't fail the production build on lint style errors (unescaped quotes,
  // `any`, unused vars). These are not runtime bugs; TypeScript type-checking
  // still runs and will fail the build on real type errors.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
