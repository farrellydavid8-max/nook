import type { MetadataRoute } from "next";

// Lets people install Nook to their home screen with its own icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nook",
    short_name: "Nook",
    description: "Log, review and share everything you watch, play and read.",
    start_url: "/",
    display: "standalone",
    background_color: "#0F0F10",
    theme_color: "#0F0F10",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
