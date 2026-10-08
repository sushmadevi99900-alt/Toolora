"use client";

/**
 * Google Analytics 4 helpers. Everything is a no-op when no measurement ID
 * is configured — analytics must never break the website.
 *
 * Only anonymous, registry-defined values are ever sent: page paths for
 * page views, and tool slugs + categories for tool-use events. Never user
 * input, file contents, or personal identifiers.
 */

export function getGaMeasurementId(): string {
  return (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "").trim();
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function gtagEvent(name: string, params: Record<string, unknown>) {
  try {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag("event", name, params);
  } catch {
    /* analytics must never break tools */
  }
}

/** GA4 `tool_used` event. Anonymous — slug + category come from the tool registry. */
export function gaToolUsed(toolSlug: string, category: string) {
  gtagEvent("tool_used", { tool_slug: toolSlug, tool_category: category });
}

const firedSlugs = new Set<string>();

/**
 * Record one anonymous tool use as a GA4 event (if configured).
 * Deduped per slug per page lifetime so remounts don't inflate counts.
 */
export function trackToolUseClient(toolSlug: string, category: string) {
  if (firedSlugs.has(toolSlug)) return;
  firedSlugs.add(toolSlug);
  gaToolUsed(toolSlug, category);
}

/** Anonymous page-view hit for client-side navigations. */
export function gaPageView(path: string) {
  const id = getGaMeasurementId();
  if (!id) return;
  try {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag("config", id, { page_path: path });
  } catch {
    /* analytics must never break navigation */
  }
}
