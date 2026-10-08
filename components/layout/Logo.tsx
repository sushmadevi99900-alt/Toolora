import { cn } from "@/lib/utils";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-accent-500 text-white shadow-sm"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 6.5a4 4 0 0 0-5.6 4.9L4 16.3V20h3.7l4.9-4.9a4 4 0 0 0 4.9-5.6l-2.7 2.7-2.5-.7-.7-2.5 2.9-2.5z" />
      </svg>
    </span>
  );
}

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={compact ? 28 : 32} />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-extrabold tracking-tight text-(--foreground)">
          Toolora
        </span>
        {!compact && (
          <span className="hidden text-[11px] font-medium text-(--muted) sm:block">
            Simple tools. Better productivity.
          </span>
        )}
      </span>
    </span>
  );
}
