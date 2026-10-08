import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-(--border) bg-(--surface) shadow-[0_1px_2px_rgb(15_23_42/0.05)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-(--surface-2) px-4 py-3 text-center">
      <div className="text-xl font-extrabold tracking-tight text-(--foreground) tabular-nums sm:text-2xl">
        {value}
      </div>
      <div className="mt-0.5 text-xs font-medium text-(--muted)">{label}</div>
    </div>
  );
}
