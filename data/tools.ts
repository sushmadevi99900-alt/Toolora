import type { ToolDefinition } from "@/types/tool";
import { imageTools } from "./catalog/images";
import { pdfTools } from "./catalog/pdf";
import { textTools } from "./catalog/text";
import { developerTools } from "./catalog/developer";
import { calculatorTools } from "./catalog/calculators";
import { converterTools } from "./catalog/converters";
import { generatorTools } from "./catalog/generators";
import { utilityTools } from "./catalog/utilities";
import { datetimeTools } from "./catalog/datetime";
import { techextraTools } from "./catalog/techextra";
import { calcplusTools } from "./catalog/calcplus";
import { mediaextraTools } from "./catalog/mediaextra";
import { moneybizTools } from "./catalog/moneybiz";
import { lifetoolsTools } from "./catalog/lifetools";
import { creatorsTools } from "./catalog/creators";
import { docdataTools } from "./catalog/docdata";
import { qrgenTools } from "./catalog/qrgen";
import { audioTools } from "./catalog/audio";
import { audiogenTools } from "./catalog/audio2";
import { audioplusTools } from "./catalog/audio3";

export const tools: ToolDefinition[] = [
  ...imageTools,
  ...pdfTools,
  ...textTools,
  ...developerTools,
  ...calculatorTools,
  ...converterTools,
  ...generatorTools,
  ...utilityTools,
  ...datetimeTools,
  ...techextraTools,
  ...calcplusTools,
  ...mediaextraTools,
  ...moneybizTools,
  ...lifetoolsTools,
  ...creatorsTools,
  ...docdataTools,
  ...qrgenTools,
  ...audioTools,
  ...audiogenTools,
  ...audioplusTools,
];

// Auto-fill empty relatedTools with same-category tools so every page has
// useful related links without hand-maintaining hundreds of lists.
for (const t of tools) {
  if (t.relatedTools.length === 0) {
    t.relatedTools = tools.filter((x) => x.category === t.category && x.slug !== t.slug).slice(0, 4).map((x) => x.slug);
  }
}

export const toolMap: Record<string, ToolDefinition> = Object.fromEntries(
  tools.map((t) => [t.slug, t]),
);

/** Resolve canonical tool by slug, id or registered alias (e.g. legacy duplicate slugs). */
export function getTool(slug: string): ToolDefinition | undefined {
  const key = slug.trim().toLowerCase();
  if (toolMap[key]) return toolMap[key];
  return tools.find(
    (t) =>
      t.id.toLowerCase() === key ||
      (t.aliases ?? []).some((a) => a.toLowerCase() === key),
  );
}

export function getToolsByCategory(category: string): ToolDefinition[] {
  return tools.filter((t) => t.category === category);
}

export function getRelatedTools(tool: ToolDefinition, limit = 4): ToolDefinition[] {
  const explicit = tool.relatedTools
    .map((slug) => getTool(slug))
    .filter((t): t is ToolDefinition => t !== undefined && t.slug !== tool.slug);
  if (explicit.length >= limit) return explicit.slice(0, limit);
  const sameCategory = tools.filter(
    (t) => t.category === tool.category && t.slug !== tool.slug && !explicit.includes(t),
  );
  return [...explicit, ...sameCategory].slice(0, limit);
}

function scoreTool(t: ToolDefinition, q: string): number {
  const name = t.name.toLowerCase();
  const slug = t.slug.toLowerCase();
  if (name === q || slug === q) return 100;
  if (name.startsWith(q)) return 60;
  if (slug.startsWith(q)) return 55;
  if (name.includes(q)) return 40;
  if (slug.includes(q)) return 35;
  if ((t.aliases ?? []).some((a) => a.toLowerCase().includes(q))) return 38;
  if (t.keywords.some((k) => k.toLowerCase().includes(q))) return 25;
  if (t.shortDescription.toLowerCase().includes(q)) return 12;
  if (t.category.toLowerCase().includes(q)) return 10;
  if (t.longDescription.toLowerCase().includes(q)) return 5;
  return 0;
}

/**
 * Ranked multi-term search across name, slug, aliases, keywords,
 * description and category. Every term must match somewhere.
 */
const SEARCH_SYNONYMS: Record<string, string[]> = {
  photo: ["image", "picture"],
  photos: ["image", "picture"],
  picture: ["image", "photo"],
  pictures: ["image", "photo"],
  compress: ["compressor", "compress"],
  convert: ["converter", "convert"],
  calculate: ["calculator", "calculation", "compute"],
  emi: ["loan"],
  qr: ["qr"],
  audio: ["audio", "sound", "voice"],
  record: ["recorder", "recording"],
  voice: ["audio", "recorder"],
  mp3: ["audio"],
  json: ["json"],
  pretty: ["formatter", "format"],
  unix: ["unix", "timestamp", "epoch"],
  time: ["time", "date", "timestamp"],
  password: ["password"],
  wifi: ["wifi", "qr"],
  mortgage: ["mortgage", "loan"],
  invoice: ["invoice"],
  gpa: ["gpa", "grade"],
};

export function searchTools(query: string, limit = 50): ToolDefinition[] {
  const raw = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (raw.length === 0) return [];
  // Expand common wording so "compress photo" finds the Image Compressor.
  const terms = [...new Set(raw.flatMap((t) => [t, ...(SEARCH_SYNONYMS[t] ?? [])]))];
  const haystack = (t: ToolDefinition) =>
    [t.name, t.slug, t.shortDescription, t.longDescription, t.category, ...t.keywords, ...(t.aliases ?? [])]
      .join(" ")
      .toLowerCase();
  return tools
    .map((t) => {
      const hay = haystack(t);
      // At least one expansion of every raw term must match.
      const ok = raw.every((rt) => hay.includes(rt) || (SEARCH_SYNONYMS[rt] ?? []).some((s) => hay.includes(s)));
      if (!ok) return { t, score: 0 };
      const first = raw[0] as string;
      const score =
        terms.reduce((sum, term) => sum + scoreTool(t, term), 0) +
        (t.isPopular ? 3 : 0) +
        (t.status === "available" ? 2 : 0) +
        (t.name.toLowerCase().includes(first) ? 1 : 0);
      return { t, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.t);
}

export const availableTools = tools.filter((t) => t.status === "available");
export const comingSoonTools = tools.filter((t) => t.status === "coming-soon");
export const freeTools = tools.filter((t) => t.isFree);
export const popularTools = tools.filter((t) => t.isPopular);
export const newTools = tools.filter((t) => t.isNew);

/** Legacy duplicate slugs redirect here instead of becoming separate pages. */
export const toolAliases: Record<string, string> = {
  "uuid-generator-generator": "uuid-generator",
  "lorem-generator": "lorem-ipsum-generator",
};
