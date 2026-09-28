import path from "node:path";
import { config } from "dotenv";
import type { NextConfig } from "next";

config({ path: path.resolve(process.cwd(), "../.env") });

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
