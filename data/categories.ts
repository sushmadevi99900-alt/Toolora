import type { Category } from "@/types/category";
import { extraCategories } from "./categories-extra";

export const categories: Category[] = [
  {
    slug: "images",
    title: "Image Tools",
    shortTitle: "Images",
    description: "Compress, resize, crop and convert images right in your browser.",
    longDescription:
      "Toolora image tools help you compress, resize, crop and convert everyday image formats. They are designed to be fast on mobile, easy to use, and respectful of your privacy — your files stay on your device.",
    accent: "violet",
    icon: "image",
    seoTitle: "Image Tools — Compress, Resize & Convert Images | Toolora",
    seoDescription:
      "Free online image tools: compress, resize, crop and convert JPG and PNG images. Fast, mobile-friendly and private.",
    keywords: ["image compressor", "image resizer", "image cropper", "jpg to png", "png to jpg"],
    faq: [
      {
        question: "Do my images leave my device?",
        answer:
          "Our planned image tools are designed to process files locally in your browser wherever possible, so your photos never need to be uploaded to a server.",
      },
      {
        question: "Which formats are supported?",
        answer:
          "We are starting with the most common formats — JPG and PNG — and will document every supported format on each tool page.",
      },
    ],
  },
  {
    slug: "pdf",
    title: "PDF Tools",
    shortTitle: "PDF",
    description: "Merge, split, compress and convert PDF documents.",
    longDescription:
      "Toolora PDF tools cover the everyday jobs: merging pages, splitting documents, compressing large files and converting between PDF and image formats.",
    accent: "rose",
    icon: "pdf",
    seoTitle: "PDF Tools — Merge, Split & Compress PDFs | Toolora",
    seoDescription:
      "Free online PDF tools: merge, split, compress and convert PDF files. Simple workflows that work on desktop and mobile.",
    keywords: ["merge pdf", "split pdf", "compress pdf", "jpg to pdf", "pdf to jpg"],
    faq: [
      {
        question: "Is there a file-size limit?",
        answer:
          "Limits will be published on each tool page once the processing engine ships. Browser-based tools naturally handle everyday document sizes best.",
      },
      {
        question: "Are my documents private?",
        answer:
          "Yes — privacy is a core Toolora principle. Each tool page documents exactly where processing happens before you use it.",
      },
    ],
  },
  {
    slug: "text",
    title: "Text Tools",
    shortTitle: "Text",
    description: "Count words, change case and analyse any text instantly.",
    longDescription:
      "Toolora text tools help writers, students and professionals count words, convert case and inspect text. They run entirely in your browser with no sign-up.",
    accent: "sky",
    icon: "text",
    seoTitle: "Text Tools — Word Counter, Case Converter & More | Toolora",
    seoDescription:
      "Free online text tools: word counter, character counter and case converter. Instant results, no sign-up, works on mobile.",
    keywords: ["word counter", "character counter", "case converter", "text tools"],
    faq: [
      {
        question: "Is the Word Counter free?",
        answer:
          "Yes. The Word Counter is free, works without an account, and processes everything locally in your browser.",
      },
      {
        question: "Is my text sent to a server?",
        answer: "No. Text tools run 100% locally — your text never leaves your device.",
      },
    ],
  },
  {
    slug: "developer",
    title: "Developer Tools",
    shortTitle: "Developer",
    description: "Format JSON, encode Base64, test regex and more.",
    longDescription:
      "Toolora developer tools are small, dependable utilities for everyday coding tasks: formatting JSON, encoding URLs, generating UUIDs and converting timestamps.",
    accent: "emerald",
    icon: "code",
    seoTitle: "Developer Tools — JSON, Base64, Regex & More | Toolora",
    seoDescription:
      "Free online developer tools: JSON formatter and validator, Base64 and URL encoders, UUID generator, regex tester and timestamp converter.",
    keywords: ["json formatter", "json validator", "base64 encoder", "url encoder", "uuid generator", "regex tester"],
    faq: [
      {
        question: "Are these tools free for commercial use?",
        answer:
          "Yes. All developer utilities on the free plan can be used for personal and commercial work.",
      },
      {
        question: "Is my code sent anywhere?",
        answer:
          "No. Developer tools process everything client-side in your browser.",
      },
    ],
  },
  {
    slug: "calculators",
    title: "Calculator Tools",
    shortTitle: "Calculators",
    description: "Percentages, EMI, GST, age and date math made simple.",
    longDescription:
      "Toolora calculators answer everyday number questions — from percentages and loan EMIs to GST and age — with clear, step-by-step results.",
    accent: "amber",
    icon: "calculator",
    seoTitle: "Calculator Tools — Percentage, EMI, GST & Age | Toolora",
    seoDescription:
      "Free online calculators: percentage, EMI, GST, age and date-difference calculators with clear results on any device.",
    keywords: ["percentage calculator", "emi calculator", "gst calculator", "age calculator"],
    faq: [
      {
        question: "Are the calculators accurate?",
        answer:
          "Calculators use standard formulas documented on each tool page. They are handy estimators, not professional financial or legal advice.",
      },
      {
        question: "Do I need an account?",
        answer: "No. Every calculator works instantly without sign-up.",
      },
    ],
  },
  {
    slug: "converters",
    title: "Converter Tools",
    shortTitle: "Converters",
    description: "Convert units, encodings and data formats.",
    longDescription:
      "Toolora converters translate between the units and formats you meet every day — measurement units, encoded strings and data representations.",
    accent: "cyan",
    icon: "convert",
    seoTitle: "Converter Tools — Units, Encoding & Data | Toolora",
    seoDescription:
      "Free online converters: unit converter, Base64 and URL encoding, timestamp conversion and more.",
    keywords: ["unit converter", "base64 decoder", "url decoder", "timestamp converter"],
    faq: [
      {
        question: "Which converters are available now?",
        answer:
          "Converters are rolling out gradually. Each tool page shows whether it is live or coming soon — we never fake functionality.",
      },
      {
        question: "Do converters work offline?",
        answer:
          "Client-side converters keep working with flaky connections once the page has loaded.",
      },
    ],
  },
  {
    slug: "generators",
    title: "Generator Tools",
    shortTitle: "Generators",
    description: "Create passwords, QR codes, UUIDs and random numbers.",
    longDescription:
      "Toolora generators create things for you — strong passwords, QR codes, UUIDs and random numbers — with sensible defaults and transparent options.",
    accent: "fuchsia",
    icon: "spark",
    seoTitle: "Generator Tools — Passwords, QR Codes & UUIDs | Toolora",
    seoDescription:
      "Free online generators: strong passwords, QR codes, UUIDs and random numbers. Private, fast and mobile-friendly.",
    keywords: ["qr generator", "password generator", "uuid generator", "random number generator"],
    faq: [
      {
        question: "Are generated passwords safe?",
        answer:
          "Generators run locally with cryptographically strong randomness from your browser. Nothing is transmitted or stored.",
      },
      {
        question: "Do I need an account to generate?",
        answer: "No. Generators are free and require no sign-up.",
      },
    ],
  },
  {
    slug: "utilities",
    title: "Utility Tools",
    shortTitle: "Utilities",
    description: "Small everyday helpers that save time.",
    longDescription:
      "Toolora utilities are the small helpers you reach for weekly — counting, measuring and checking things quickly without installing anything.",
    accent: "slate",
    icon: "wrench",
    seoTitle: "Utility Tools — Everyday Online Helpers | Toolora",
    seoDescription:
      "Free online utility tools for everyday tasks. Fast, private and mobile-friendly helpers from Toolora.",
    keywords: ["online utilities", "free tools", "productivity tools"],
    faq: [
      {
        question: "What counts as a utility?",
        answer:
          "Small single-purpose helpers — counters, checkers and everyday converters — that solve one job well.",
      },
      {
        question: "Are utilities free?",
        answer: "Yes. Every utility is free forever — no accounts, no payments.",
      },
    ],
  },
  ...extraCategories,
];

export const categoryMap: Record<string, Category> = Object.fromEntries(
  categories.map((c) => [c.slug, c]),
);

export function getCategory(slug: string): Category | undefined {
  return categoryMap[slug];
}
