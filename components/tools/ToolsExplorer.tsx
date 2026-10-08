"use client";

import { useMemo, useState } from "react";
import { categories } from "@/data/categories";
import { tools } from "@/data/tools";
import { ToolGrid } from "./ToolCard";
import { CategoryGrid } from "../categories/CategoryCard";
import { EmptyState } from "../ui/States";
import { ToolSearchCombobox } from "./ToolSearch";
import { cn } from "@/lib/utils";

type Filter = "all" | "popular" | "new" | "available" | "coming-soon";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Working now" },
  { value: "popular", label: "Popular" },
  { value: "new", label: "New" },
  { value: "coming-soon", label: "Coming soon" },
];

const VALID: Filter[] = FILTERS.map((f) => f.value);

export function ToolsExplorer({ initialFilter = "all", initialCategory = "all" }: { initialFilter?: string; initialCategory?: string }) {
  const [filter, setFilter] = useState<Filter>(VALID.includes(initialFilter as Filter) ? (initialFilter as Filter) : "all");
  const [category, setCategory] = useState<string>(initialCategory);

  const apply = (nextFilter: Filter, nextCategory: string) => {
    setFilter(nextFilter);
    setCategory(nextCategory);
    // History-only URL sync (no navigation): keeps shareable URLs
    // without suspending SSR or triggering a server round-trip.
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search);
      if (nextFilter === "all") q.delete("filter");
      else q.set("filter", nextFilter);
      if (nextCategory === "all") q.delete("category");
      else q.set("category", nextCategory);
      const qs = q.toString();
      window.history.replaceState(null, "", qs ? `/tools?${qs}` : "/tools");
    }
  };

  const visible = useMemo(() => {
    let list = tools;
    if (category !== "all") list = list.filter((t) => t.category === category);
    switch (filter) {
      case "popular": return list.filter((t) => t.isPopular);
      case "new": return list.filter((t) => t.isNew);
      case "available": return list.filter((t) => t.status === "available");
      case "coming-soon": return list.filter((t) => t.status === "coming-soon");
      default: return list;
    }
  }, [filter, category]);

  return (
    <div>
      <ToolSearchCombobox />
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter tools">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => apply(f.value, category)}
            aria-pressed={filter === f.value}
            className={cn(
              "min-h-[40px] rounded-full border px-4 text-sm font-semibold transition-colors",
              filter === f.value
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-(--border) bg-(--surface) text-(--muted) hover:text-(--foreground)",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <button
          type="button"
          onClick={() => apply(filter, "all")}
          aria-pressed={category === "all"}
          className={cn(
            "min-h-[40px] rounded-full border px-4 text-sm font-medium transition-colors",
            category === "all"
              ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
              : "border-(--border) bg-(--surface) text-(--muted) hover:text-(--foreground)",
          )}
        >
          Every category
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => apply(filter, c.slug)}
            aria-pressed={category === c.slug}
            className={cn(
              "min-h-[40px] rounded-full border px-4 text-sm font-medium transition-colors",
              category === c.slug
                ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                : "border-(--border) bg-(--surface) text-(--muted) hover:text-(--foreground)",
            )}
          >
            {c.shortTitle}
          </button>
        ))}
      </div>

      <p className="mt-6 text-sm font-medium text-(--muted)" role="status" aria-live="polite">
        Showing {visible.length} of {tools.length} tools
      </p>
      <div className="mt-3">
        {visible.length > 0 ? (
          <ToolGrid tools={visible} />
        ) : (
          <EmptyState
            title="No tools match these filters"
            description="Try a different category or clear the filters to browse everything."
          />
        )}
      </div>

      <section aria-labelledby="all-categories" className="mt-14">
        <h2 id="all-categories" className="text-xl font-extrabold tracking-tight text-(--foreground)">
          Browse by category
        </h2>
        <div className="mt-4">
          <CategoryGrid categories={categories} />
        </div>
      </section>
    </div>
  );
}
