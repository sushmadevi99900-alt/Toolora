import Link from "next/link";
import type { Category } from "@/types/category";
import { getToolsByCategory } from "@/data/tools";
import { ToolIcon } from "../ui/ToolIcon";

export function CategoryCard({ category }: { category: Category }) {
  const count = getToolsByCategory(category.slug).length;
  return (
    <Link
      href={`/category/${category.slug}`}
      aria-label={`${category.title} — ${count} tools`}
      className="group flex items-start gap-4 rounded-2xl border border-(--border) bg-(--surface) p-5 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_8px_24px_rgb(79_70_229/0.10)] dark:hover:border-brand-500/40"
    >
      <ToolIcon icon={category.icon} accent={category.accent} size={48} />
      <span className="min-w-0">
        <span className="block text-[16px] font-bold tracking-tight text-(--foreground) group-hover:text-brand-700 dark:group-hover:text-brand-300">
          {category.title}
        </span>
        <span className="clamp-2 mt-0.5 block text-sm leading-relaxed text-(--muted)">
          {category.description}
        </span>
        <span className="mt-2 block text-xs font-semibold text-(--muted)">
          {count} tool{count === 1 ? "" : "s"} →
        </span>
      </span>
    </Link>
  );
}

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((c) => (
        <CategoryCard key={c.slug} category={c} />
      ))}
    </div>
  );
}
