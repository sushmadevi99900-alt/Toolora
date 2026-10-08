import type { ToolDefinition } from "@/types/tool";

type Draft = Omit<
  ToolDefinition,
  "seoTitle" | "seoDescription" | "howToUse" | "features" | "faq" | "relatedTools" | "aliases"
> &
  Partial<
    Pick<
      ToolDefinition,
      "seoTitle" | "seoDescription" | "howToUse" | "features" | "faq" | "relatedTools" | "aliases"
    >
  >;

export const AV = { status: "available" as const, isFree: true };
export const CS = { status: "coming-soon" as const, isFree: true };

/**
 * Compact catalog entry builder. Only genuinely unique fields are required;
 * SEO titles, how-to steps, features and a starter FAQ are derived from them
 * so every page still has complete, accurate metadata.
 */
export function define(draft: Draft): ToolDefinition {
  const { name, shortDescription } = draft;
  return {
    aliases: [],
    relatedTools: [],
    faq: [
      {
        question: `Is the ${name} free?`,
        answer: `Yes. The ${name} is free, works without an account, and processes everything locally in your browser.`,
      },
    ],
    howToUse: [
      `Enter your input in the ${name} workspace below.`,
      "Review the result and adjust your input if needed.",
      "Use Copy or Download to reuse the result.",
    ],
    features: [
      "Free with no sign-up",
      "Private — runs locally in your browser",
      "Works on desktop and mobile",
      "Copy and download results",
    ],
    ...draft,
    seoTitle: draft.seoTitle ?? `${name} — Free Online Tool | Toolora`,
    seoDescription:
      draft.seoDescription ?? `${name}: ${shortDescription} Free, fast and mobile-friendly.`,
  };
}
