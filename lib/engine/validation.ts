/**
 * Tool-engine validation helpers — every interactive workspace funnels
 * user input through these so pages never crash on bad input.
 */

export interface Validation {
  ok: boolean;
  error?: string;
}

export function requireNonEmpty(value: string, label = "input"): Validation {
  if (!value.trim()) return { ok: false, error: `Enter some ${label} to begin.` };
  return { ok: true };
}

export function requireFiniteNumber(raw: string, label = "value"): { ok: boolean; value?: number; error?: string } {
  if (!raw.trim()) return { ok: false, error: `Enter a ${label}.` };
  const value = Number(raw);
  if (!Number.isFinite(value)) return { ok: false, error: `"${raw.trim()}" is not a valid number.` };
  return { ok: true, value };
}

export function guardLargeInput(length: number, limit = 500_000): Validation {
  if (length > limit)
    return {
      ok: false,
      error: `That input is very large (${(length / 1000).toFixed(0)}k characters). Try under ${limit / 1000}k characters for best performance.`,
    };
  return { ok: true };
}

export function parseNumberList(raw: string): { values: number[]; skipped: number } {
  const parts = raw.split(/[\s,;]+/).filter(Boolean);
  const values: number[] = [];
  let skipped = 0;
  for (const p of parts) {
    const n = Number(p);
    if (Number.isFinite(n)) values.push(n);
    else skipped += 1;
  }
  return { values, skipped };
}

export function tryJsonParse(raw: string): { ok: boolean; value?: unknown; error?: string; position?: number } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid JSON.";
    const posMatch = message.match(/position\s+(\d+)/i);
    return { ok: false, error: message, position: posMatch ? Number(posMatch[1]) : undefined };
  }
}

export function isValidBase64(raw: string): boolean {
  const s = raw.trim().replace(/\s+/g, "");
  if (s.length === 0 || s.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/=_-]*$/.test(s);
}
