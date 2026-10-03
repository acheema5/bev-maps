import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Bev Maps",
    short_name: "Bev",
    description: "Tap Find Bev. Hold up your phone. Follow the arrow.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait", // honored on Android; iOS gets the rotate overlay
    background_color: "#f2f2f5",
    theme_color: "#f2f2f5",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
