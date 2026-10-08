import { notFound, redirect } from "next/navigation";
import { getTool, getToolsByCategory, getRelatedTools, toolAliases, tools, popularTools } from "@/data/tools";
import { getCategory } from "@/data/categories";
import { buildMetadata, breadcrumbJsonLd, faqJsonLd, softwareAppJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { ToolPageShell } from "@/components/tools/ToolPageShell";

export function generateStaticParams() {
  return tools.map((t) => ({ slug: t.slug }));
}

// This route cannot render any meaningful UI without the slug: metadata,
// alias redirects, 404 handling, and all content derive from it via a
// synchronous in-memory registry lookup. Opt out of instant-navigation
// validation for this segment (documented "Allow blocking route" escape
// hatch) instead of wrapping the entire page in a pointless Suspense shell.
export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return { title: "Tool not found | Toolora" };
  return buildMetadata({
    title: tool.seoTitle,
    description: tool.seoDescription,
    path: `/tools/${tool.slug}`,
    keywords: tool.keywords,
  });
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Legacy duplicate slugs (e.g. uuid-generator-generator) redirect to canonical.
  if (toolAliases[slug]) redirect(`/tools/${toolAliases[slug]}`);
  const tool = getTool(slug);
  if (!tool) notFound();
  // Non-canonical alias path that resolved via getTool → redirect to canonical.
  if (tool.slug !== slug) redirect(`/tools/${tool.slug}`);

  const category = getCategory(tool.category);
  const related = getRelatedTools(tool, 4);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "All Tools", path: "/tools" },
          ...(category ? [{ name: category.title, path: `/category/${category.slug}` }] : []),
          { name: tool.name, path: `/tools/${tool.slug}` },
        ])}
      />
      <JsonLd
        data={softwareAppJsonLd({ name: tool.name, description: tool.seoDescription, path: `/tools/${tool.slug}` })}
      />
      {tool.faq.length > 0 && <JsonLd data={faqJsonLd(tool.faq)} />}

      <ToolPageShell
        tool={tool}
        category={category}
        related={related}
        categoryTools={getToolsByCategory(tool.category)}
        popular={popularTools}
      />
    </div>
  );
}
