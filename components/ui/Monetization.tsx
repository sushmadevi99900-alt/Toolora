/**
 * Advertising placeholder.
 * No ad network is loaded — this reserves layout space
 * so future AdSense (or alternatives) slots in without layout shift.
 */
export function AdSlot({ label = "Advertisement", className = "" }: { label?: string; className?: string }) {
  return (
    <div
      role="complementary"
      aria-label={label}
      className={`flex min-h-[90px] items-center justify-center rounded-2xl border border-dashed border-(--border) bg-(--surface-2)/60 px-4 py-6 text-center ${className}`}
    >
      <p className="text-xs font-medium tracking-wide text-(--muted) uppercase">{label} — coming soon</p>
    </div>
  );
}
