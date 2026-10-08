"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { categories } from "@/data/categories";
import { searchTools, popularTools } from "@/data/tools";
import { ToolGrid } from "../tools/ToolCard";
import { EmptyState, LoadingState } from "../ui/States";
import { ToolSearchCombobox } from "../tools/ToolSearch";
import { CategoryGrid } from "../categories/CategoryCard";

function SearchResults() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [live, setLive] = useState<string | null>(null);
  const query = live ?? q;
  const results = useMemo(() => searchTools(query), [query]);
  const matchedCategories = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return [];
    return categories.filter((c) =>
      [c.title, c.shortTitle, c.description, ...c.keywords].join(" ").toLowerCase().includes(t),
    );
  }, [query]);

  return (
    <div>
      <div onInputCapture={(e) => setLive((e.target as HTMLInputElement).value)}>
        <ToolSearchCombobox size="lg" />
      </div>
      {query.trim() === "" ? (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-(--foreground)">Try a popular search</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {["word", "pdf", "json", "password", "emi", "qr", "image", "compress", "calculator"].map((term) => (
              <a
                key={term}
                href={`/search?q=${encodeURIComponent(term)}`}
                className="min-h-[40px] rounded-full border border-(--border) bg-(--surface) px-4 py-2 text-sm font-medium text-(--muted) hover:text-(--foreground)"
              >
                {term}
              </a>
            ))}
          </div>
          <h2 className="mt-10 text-lg font-bold text-(--foreground)">Or browse categories</h2>
          <div className="mt-4">
            <CategoryGrid categories={categories} />
          </div>
        </div>
      ) : results.length > 0 ? (
        <div className="mt-8">
          <p role="status" className="text-sm font-medium text-(--muted)">
            {results.length} result{results.length === 1 ? "" : "s"} for “{query.trim()}”
          </p>
          {matchedCategories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Matching categories">
              {matchedCategories.map((c) => (
                <a key={c.slug} href={`/category/${c.slug}`}
                  className="min-h-[40px] rounded-full border border-(--border) bg-(--surface) px-4 py-2 text-sm font-semibold">
                  {c.title} →
                </a>
              ))}
            </div>
          )}
          <div className="mt-4">
            <ToolGrid tools={results} />
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title={`No tools found for “${query.trim()}”`}
            description="Check the spelling, try a shorter keyword like “pdf”, “json” or “emi”, or browse these instead."
          />
          <h2 className="mt-8 text-lg font-bold text-(--foreground)">Suggested tools</h2>
          <div className="mt-3">
            <ToolGrid tools={popularTools.slice(0, 4)} />
          </div>
          <h2 className="mt-8 text-lg font-bold text-(--foreground)">Suggested categories</h2>
          <div className="mt-4">
            <CategoryGrid categories={categories.slice(0, 4)} />
          </div>
        </div>
      )}
    </div>
  );
}

export function SearchView() {
  return (
    <Suspense fallback={<LoadingState label="Loading search…" />}>
      <SearchResults />
    </Suspense>
  );
}
