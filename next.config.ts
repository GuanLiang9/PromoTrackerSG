import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Leaflet and its clustering plugin are CJS packages that need to be
  // transpiled by Next.js/webpack so they work correctly in the client bundle.
  transpilePackages: ["leaflet", "react-leaflet", "leaflet.markercluster"],
};

export default withSerwist(nextConfig);
