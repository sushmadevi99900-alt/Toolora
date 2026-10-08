"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { categories, categoryMap } from "@/data/categories";
import { searchTools, popularTools, tools } from "@/data/tools";
import { ToolIcon } from "../ui/ToolIcon";
import { EmptyState } from "../ui/States";
import { ToolGrid } from "./ToolCard";

/**
 * Improved tool search: matches name, slug, aliases, keywords,
 * description and category with ranking; offers no-result state
 * with suggested tools and categories.
 */
export function ToolSearch({ initialQuery = "", autoFocus = false }: { initialQuery?: string; autoFocus?: boolean }) {
  const [query, setQuery] = useState(initialQuery);
  const results = query.trim() ? searchTools(query) : [];
  const categoriesFor = (q: string) => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return categories.filter((c) =>
      [c.title, c.shortTitle, c.description, ...c.keywords].join(" ").toLowerCase().includes(t),
    );
  };
  const matchedCategories = query.trim() ? categoriesFor(query) : [];

  return (
    <div>
      <label htmlFor="tool-search-field" className="sr-only">Search tools</label>
      <input
        id="tool-search-field"
        type="search"
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tools — try “compress”, “json”, “emi”…"
        className="min-h-[52px] w-full rounded-2xl border border-(--border) bg-(--surface) px-5 text-base text-(--foreground) shadow-sm placeholder:text-(--muted)/70"
      />
      <p className="mt-2 text-sm text-(--muted)" role="status" aria-live="polite">
        {query.trim()
          ? `${results.length} result${results.length === 1 ? "" : "s"} for “${query.trim()}”`
          : `${tools.length} tools across ${categories.length} categories`}
      </p>
      {query.trim() ? (
        results.length > 0 ? (
          <div className="mt-4">
            {matchedCategories.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2" aria-label="Matching categories">
                {matchedCategories.map((c) => (
                  <a key={c.slug} href={`/category/${c.slug}`}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-(--border) bg-(--surface) px-4 text-sm font-semibold">
                    <ToolIcon icon={c.icon} accent={c.accent} size={24} />
                    {c.title}
                  </a>
                ))}
              </div>
            )}
            <ToolGrid tools={results} />
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              title={`No tools found for “${query.trim()}”`}
              description="Check the spelling, try a shorter keyword like “pdf”, “json” or “emi”, or browse these instead."
            />
            <h2 className="mt-6 text-lg font-extrabold text-(--foreground)">Suggested tools</h2>
            <div className="mt-3">
              <ToolGrid tools={popularTools.slice(0, 4)} />
            </div>
            <h2 className="mt-6 text-lg font-extrabold text-(--foreground)">Suggested categories</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.slice(0, 4).map((c) => (
                <a key={c.slug} href={`/category/${c.slug}`}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-(--border) bg-(--surface) px-4 text-sm font-semibold">
                  {c.title} →
                </a>
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="mt-4">
          <h2 className="text-lg font-extrabold text-(--foreground)">Popular right now</h2>
          <div className="mt-3">
            <ToolGrid tools={popularTools.slice(0, 8)} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Header + hero combobox with keyboard-navigable live suggestions. */
export function ToolSearchCombobox({ size = "md", id }: { size?: "md" | "lg"; id?: string }) {
  const router = useRouter();
  const fallbackId = useId();
  const inputId = id ?? `tool-search-${fallbackId}`;
  const listId = `${inputId}-list`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = query.trim() ? searchTools(query, 6) : [];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <label htmlFor={inputId} className="sr-only">Search tools</label>
      <div className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-(--muted)" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <input
        id={inputId}
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Search tools..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && results.length > 0) {
            e.preventDefault();
            setHighlight((h) => (h + 1) % results.length);
          } else if (e.key === "ArrowUp" && results.length > 0) {
            e.preventDefault();
            setHighlight((h) => (h - 1 + results.length) % results.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (highlight >= 0 && results[highlight]) {
              setOpen(false);
              router.push(`/tools/${results[highlight].slug}`);
            } else go(query);
          } else if (e.key === "Escape") setOpen(false);
        }}
        className={size === "lg"
          ? "min-h-[56px] w-full rounded-2xl border border-(--border) bg-(--surface) pr-4 pl-12 text-base text-(--foreground) shadow-sm placeholder:text-(--muted)/70"
          : "min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) pr-3 pl-11 text-[15px] text-(--foreground) placeholder:text-(--muted)/70"}
      />
      {open && query.trim() && results.length > 0 && (
        <ul id={listId} role="listbox" aria-label="Matching tools"
          className="animate-fade-in absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border border-(--border) bg-(--surface) shadow-xl">
          {results.map((t, i) => {
            const cat = categoryMap[t.category];
            return (
              <li key={t.slug} role="option" aria-selected={i === highlight}>
                <button type="button" onMouseEnter={() => setHighlight(i)}
                  onClick={() => { setOpen(false); router.push(`/tools/${t.slug}`); }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${i === highlight ? "bg-brand-50 dark:bg-white/5" : ""}`}>
                  <ToolIcon icon={t.icon} category={t.category} size={32} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-(--foreground)">{t.name}</span>
                    <span className="block truncate text-xs text-(--muted)">{cat?.shortTitle} · {t.shortDescription}</span>
                  </span>
                </button>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => go(query)}
              className="flex w-full items-center justify-center gap-2 border-t border-(--border) px-4 py-2.5 text-sm font-semibold text-brand-700 dark:text-brand-300">
              See all results for “{query.trim()}” →
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
