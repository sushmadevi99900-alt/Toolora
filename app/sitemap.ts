import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { categories } from "@/data/categories";
import { tools } from "@/data/tools";

const STATIC_PATHS = [
  "/",
  "/tools",
  "/categories",
  "/search",
  "/pricing",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/cookie-policy",
  "/disclaimer",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.siteUrl.replace(/\/$/, "");
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : path === "/tools" ? 0.9 : 0.7,
  }));
  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${base}/category/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));
  const toolEntries: MetadataRoute.Sitemap = tools.map((t) => ({
    url: `${base}/tools/${t.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: t.status === "available" ? 0.8 : 0.5,
  }));
  return [...staticEntries, ...categoryEntries, ...toolEntries];
}
