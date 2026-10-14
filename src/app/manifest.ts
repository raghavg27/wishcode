import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wishcode",
    short_name: "Wishcode",
    description: "Post an app you wish existed. Developers build them.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8f5",
    theme_color: "#fff8f5",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
