import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { ToolsExplorer } from "@/components/tools/ToolsExplorer";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata = buildMetadata({
  title: "All Online Tools — Toolora",
  description:
    "Browse every Toolora tool: images, PDFs, text, developers, calculators, converters, generators and utilities. Free tools work instantly.",
  path: "/tools",
  keywords: ["all tools", "online tools directory", "free tools"],
});

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; category?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "All Tools", path: "/tools" },
        ])}
      />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "All Tools" }]} />
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-(--foreground) sm:text-4xl">
        All online tools
      </h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-(--muted)">
        Search, filter by category, or browse popular and new additions. Tools marked “Coming soon”
        are honestly planned — never faked.
      </p>
      <div className="mt-6">
        <ToolsExplorer initialFilter={params.filter ?? "all"} initialCategory={params.category ?? "all"} />
      </div>
    </div>
  );
}
