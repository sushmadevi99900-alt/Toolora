import type { CategoryAccent } from "@/types/category";
import { cn } from "@/lib/utils";

/**
 * Consistent SVG icon system — no emoji, theme-aware, with
 * category-specific accent backgrounds.
 */
const PATHS: Record<string, React.ReactNode> = {
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5a2 2 0 0 0-2.8 0L6 20" />
    </>
  ),
  pdf: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h4" />
    </>
  ),
  text: (
    <>
      <path d="M4 7V5h16v2M9 20h6M12 5v15" />
    </>
  ),
  code: (
    <>
      <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
    </>
  ),
  calculator: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01" />
    </>
  ),
  convert: (
    <>
      <path d="M7 16V4M7 4 3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  wrench: (
    <>
      <path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 0 0 6-6L14 13l-3-3 3.7-3.7z" />
    </>
  ),
  wordcount: (
    <>
      <path d="M4 7V5h16v2M9 20h6M12 5v15" />
      <path d="M17 20h5" />
    </>
  ),
  charcount: (
    <>
      <path d="M5 4h14v12H5zM5 16l-2 4M19 16l2 4" />
      <path d="M9 8h6M9 11h6" />
    </>
  ),
  case: (
    <>
      <path d="M4 20 12 4l8 16M6.5 14h11" />
      <path d="M17 4h4v4" />
    </>
  ),
  qr: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM21 14v7M14 21h4M18 18h3" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <path d="M12 15v3" />
    </>
  ),
  percent: (
    <>
      <path d="M19 5 5 19" />
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="17" cy="17" r="2.5" />
    </>
  ),
  cake: (
    <>
      <path d="M4 21h16M5 21v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6" />
      <path d="M12 13v-2M12 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM8 13v-1.5M16 13v-1.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  dice: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" />
    </>
  ),
  resize: (
    <>
      <path d="M21 3h-6M21 3v6M21 3l-8 8M3 21h6M3 21v-6M3 21l8-8" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
    </>
  ),
  crop: (
    <>
      <path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14" />
    </>
  ),
  merge: (
    <>
      <path d="M8 7H4v10h4M16 7h4v10h-4M12 3v18" />
    </>
  ),
  split: (
    <>
      <path d="M12 3v18M8 7H4v10h4M16 7h4v10h-4" />
      <path d="m10 12 4 0" />
    </>
  ),
  check: (
    <>
      <path d="M20 6 9 17l-5-5" />
    </>
  ),
  minify: (
    <>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </>
  ),
  binary: (
    <>
      <path d="M6 20V9M18 20V4M6 9h4M14 4h4" />
      <circle cx="8" cy="17" r="2" />
      <circle cx="16" cy="17" r="2" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </>
  ),
  hash: (
    <>
      <path d="M9 3 7 21M17 3l-2 18M4 8h17M3 16h17" />
    </>
  ),
  regex: (
    <>
      <path d="M4 20c4 0 4-16 8-16M4 20l3-6M20 4c-4 0-4 16-8 16M20 4l-3 6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 3h14v18l-2.3-1.5L14.4 21l-2.4-1.5L9.6 21l-2.3-1.5L5 21z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  bank: (
    <>
      <path d="M3 9.5 12 4l9 5.5M4 10v8M20 10v8M8 10v8M12 10v8M16 10v8M2 20h20" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
};

const ACCENT_BG: Record<CategoryAccent, string> = {
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  fuchsia: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  slate: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
};

const CATEGORY_ACCENT: Record<string, CategoryAccent> = {
  images: "violet",
  pdf: "rose",
  text: "sky",
  developer: "emerald",
  calculators: "amber",
  converters: "cyan",
  generators: "fuchsia",
  utilities: "slate",
  audio: "fuchsia",
  datetime: "sky",
  finance: "emerald",
  business: "slate",
  student: "amber",
  social: "rose",
  seo: "cyan",
  qr: "violet",
  data: "cyan",
  security: "rose",
  color: "fuchsia",
  everyday: "emerald",
  food: "amber",
  travel: "sky",
  writing: "violet",
  resume: "slate",
  science: "cyan",
  network: "emerald",
  svg: "amber",
  archive: "slate",
  random: "violet",
};

export function accentForCategory(category: string): CategoryAccent {
  return CATEGORY_ACCENT[category] ?? "slate";
}

export function ToolIcon({
  icon,
  category,
  accent,
  size = 40,
  className,
}: {
  icon: string;
  category?: string;
  accent?: CategoryAccent;
  size?: number;
  className?: string;
}) {
  const resolved: CategoryAccent = accent ?? (category ? accentForCategory(category) : "slate");
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn(
        "grid shrink-0 place-items-center rounded-xl",
        ACCENT_BG[resolved],
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width={Math.round(size * 0.52)}
        height={Math.round(size * 0.52)}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {PATHS[icon] ?? PATHS.wrench}
      </svg>
    </span>
  );
}
