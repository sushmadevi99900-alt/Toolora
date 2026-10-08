/**
 * Central site configuration.
 * Change `siteUrl` when the production domain is known.
 * Nothing here contains secrets — safe to expose to the client.
 */
export const siteConfig = {
  siteName: "Toolora",
  tagline: "Simple tools. Better productivity.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://toolora.example.com",
  description:
    "Toolora offers fast, simple and reliable online tools for images, PDFs, text, developers, calculators and more.",
  locale: "en_US",
  themeColor: "#4f46e5",
  social: {
    twitter: "https://x.com/toolora",
    github: "https://github.com/toolora",
  },
  contactEmail: "hello@toolora.example.com",
} as const;

export function absoluteUrl(path = "/"): string {
  const base = siteConfig.siteUrl.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
