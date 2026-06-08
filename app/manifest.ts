import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — Singapore Promotions`,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    // @ts-expect-error — display_override not yet in Next.js types but is valid
    display_override: ["standalone", "minimal-ui"],
    background_color: "#0b0d14",
    theme_color: "#0b0d14",
    orientation: "portrait",
    categories: ["lifestyle", "shopping", "food"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
