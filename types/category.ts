export type CategorySlug =
  | "images"
  | "pdf"
  | "text"
  | "developer"
  | "calculators"
  | "converters"
  | "generators"
  | "utilities"
  | "audio"
  | "datetime"
  | "finance"
  | "business"
  | "student"
  | "social"
  | "seo"
  | "qr"
  | "data"
  | "security"
  | "color"
  | "everyday"
  | "food"
  | "travel"
  | "writing"
  | "resume"
  | "science"
  | "network"
  | "svg"
  | "archive"
  | "random";

export interface Category {
  slug: CategorySlug;
  title: string;
  shortTitle: string;
  description: string;
  longDescription: string;
  /** Accent key used by CategoryCard / ToolIcon backgrounds. */
  accent: CategoryAccent;
  icon: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  faq: { question: string; answer: string }[];
}

export type CategoryAccent =
  | "violet"
  | "rose"
  | "sky"
  | "emerald"
  | "amber"
  | "cyan"
  | "fuchsia"
  | "slate";
