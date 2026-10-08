import Link from "next/link";
import { ButtonLink } from "./Button";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-(--border) bg-(--surface) px-6 py-14 text-center">
      <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-full bg-(--surface-2) text-(--muted)">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3M8 11h6" />
        </svg>
      </span>
      <h2 className="mt-4 text-lg font-bold text-(--foreground)">{title}</h2>
      <p className="mt-1 max-w-sm text-[15px] text-(--muted)">{description}</p>
      {actionLabel && actionHref && (
        <ButtonLink href={actionHref} variant="secondary" size="sm" className="mt-5">
          {actionLabel}
        </ButtonLink>
      )}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-14 text-center">
      <span aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-[3px] border-(--border) border-t-brand-600" />
      <p className="text-sm font-medium text-(--muted)">{label}</p>
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description = "Please try again. If the problem continues, contact us." }: { title?: string; description?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50/50 px-6 py-14 text-center dark:border-red-500/20 dark:bg-red-500/5">
      <h2 className="text-lg font-bold text-(--foreground)">{title}</h2>
      <p className="mt-1 max-w-sm text-[15px] text-(--muted)">{description}</p>
      <Link href="/" className="mt-5 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
        Back to homepage
      </Link>
    </div>
  );
}
