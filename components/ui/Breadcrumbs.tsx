import Link from "next/link";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden="true" className="text-(--muted)">
                  /
                </span>
              )}
              {last || !item.href ? (
                <span aria-current={last ? "page" : undefined} className="font-medium text-(--foreground)">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="text-(--muted) hover:text-brand-600 hover:underline dark:hover:text-brand-300">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
