import Link from "next/link";
import type { ToolDefinition } from "@/types/tool";
import { categoryMap } from "@/data/categories";
import { Badge } from "../ui/Badge";
import { ToolIcon } from "../ui/ToolIcon";

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const category = categoryMap[tool.category];
  const comingSoon = tool.status === "coming-soon";
  return (
    <Link
      href={`/tools/${tool.slug}`}
      aria-label={`${tool.name}${comingSoon ? " (coming soon)" : ""} — ${tool.shortDescription}`}
      className="group flex flex-col rounded-2xl border border-(--border) bg-(--surface) p-5 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_8px_24px_rgb(79_70_229/0.10)] dark:hover:border-brand-500/40"
    >
      <div className="flex items-start justify-between gap-3">
        <ToolIcon icon={tool.icon} category={tool.category} size={44} />
        <div className="flex flex-wrap justify-end gap-1.5">
          {tool.isFree && <Badge tone="free">Free</Badge>}
          {comingSoon && <Badge tone="warning">Soon</Badge>}
          {tool.isPopular && <Badge tone="popular">Popular</Badge>}
          {tool.isNew && <Badge tone="new">New</Badge>}
        </div>
      </div>
      <h3 className="mt-3 text-[16px] font-bold tracking-tight text-(--foreground) group-hover:text-brand-700 dark:group-hover:text-brand-300">
        {tool.name}
      </h3>
      <p className="clamp-2 mt-1 text-sm leading-relaxed text-(--muted)">{tool.shortDescription}</p>
      <div className="mt-3 flex items-center justify-between border-t border-(--border) pt-3">
        <span className="text-xs font-semibold text-(--muted)">{category?.shortTitle ?? tool.category}</span>
        {comingSoon ? (
          <span className="text-xs font-bold text-warning-600 dark:text-amber-400">Coming soon →</span>
        ) : (
          <span className="text-xs font-bold text-brand-700 dark:text-brand-300">Open tool →</span>
        )}
      </div>
    </Link>
  );
}

export function ToolGrid({ tools }: { tools: ToolDefinition[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tools.map((t) => (
        <ToolCard key={t.slug} tool={t} />
      ))}
    </div>
  );
}
