/* Toolora catalog validation: fails the build when an AVAILABLE tool lacks a
   real implementation. Run with `node scripts/validate-tools.ts` (Node 24+
   strips types; imports use explicit .ts extensions and relative paths). */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tools, toolAliases } from "../data/tools.ts";
import { categories } from "../data/categories.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors: string[] = [];
const warns: string[] = [];
const fail = (m: string) => errors.push(m);
const warn = (m: string) => warns.push(m);

/* ---------- catalog checks ---------- */

const catSlugs = new Set(categories.map((c) => c.slug));
const seen = new Map<string, string>();
const titles = new Map<string, string>();

for (const t of tools) {
  if (seen.has(t.slug)) fail(`duplicate slug "${t.slug}"`);
  else seen.set(t.slug, t.name);
  if (!t.slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.slug)) fail(`bad slug "${t.slug}"`);
  if (!t.name?.trim()) fail(`missing name for "${t.slug}"`);
  if (!t.shortDescription?.trim() || t.shortDescription.length < 20) fail(`weak shortDescription for "${t.slug}"`);
  if (!t.longDescription?.trim() || t.longDescription.length < 40) fail(`weak longDescription for "${t.slug}"`);
  if (!catSlugs.has(t.category)) fail(`unknown category "${t.category}" for "${t.slug}"`);
  if (t.status !== "available" && t.status !== "coming-soon") fail(`bad status for "${t.slug}"`);
  if (!t.seoTitle?.includes(t.name) && !t.seoTitle?.toLowerCase().includes(t.slug.split("-")[0] ?? "")) {
    warn(`seoTitle may be generic for "${t.slug}"`);
  }
  if (titles.has(t.seoTitle)) fail(`duplicate seoTitle "${t.seoTitle}" (${t.slug} + ${titles.get(t.seoTitle)})`);
  else titles.set(t.seoTitle, t.slug);
  if (!t.keywords || t.keywords.length < 2) fail(`<2 keywords for "${t.slug}"`);
  if (!t.howToUse || t.howToUse.length === 0) fail(`missing howToUse for "${t.slug}"`);
  if (!t.features || t.features.length === 0) fail(`missing features for "${t.slug}"`);
  if (!Array.isArray(t.relatedTools)) fail(`relatedTools not an array for "${t.slug}"`);
  for (const r of t.relatedTools ?? []) {
    if (!seen.has(r) && !tools.some((x) => x.slug === r)) fail(`"${t.slug}" relatedTools → unknown "${r}"`);
  }
}

// relatedTools validated in second pass (forward refs)
const allSlugs = new Set(tools.map((t) => t.slug));
for (const t of tools) {
  for (const r of t.relatedTools ?? []) {
    if (!allSlugs.has(r)) fail(`"${t.slug}" relatedTools → unknown slug "${r}"`);
  }
  for (const a of t.aliases ?? []) {
    if (allSlugs.has(a)) fail(`"${t.slug}" alias "${a}" collides with a real slug`);
  }
}

// aliases: targets must exist, keys must not shadow real slugs
for (const [alias, target] of Object.entries(toolAliases)) {
  if (!allSlugs.has(target)) fail(`toolAliases "${alias}" → unknown target "${target}"`);
  if (allSlugs.has(alias)) fail(`toolAliases key "${alias}" shadows a real slug`);
}

// categories referenced by tools must have tools (warn only)
for (const c of categories) {
  if (!tools.some((t) => t.category === c.slug)) warn(`category "${c.slug}" has no tools`);
}

/* ---------- registry checks (static analysis) ---------- */

const wsDir = join(root, "components", "tools", "workspaces");
const kitDir = join(root, "components", "tools", "kits");
const files = [...readdirSync(wsDir).filter((f) => f.endsWith(".tsx")).map((f) => join(wsDir, f))];
try {
  for (const f of readdirSync(kitDir).filter((f) => f.endsWith(".tsx"))) files.push(join(kitDir, f));
} catch {
  /* no kits dir */
}
files.push(join(root, "components", "tools", "ToolWorkspace.tsx"));

const keyRe = /^\s*"([a-z0-9]+(?:-[a-z0-9]+)*)"\s*:/gm;
const registryKeys = new Map<string, string[]>();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  // Only count keys inside exported registry literals (avoids data tables).
  const blocks = src.matchAll(/[A-Za-z]*[Rr]egistry[^=]{0,100}=\s*\{([\s\S]*?)\n\};/g);
  let found = false;
  for (const b of blocks) {
    found = true;
    for (const m of (b[1] as string).matchAll(keyRe)) {
      const slug = m[1] as string;
      if (!registryKeys.has(slug)) registryKeys.set(slug, []);
      registryKeys.get(slug)?.push(f.replace(root + "/", ""));
    }
  }
  if (!found && /egistry/i.test(src)) {
    for (const m of src.matchAll(keyRe)) {
      const slug = m[1] as string;
      if (/^[0-9]+$/.test(slug)) continue; // numeric table keys, not slugs
      if (!registryKeys.has(slug)) registryKeys.set(slug, []);
      registryKeys.get(slug)?.push(f.replace(root + "/", ""));
    }
  }
}

const available = tools.filter((t) => t.status === "available");
for (const t of available) {
  const hits = registryKeys.get(t.slug) ?? [];
  if (hits.length === 0) fail(`AVAILABLE tool "${t.slug}" has no workspace registry entry (fake tool?)`);
  else if (hits.length > 1) fail(`"${t.slug}" registered ${hits.length}×: ${hits.join(", ")}`);
}
for (const [slug, hits] of registryKeys) {
  if (!allSlugs.has(slug)) fail(`registry key "${slug}" matches no catalog tool (${hits.join(", ")})`);
  const tool = tools.find((t) => t.slug === slug);
  if (tool && tool.status !== "available") {
    fail(`registry key "${slug}" maps to a "${tool.status}" tool (coming-soon must not ship a workspace)`);
  }
}

/* ---------- report ---------- */

const coming = tools.filter((t) => t.status === "coming-soon");
console.log(`tools: total=${tools.length} available=${available.length} coming-soon=${coming.length} categories=${categories.length}`);
for (const w of warns) console.log(`WARN: ${w}`);
if (errors.length > 0) {
  console.log(`\nVALIDATION FAILED (${errors.length}):`);
  for (const e of errors) console.log(` - ${e}`);
  process.exit(1);
}
console.log("validation: OK");
