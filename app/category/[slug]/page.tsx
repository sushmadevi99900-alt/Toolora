import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, getCategory } from "@/data/categories";
import { getToolsByCategory, popularTools } from "@/data/tools";
import { buildMetadata, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ToolIcon } from "@/components/ui/ToolIcon";
import { ToolGrid } from "@/components/tools/ToolCard";
import { Faq } from "@/components/ui/Faq";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { JsonLd } from "@/components/seo/JsonLd";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return { title: "Category not found | Toolora" };
  return buildMetadata({
    title: category.seoTitle,
    description: category.seoDescription,
    path: `/category/${category.slug}`,
    keywords: category.keywords,
  });
}

const ACCENT_HERO: Record<string, string> = {
  violet: "from-violet-100/80 via-transparent to-transparent dark:from-violet-500/10",
  rose: "from-rose-100/80 via-transparent to-transparent dark:from-rose-500/10",
  sky: "from-sky-100/80 via-transparent to-transparent dark:from-sky-500/10",
  emerald: "from-emerald-100/80 via-transparent to-transparent dark:from-emerald-500/10",
  amber: "from-amber-100/80 via-transparent to-transparent dark:from-amber-500/10",
  cyan: "from-cyan-100/80 via-transparent to-transparent dark:from-cyan-500/10",
  fuchsia: "from-fuchsia-100/80 via-transparent to-transparent dark:from-fuchsia-500/10",
  slate: "from-slate-200/70 via-transparent to-transparent dark:from-slate-500/10",
};

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const all = getToolsByCategory(category.slug);
  const live = all.filter((t) => t.status === "available");
  const popular = all.filter((t) => t.isPopular);
  const featured = [...live.filter((t) => t.isPopular), ...live.filter((t) => !t.isPopular)].slice(0, 4);
  const related = categories.filter((c) => c.slug !== category.slug).slice(0, 3);
  const crossPopular = popularTools.filter((t) => t.category !== category.slug).slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Categories", path: "/categories" },
          { name: category.title, path: `/category/${category.slug}` },
        ])}
      />
      <JsonLd data={faqJsonLd(category.faq)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Categories", href: "/categories" },
          { label: category.title },
        ]}
      />

      <section className={cn("relative -mx-4 overflow-hidden px-4 pt-6 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8")}>
        <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 bg-gradient-to-b", ACCENT_HERO[category.accent] ?? ACCENT_HERO.slate)} />
        <div className="relative mt-2 flex items-start gap-4">
          <ToolIcon icon={category.icon} accent={category.accent} size={60} />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-(--foreground) sm:text-4xl">
              {category.title}
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-(--muted)">
              {category.longDescription}
            </p>
            <p className="mt-2 text-sm font-medium text-(--muted)" role="status">
              {all.length} tools · {live.length} working now · {all.length - live.length} coming soon
            </p>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section aria-labelledby="featured" className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="featured" className="text-xl font-extrabold text-(--foreground)">Featured {category.shortTitle.toLowerCase()} tools</h2>
            <ButtonLink href={`/tools?category=${category.slug}`} variant="ghost" size="sm">View all {all.length} →</ButtonLink>
          </div>
          <div className="mt-4">
            <ToolGrid tools={featured} />
          </div>
        </section>
      )}

      <section aria-labelledby="all-cat-tools" className="mt-10">
        <h2 id="all-cat-tools" className="text-xl font-extrabold text-(--foreground)">
          All {category.title.toLowerCase()}
        </h2>
        <div className="mt-4">
          {all.length > 0 ? (
            <ToolGrid tools={all} />
          ) : (
            <EmptyState
              title="No tools here yet"
              description="Tools for this category are being planned. Browse everything instead."
              actionLabel="Browse all tools"
              actionHref="/tools"
            />
          )}
        </div>
      </section>

      {popular.length > 4 && (
        <section aria-labelledby="cat-popular" className="mt-10">
          <h2 id="cat-popular" className="text-xl font-extrabold text-(--foreground)">Most popular</h2>
          <div className="mt-4">
            <ToolGrid tools={popular} />
          </div>
        </section>
      )}

      <section aria-labelledby="how-they-work" className="mt-10">
        <Card className="p-6 sm:p-8">
          <h2 id="how-they-work" className="text-xl font-extrabold text-(--foreground)">
            How these {category.shortTitle.toLowerCase()} tools work
          </h2>
          <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ["1", "Pick a tool", `Choose from ${all.length} ${category.shortTitle.toLowerCase()} tools above — live ones work instantly.`],
              ["2", "Process on-device", "Simple utilities run entirely in your browser. Nothing to install, no account needed."],
              ["3", "Copy or download", "Take your result with one click and get on with your day."],
            ].map(([n, title, text]) => (
              <li key={title} className="rounded-xl bg-(--surface-2) p-4">
                <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{n}</span>
                <p className="mt-2 font-bold text-(--foreground)">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-(--muted)">{text}</p>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby="cat-faq">
          <h2 id="cat-faq" className="text-xl font-extrabold text-(--foreground)">
            {category.shortTitle} FAQs
          </h2>
          <div className="mt-3">
            <Faq items={category.faq} />
          </div>
        </section>
        <div>
          <section aria-labelledby="related-cats">
            <h2 id="related-cats" className="text-xl font-extrabold text-(--foreground)">
              Related categories
            </h2>
            <div className="mt-3 space-y-3">
              {related.map((c) => (
                <Card key={c.slug} className="p-4">
                  <Link href={`/category/${c.slug}`} className="flex items-center gap-3">
                    <ToolIcon icon={c.icon} accent={c.accent} size={40} />
                    <span>
                      <span className="block font-bold text-(--foreground) hover:underline">{c.title}</span>
                      <span className="clamp-2 block text-sm text-(--muted)">{c.description}</span>
                    </span>
                  </Link>
                </Card>
              ))}
            </div>
          </section>
          {crossPopular.length > 0 && (
            <section aria-labelledby="also-popular" className="mt-6">
              <h2 id="also-popular" className="text-lg font-extrabold text-(--foreground)">Popular elsewhere</h2>
              <ul className="mt-2 space-y-1.5">
                {crossPopular.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/tools/${t.slug}`} className="text-sm font-medium text-(--foreground) hover:text-brand-700 hover:underline dark:hover:text-brand-300">
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
