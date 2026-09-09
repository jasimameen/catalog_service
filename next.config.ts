import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 4MB photos plus multipart overhead (default Server Action limit is 1MB).
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
