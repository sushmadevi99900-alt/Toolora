import type { CategorySlug } from "./category";

export type ToolStatus = "available" | "coming-soon";

export interface ToolFaq {
  question: string;
  answer: string;
}

export interface ToolDefinition {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  category: CategorySlug;
  /** Icon key rendered by <ToolIcon/>. */
  icon: string;
  status: ToolStatus;
  isFree: boolean;
  isPopular: boolean;
  isNew: boolean;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  /** Alternate search terms / legacy slugs that should resolve to this tool. */
  aliases?: string[];
  howToUse: string[];
  features: string[];
  faq: ToolFaq[];
  relatedTools: string[];
}
