/** Join class names, ignoring falsy values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Format an integer with locale separators. */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
