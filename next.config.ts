import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/gtv-videos-bucket/**",
      },
      {
        protocol: "https",
        hostname: "commondatastorage.googleapis.com",
        pathname: "/gtv-videos-bucket/**",
      },
      {
        protocol: "https",
        hostname: "filmflik.b-cdn.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
