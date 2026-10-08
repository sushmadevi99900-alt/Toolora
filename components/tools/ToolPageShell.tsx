import Link from "next/link";
import type { ToolDefinition } from "@/types/tool";
import type { Category } from "@/types/category";
import { Breadcrumbs } from "../ui/Breadcrumbs";
import { Faq } from "../ui/Faq";
import { Card } from "../ui/Card";
import { ButtonLink } from "../ui/Button";
import { ToolIcon } from "../ui/ToolIcon";
import { AdSlot } from "../ui/Monetization";
import { ToolGrid } from "./ToolCard";
import { ToolStatusBadge } from "./ToolStatusBadge";
import { ToolWorkspace } from "./ToolWorkspace";

interface Props {
  tool: ToolDefinition;
  category?: Category;
  related: ToolDefinition[];
  categoryTools: ToolDefinition[];
  popular: ToolDefinition[];
}

/**
 * Shared server-rendered template for EVERY tool page.
 * Metadata and static content render on the server; only the
 * interactive workspace inside is a client component.
 */
export function ToolPageShell({ tool, category, related, categoryTools, popular }: Props) {
  const live = tool.status === "available";
  const siblings = categoryTools.filter((t) => t.slug !== tool.slug).slice(0, 5);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "All Tools", href: "/tools" },
          ...(category ? [{ label: category.shortTitle, href: `/category/${category.slug}` }] : []),
          { label: tool.name },
        ]}
      />

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start">
        <ToolIcon icon={tool.icon} category={tool.category} size={64} />
        <div className="min-w-0">
          <ToolStatusBadge status={tool.status} isFree={tool.isFree} isPopular={tool.isPopular} isNew={tool.isNew} />
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-(--foreground) sm:text-4xl">{tool.name}</h1>
          <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-(--muted)">{tool.shortDescription}</p>
          {category && (
            <p className="mt-2 text-sm text-(--muted)">
              Part of{" "}
              <Link href={`/category/${category.slug}`} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
                {category.title}
              </Link>
            </p>
          )}
        </div>
      </div>

      <section aria-label={`${tool.name} workspace`} className="mt-6">
        <Card className="p-5 sm:p-8">
          {live ? (
            <ToolWorkspace slug={tool.slug} />
          ) : (
            <div className="py-6 text-center">
              <ToolStatusBadge status={tool.status} isFree={tool.isFree} />
              <h2 className="mx-auto mt-3 max-w-xl text-xl font-extrabold text-(--foreground) sm:text-2xl">
                {tool.name} is on the roadmap
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-[15px] leading-relaxed text-(--muted)">
                {tool.longDescription} This page will gain the real, working tool as soon as its
                processing logic is implemented. We never fake functionality.
              </p>
              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                <ButtonLink href="/tools">Browse working tools</ButtonLink>
                <ButtonLink href={category ? `/category/${category.slug}` : "/categories"} variant="secondary">
                  More {category?.shortTitle ?? ""} tools
                </ButtonLink>
              </div>
            </div>
          )}
        </Card>
      </section>

      <div className="mt-6">
        <AdSlot />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section aria-labelledby="about-tool">
            <h2 id="about-tool" className="text-xl font-extrabold text-(--foreground)">About this tool</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-(--muted)">{tool.longDescription}</p>
          </section>
          <section aria-labelledby="how" className="mt-8">
            <h2 id="how" className="text-xl font-extrabold text-(--foreground)">How to use</h2>
            <ol className="mt-3 space-y-2">
              {tool.howToUse.map((step, i) => (
                <li key={step} className="flex gap-3 text-[15px] text-(--muted)">
                  <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
          {tool.features.length > 0 && (
            <section aria-labelledby="features" className="mt-8">
              <h2 id="features" className="text-xl font-extrabold text-(--foreground)">Features</h2>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {tool.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 rounded-xl bg-(--surface-2) px-4 py-3 text-sm font-medium text-(--foreground)">
                    <span aria-hidden="true" className="mt-0.5 text-emerald-600 dark:text-emerald-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {tool.faq.length > 0 && (
            <section aria-labelledby="tool-faq" className="mt-8">
              <h2 id="tool-faq" className="text-xl font-extrabold text-(--foreground)">Frequently asked questions</h2>
              <div className="mt-3">
                <Faq items={tool.faq} />
              </div>
            </section>
          )}
        </div>
        <aside className="space-y-4" aria-label="Tool details">
          <Card className="p-5">
            <h2 className="text-sm font-bold tracking-wide text-(--muted) uppercase">Details</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-(--muted)">Category</dt>
                <dd>
                  {category ? (
                    <Link href={`/category/${category.slug}`} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
                      {category.title}
                    </Link>
                  ) : (
                    <span className="font-semibold">{tool.category}</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-(--muted)">Status</dt>
                <dd className="font-semibold">{live ? "Live" : "Coming soon"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-(--muted)">Plan</dt>
                <dd className="font-semibold">Free</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-(--muted)">Sign-up</dt>
                <dd className="font-semibold">Not required</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-(--muted)">Privacy</dt>
                <dd className="font-semibold">On-device</dd>
              </div>
            </dl>
          </Card>
          {siblings.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-bold tracking-wide text-(--muted) uppercase">More in {category?.shortTitle}</h2>
              <ul className="mt-3 space-y-2">
                {siblings.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/tools/${t.slug}`} className="text-sm font-medium text-(--foreground) hover:text-brand-700 hover:underline dark:hover:text-brand-300">
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {popular.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-bold tracking-wide text-(--muted) uppercase">Popular right now</h2>
              <ul className="mt-3 space-y-2">
                {popular
                  .filter((t) => t.slug !== tool.slug)
                  .slice(0, 5)
                  .map((t) => (
                    <li key={t.slug}>
                      <Link href={`/tools/${t.slug}`} className="text-sm font-medium text-(--foreground) hover:text-brand-700 hover:underline dark:hover:text-brand-300">
                        {t.name}
                      </Link>
                    </li>
                  ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related" className="mt-10">
          <h2 id="related" className="text-xl font-extrabold text-(--foreground)">Related tools</h2>
          <div className="mt-4">
            <ToolGrid tools={related} />
          </div>
        </section>
      )}
    </>
  );
}
