import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.siteName} — Free Online Tools`,
    short_name: siteConfig.siteName,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: siteConfig.themeColor,
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
