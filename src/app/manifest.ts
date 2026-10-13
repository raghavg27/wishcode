import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wishcode",
    short_name: "Wishcode",
    description: "A public ledger of software wishes.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8f5",
    theme_color: "#fff8f5",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
