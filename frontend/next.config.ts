import path from "node:path";
import type { NextConfig } from "next";

// The frontend is a standalone Next.js app. It reads only public config from
// its own .env / .env.local (e.g. NEXT_PUBLIC_API_URL). Backend secrets and the
// old root .env are no longer loaded here — the backend owns those.
const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Pin the Turbopack workspace root to this app so an unrelated lockfile in a
  // parent directory is not mistaken for the project root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
