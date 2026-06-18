import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native DB clients out of the server bundle.
  serverExternalPackages: ['@libsql/client', 'libsql', 'better-sqlite3'],
  // (Next.js 16 no longer runs ESLint during `next build`, so the previous
  // `eslint.ignoreDuringBuilds` option is unnecessary and was removed.)
};

export default nextConfig;
