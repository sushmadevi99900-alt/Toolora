import { Breadcrumbs } from "./Breadcrumbs";

/** Narrow centred content shell for articles / legal pages. */
export function ProsePage({
  crumbs,
  title,
  intro,
  children,
}: {
  crumbs: { label: string; href?: string }[];
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs items={crumbs} />
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-(--foreground) sm:text-4xl">
        {title}
      </h1>
      {intro && <p className="mt-2 text-[16px] leading-relaxed text-(--muted)">{intro}</p>}
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-(--foreground) [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_p]:text-(--muted) [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 [&_ul]:text-(--muted) [&_a]:font-semibold [&_a]:text-brand-700 [&_a]:hover:underline dark:[&_a]:text-brand-300">
        {children}
      </div>
    </div>
  );
}
