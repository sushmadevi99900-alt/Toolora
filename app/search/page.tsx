import { buildMetadata } from "@/lib/seo";
import { SearchView } from "@/components/search/SearchView";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata = buildMetadata({
  title: "Search Tools — Toolora",
  description: "Search every Toolora tool by name, description, category or keyword.",
  path: "/search",
  noIndex: true,
});

export default function SearchPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Search" }]} />
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-(--foreground) sm:text-4xl">
        Search tools
      </h1>
      <p className="mt-2 max-w-2xl text-[15px] text-(--muted)">
        Search by name, description, category or keyword — results appear as you navigate.
      </p>
      <div className="mt-6">
        <SearchView />
      </div>
    </div>
  );
}
