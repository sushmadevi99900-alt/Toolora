/**
 * Tool-engine shared helpers — clipboard, downloads and formatting.
 * All browser-only functions are safe to call from client components;
 * they no-op (return false) when the required API is unavailable.
 */

export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function downloadTextFile(filename: string, content: string, mime = "text/plain"): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatInteger(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${trimNum(n / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${trimNum(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${trimNum(n / 1_000)}K`;
  return trimNum(n);
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

/** Display a number with up to 6 significant decimals, no trailing noise. */
export function formatResult(n: number, decimals = 6): string {
  if (!Number.isFinite(n)) return "—";
  const rounded = Number(n.toFixed(decimals));
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals }).format(rounded);
}
