"use client";

import { useTheme, type ThemePreference } from "./ThemeProvider";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  {
    value: "light",
    label: "Light",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    ),
  },
  {
    value: "system",
    label: "System",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <rect x="2" y="4" width="20" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
];

/** Accessible Light / Dark / System segmented control. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, mounted, setTheme } = useTheme();
  // Hydration-safe: server and first client render both see "system".
  // The real persisted preference is applied after mount via effect.
  const effectiveTheme: ThemePreference = mounted ? theme : "system";
  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border p-1",
        "border-(--border) bg-(--surface)",
      )}
    >
      {OPTIONS.map((opt) => {
        const active = effectiveTheme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            aria-pressed={active}
            aria-label={`${opt.label} theme`}
            title={`${opt.label} theme`}
            className={cn(
              "flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full px-2 text-sm transition-colors",
              active
                ? "bg-brand-600 text-white shadow-sm"
                : "text-(--muted) hover:bg-(--surface-2) hover:text-(--foreground)",
              compact && "min-h-[32px] min-w-[32px] px-1.5",
            )}
          >
            {opt.icon}
            {!compact && <span className="sr-only sm:not-sr-only sm:ml-1 sm:text-xs sm:font-medium">{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
