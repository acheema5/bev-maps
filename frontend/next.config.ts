import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship raw TypeScript. Turbopack handles them on its own,
  // but listing them keeps webpack fallbacks and tooling honest.
  transpilePackages: ["shared", "backend-core", "backend-server"],
};

export default nextConfig;
