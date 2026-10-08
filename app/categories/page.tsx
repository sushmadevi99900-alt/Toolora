import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { categories } from "@/data/categories";
import { CategoryGrid } from "@/components/categories/CategoryCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { ToolIcon } from "@/components/ui/ToolIcon";
import { getToolsByCategory } from "@/data/tools";

export const metadata = buildMetadata({
  title: "Tool Categories — Browse by Task | Toolora",
  description:
    "Browse Toolora tools by category: images, PDFs, text, developers, calculators, converters, generators and utilities.",
  path: "/categories",
  keywords: ["tool categories", "image tools", "pdf tools", "developer tools"],
});

export default function CategoriesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Categories", path: "/categories" },
        ])}
      />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Categories" }]} />
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-(--foreground) sm:text-4xl">
        Tool categories
      </h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-(--muted)">
        Eight collections covering everyday work. Each category page lists its tools, answers common
        questions, and points you to related categories.
      </p>
      <div className="stagger mt-6">
        <CategoryGrid categories={categories} />
      </div>
      <section aria-labelledby="quick-links" className="mt-10">
        <h2 id="quick-links" className="text-xl font-extrabold text-(--foreground)">
          Quick links
        </h2>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/category/${c.slug}`}
                className="flex items-center gap-3 rounded-xl border border-(--border) bg-(--surface) px-4 py-3 text-sm font-semibold text-(--foreground) hover:border-brand-300"
              >
                <ToolIcon icon={c.icon} accent={c.accent} size={32} />
                {c.title}
                <span className="ml-auto text-xs text-(--muted)">{getToolsByCategory(c.slug).length}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
