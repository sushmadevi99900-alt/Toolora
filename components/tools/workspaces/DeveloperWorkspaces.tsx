"use client";

import { useMemo, useState } from "react";
import { Stat } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { FieldLabel, Textarea, Input } from "../../ui/Input";
import { copyText, downloadTextFile, formatInteger } from "@/lib/engine/formatters";
import { tryJsonParse, isValidBase64 } from "@/lib/engine/validation";
import { generateUuid, md5Hex } from "@/lib/engine/crypto";

function Actions({ onCopy, copied, disabled, onDownload, sampleLabel, onSample }: {
  onCopy: () => void; copied: boolean; disabled: boolean; onDownload?: () => void; sampleLabel?: string; onSample?: () => void;
}) {
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <Button type="button" variant="secondary" onClick={onCopy} disabled={disabled}>{copied ? "Copied ✓" : "Copy result"}</Button>
      {onDownload && <Button type="button" variant="secondary" onClick={onDownload} disabled={disabled}>Download</Button>}
      {onSample && <Button type="button" variant="ghost" onClick={onSample}>{sampleLabel ?? "Load sample"}</Button>}
    </div>
  );
}

function useCopy(): [boolean, (t: string) => void] {
  const [copied, setCopied] = useState(false);
  return [copied, async (t: string) => {
    if (t && (await copyText(t))) { setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
  }];
}

/* ---------- JSON ---------- */

const SAMPLE_JSON = '{\n  "name": "Toolora",\n  "tools": 100,\n  "free": true,\n  "tags": ["online", "private", "fast"]\n}';

function JsonShell({ mode }: { mode: "format" | "validate" | "minify" }) {
  const [raw, setRaw] = useState("");
  const [indent, setIndent] = useState("2");
  const [copied, copy] = useCopy();
  const res = useMemo(() => {
    if (!raw.trim()) return { empty: true as const };
    const parsed = tryJsonParse(raw);
    if (!parsed.ok) return { error: parsed.error, position: parsed.position };
    const spaces = indent === "tab" ? "\t" : Number(indent);
    const pretty = JSON.stringify(parsed.value, null, spaces);
    const min = JSON.stringify(parsed.value);
    return { pretty, min, sizeBefore: raw.length, sizeAfter: min.length };
  }, [raw, indent]);
  const output = mode === "minify" ? ("min" in res ? res.min as string : "") : ("pretty" in res ? res.pretty as string : "");
  const valid = "pretty" in res;
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <FieldLabel htmlFor={`json-${mode}-indent`}>Indentation</FieldLabel>
          <select id={`json-${mode}-indent`} value={indent} onChange={(e) => setIndent(e.target.value)} disabled={mode === "validate"}
            className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px] disabled:opacity-50">
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tab</option>
          </select>
        </div>
      </div>
      <div className="mt-3">
        <FieldLabel htmlFor={`json-${mode}-input`}>JSON input</FieldLabel>
        <Textarea id={`json-${mode}-input`} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder='Paste JSON, e.g. {"a":1}' rows={8} className="font-mono text-sm" />
      </div>
      {"error" in res && res.error && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger-600">Invalid JSON: {res.error}{"position" in res && res.position != null ? ` (near position ${res.position})` : ""}</p>
      )}
      {mode === "validate" && (valid || ("error" in res && res.error)) && (
        <div aria-live="polite" className={`mt-3 rounded-xl px-4 py-3 text-sm font-bold ${valid ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"}`}>
          {valid ? "✓ Valid JSON" : "✗ Invalid JSON — see the error above"}
        </div>
      )}
      {mode !== "validate" && (
        <>
          <FieldLabel htmlFor={`json-${mode}-output`}>{mode === "minify" ? "Minified output" : "Formatted output"}</FieldLabel>
          <Textarea id={`json-${mode}-output`} value={output} readOnly rows={8} className="font-mono text-sm" aria-live="polite" placeholder="Result appears here…" />
          {"sizeBefore" in res && (
            <p className="mt-2 text-sm text-(--muted)">
              {formatInteger(res.sizeBefore as number)} → {formatInteger(res.sizeAfter as number)} chars
              ({res.sizeBefore as number > 0 ? Math.max(0, Math.round((1 - (res.sizeAfter as number) / (res.sizeBefore as number)) * 100)) : 0}% smaller)
            </p>
          )}
        </>
      )}
      <Actions onCopy={() => copy(mode === "validate" ? raw : output)} copied={copied} disabled={mode === "validate" ? !raw : !output}
        onDownload={mode !== "validate" && output ? () => downloadTextFile(mode === "minify" ? "minified.json" : "formatted.json", output, "application/json") : undefined}
        onSample={() => setRaw(SAMPLE_JSON)} sampleLabel="Load sample" />
    </div>
  );
}

export function JsonFormatterTool() { return <JsonShell mode="format" />; }
export function JsonValidatorTool() { return <JsonShell mode="validate" />; }
export function JsonMinifierTool() { return <JsonShell mode="minify" />; }

/* ---------- Base64 ---------- */

function utf8ToB64(s: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(s)));
}
function b64ToUtf8(b64: string): string {
  const clean = b64.trim().replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(clean);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function Base64EncoderTool() {
  const [text, setText] = useState("");
  const [urlSafe, setUrlSafe] = useState(false);
  const [copied, copy] = useCopy();
  const output = useMemo(() => {
    if (!text) return "";
    try {
      const b64 = utf8ToB64(text);
      return urlSafe ? b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : b64;
    } catch { return ""; }
  }, [text, urlSafe]);
  return (
    <div>
      <FieldLabel htmlFor="b64e-input">Text to encode</FieldLabel>
      <Textarea id="b64e-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Hello, world!" rows={5} />
      <label className="mt-2 flex min-h-[44px] items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} className="h-5 w-5 accent-brand-600" />
        URL-safe output (no + / =)
      </label>
      <FieldLabel htmlFor="b64e-output">Base64</FieldLabel>
      <Textarea id="b64e-output" value={output} readOnly rows={5} className="font-mono text-sm" aria-live="polite" />
      <Actions onCopy={() => copy(output)} copied={copied} disabled={!output} />
    </div>
  );
}

export function Base64DecoderTool() {
  const [raw, setRaw] = useState("");
  const [copied, copy] = useCopy();
  const res = useMemo(() => {
    if (!raw.trim()) return { empty: true as const };
    if (!isValidBase64(raw)) return { error: "That doesn't look like valid Base64 (check length and characters)." };
    try {
      return { text: b64ToUtf8(raw) };
    } catch {
      return { error: "Decoding failed — the string may be truncated or corrupted." };
    }
  }, [raw]);
  const output = "text" in res ? (res.text as string) : "";
  return (
    <div>
      <FieldLabel htmlFor="b64d-input">Base64 to decode</FieldLabel>
      <Textarea id="b64d-input" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="SGVsbG8sIHdvcmxkIQ==" rows={5} className="font-mono text-sm" />
      {"error" in res && res.error && <p role="alert" className="mt-2 text-sm font-medium text-danger-600">{res.error}</p>}
      <FieldLabel htmlFor="b64d-output">Decoded text</FieldLabel>
      <Textarea id="b64d-output" value={output} readOnly rows={5} aria-live="polite" />
      <Actions onCopy={() => copy(output)} copied={copied} disabled={!output} />
    </div>
  );
}

/* ---------- URL ---------- */

export function UrlEncoderTool() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("component");
  const [copied, copy] = useCopy();
  const output = useMemo(() => {
    if (!text) return "";
    try {
      if (mode === "component") return encodeURIComponent(text);
      return encodeURI(text);
    } catch { return ""; }
  }, [text, mode]);
  return (
    <div>
      <FieldLabel htmlFor="urle-input">Text or URL to encode</FieldLabel>
      <Textarea id="urle-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="https://example.com/a b?x=1&y=2" rows={4} className="font-mono text-sm" />
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Encode mode">
        {[["component", "Component (query values)"], ["full", "Full URL (keep :/?#)"]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setMode(v)} aria-pressed={mode === v}
            className={`min-h-[40px] rounded-full border px-4 text-sm font-semibold ${mode === v ? "border-brand-600 bg-brand-600 text-white" : "border-(--border) text-(--muted)"}`}>{l}</button>
        ))}
      </div>
      <FieldLabel htmlFor="urle-output">Encoded</FieldLabel>
      <Textarea id="urle-output" value={output} readOnly rows={4} className="font-mono text-sm" aria-live="polite" />
      <Actions onCopy={() => copy(output)} copied={copied} disabled={!output} />
    </div>
  );
}

export function UrlDecoderTool() {
  const [raw, setRaw] = useState("");
  const [plusAsSpace, setPlusAsSpace] = useState(true);
  const [copied, copy] = useCopy();
  const res = useMemo(() => {
    if (!raw) return { empty: true as const };
    try {
      const src = plusAsSpace ? raw.replace(/\+/g, " ") : raw;
      return { text: decodeURIComponent(src) };
    } catch {
      try {
        return { text: decodeURI(raw), warning: "Partially decoded — some sequences were invalid and left as-is." };
      } catch {
        return { error: "Decoding failed — check for lone % signs or truncated sequences." };
      }
    }
  }, [raw, plusAsSpace]);
  const output = "text" in res ? (res.text as string) : "";
  return (
    <div>
      <FieldLabel htmlFor="urld-input">Encoded URL to decode</FieldLabel>
      <Textarea id="urld-input" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="https%3A%2F%2Fexample.com%2Fa%20b" rows={4} className="font-mono text-sm" />
      <label className="mt-2 flex min-h-[44px] items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={plusAsSpace} onChange={(e) => setPlusAsSpace(e.target.checked)} className="h-5 w-5 accent-brand-600" />
        Treat + as space (form encoding)
      </label>
      {"error" in res && res.error && <p role="alert" className="mt-2 text-sm font-medium text-danger-600">{res.error}</p>}
      {"warning" in res && res.warning && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{res.warning}</p>}
      <FieldLabel htmlFor="urld-output">Decoded</FieldLabel>
      <Textarea id="urld-output" value={output} readOnly rows={4} aria-live="polite" />
      <Actions onCopy={() => copy(output)} copied={copied} disabled={!output} />
    </div>
  );
}

/* ---------- UUID ---------- */

export function UuidGeneratorTool() {
  const [count, setCount] = useState("5");
  const [upper, setUpper] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [list, setList] = useState<string[]>(() => [generateUuid()]);
  const [copied, copy] = useCopy();
  const generate = () => {
    const n = Math.max(1, Math.min(500, Number(count) || 1));
    setList(Array.from({ length: n }, () => {
      const u = generateUuid();
      return upper ? (hyphens ? u.toUpperCase() : u.replace(/-/g, "").toUpperCase()) : hyphens ? u : u.replace(/-/g, "");
    }));
  };
  const output = list.join("\n");
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <FieldLabel htmlFor="uuid-count">How many (1–500)</FieldLabel>
          <Input id="uuid-count" type="number" min={1} max={500} value={count} onChange={(e) => setCount(e.target.value)} />
        </div>
        <label className="flex min-h-[44px] items-end gap-2 pb-2 text-sm font-medium">
          <input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} className="h-5 w-5 accent-brand-600" /> Uppercase
        </label>
        <label className="flex min-h-[44px] items-end gap-2 pb-2 text-sm font-medium">
          <input type="checkbox" checked={hyphens} onChange={(e) => setHyphens(e.target.checked)} className="h-5 w-5 accent-brand-600" /> Hyphens
        </label>
      </div>
      <div className="mt-4">
        <Button type="button" onClick={generate}>Generate UUIDs</Button>
      </div>
      <FieldLabel htmlFor="uuid-output">UUIDs</FieldLabel>
      <Textarea id="uuid-output" value={output} readOnly rows={Math.min(10, Math.max(3, list.length + 1))} className="font-mono text-sm" aria-live="polite" />
      <Actions onCopy={() => copy(output)} copied={copied} disabled={!output}
        onDownload={() => downloadTextFile("uuids.txt", output)} />
    </div>
  );
}

/* ---------- Timestamp ---------- */

export function TimestampConverterTool() {
  const [input, setInput] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [now, setNow] = useState(() => Date.now());
  const [copied, copy] = useCopy();
  const res = useMemo(() => {
    const raw = input.trim();
    if (!raw) return { empty: true as const };
    // Numeric → date
    if (/^[+-]?\d+(\.\d+)?$/.test(raw)) {
      const n = Number(raw);
      const ms = raw.replace(/^[+-]/, "").replace(".", "").length > 10 || Math.abs(n) > 1e11 ? n : n * 1000;
      const d = new Date(ms);
      if (Number.isNaN(+d)) return { error: `"${raw}" is not a valid timestamp.` };
      return {
        date: d, iso: d.toISOString(), local: d.toLocaleString("en-US"),
        utc: d.toUTCString(), seconds: Math.floor(d.getTime() / 1000), ms: d.getTime(),
      };
    }
    // Date → timestamp
    const d = new Date(raw);
    if (Number.isNaN(+d)) return { error: `Could not parse "${raw}" as a date or timestamp.` };
    return {
      date: d, iso: d.toISOString(), local: d.toLocaleString("en-US"),
      utc: d.toUTCString(), seconds: Math.floor(d.getTime() / 1000), ms: d.getTime(),
    };
  }, [input]);
  const rel = "date" in res ? (() => {
    const diff = now - (res.date as Date).getTime();
    const abs = Math.abs(diff);
    const unit: [number, string][] = [[1000, "second"], [60_000, "minute"], [3_600_000, "hour"], [86_400_000, "day"]];
    let label = "just now";
    for (const [ms, name] of unit) {
      if (abs >= ms) {
        const n = Math.floor(abs / ms);
        label = `${n} ${name}${n === 1 ? "" : "s"}`;
      }
    }
    return diff >= 0 ? `${label} ago` : `in ${label}`;
  })() : "";
  return (
    <div>
      <FieldLabel htmlFor="ts-input">Unix timestamp or date</FieldLabel>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id="ts-input" value={input} onChange={(e) => { setInput(e.target.value); setNow(Date.now()); }} placeholder="1704067200 or 2024-01-01" className="font-mono" />
        <Button type="button" variant="secondary" onClick={() => { setInput(String(Math.floor(Date.now() / 1000))); setNow(Date.now()); }}>Now</Button>
      </div>
      {"error" in res && res.error && <p role="alert" className="mt-2 text-sm font-medium text-danger-600">{res.error}</p>}
      {"date" in res && (
        <div aria-live="polite" className="mt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Stat value={String(res.seconds)} label="Seconds" />
            <Stat value={String(res.ms)} label="Milliseconds" />
          </div>
          <dl className="mt-3 space-y-2 rounded-2xl bg-(--surface-2) p-4 text-sm">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between"><dt className="text-(--muted)">Local</dt><dd className="font-mono font-semibold">{String(res.local)}</dd></div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between"><dt className="text-(--muted)">UTC</dt><dd className="font-mono font-semibold">{String(res.utc)}</dd></div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between"><dt className="text-(--muted)">ISO 8601</dt><dd className="font-mono font-semibold">{String(res.iso)}</dd></div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between"><dt className="text-(--muted)">Relative</dt><dd className="font-semibold">{rel}</dd></div>
          </dl>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => copy(String(res.iso))}>{copied ? "Copied ✓" : "Copy ISO date"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- JSON ↔ CSV ---------- */

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c === "\r") {
      // skip; \n handles the break
    } else {
      cell += c;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function JsonToCsvTool() {
  const [raw, setRaw] = useState("");
  const [copied, copy] = useCopy();
  const res = useMemo(() => {
    if (!raw.trim()) return { empty: true as const };
    const parsed = tryJsonParse(raw);
    if (!parsed.ok) return { error: parsed.error };
    const arr = Array.isArray(parsed.value) ? parsed.value : [parsed.value];
    if (arr.length === 0) return { error: "Array is empty — nothing to convert." };
    if (typeof arr[0] !== "object" || arr[0] === null) return { error: "JSON must be an object or an array of objects." };
    const keys = [...new Set((arr as Record<string, unknown>[]).flatMap((o) => Object.keys(o)))];
    const lines = [keys.map(csvCell).join(",")];
    for (const o of arr as Record<string, unknown>[]) lines.push(keys.map((k) => csvCell(o[k])).join(","));
    return { output: lines.join("\n"), rows: arr.length, cols: keys.length };
  }, [raw]);
  const output = "output" in res ? res.output as string : "";
  return (
    <div>
      <FieldLabel htmlFor="j2c-input">JSON input (object or array of objects)</FieldLabel>
      <Textarea id="j2c-input" value={raw} onChange={(e) => setRaw(e.target.value)} rows={8} className="font-mono text-sm" placeholder='[{"name":"Asha","age":28}]' />
      {"error" in res && res.error && <p role="alert" className="mt-2 text-sm font-medium text-danger-600">{res.error}</p>}
      {"rows" in res && <p className="mt-2 text-sm text-(--muted)">{res.rows} row(s) × {res.cols} column(s)</p>}
      <FieldLabel htmlFor="j2c-output">CSV output</FieldLabel>
      <Textarea id="j2c-output" value={output} readOnly rows={8} className="font-mono text-sm" aria-live="polite" placeholder="Result appears here…" />
      <Actions onCopy={() => copy(output)} copied={copied} disabled={!output}
        onDownload={output ? () => downloadTextFile("data.csv", output, "text/csv") : undefined}
        onSample={() => setRaw('[{"name":"Asha","city":"Pune","orders":3},{"name":"Ravi","city":"Jaipur","orders":5}]')} />
    </div>
  );
}

export function CsvToJsonTool() {
  const [raw, setRaw] = useState("");
  const [pretty, setPretty] = useState(true);
  const [copied, copy] = useCopy();
  const res = useMemo(() => {
    if (!raw.trim()) return { empty: true as const };
    const rows = parseCsv(raw);
    if (rows.length < 2) return { error: "Need a header row plus at least one data row." };
    const header = rows[0]!.map((h, i) => h.trim() || `col${i + 1}`);
    const objs = rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
    return { output: pretty ? JSON.stringify(objs, null, 2) : JSON.stringify(objs), rows: objs.length };
  }, [raw, pretty]);
  const output = "output" in res ? res.output as string : "";
  return (
    <div>
      <label className="flex min-h-[44px] items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={pretty} onChange={(e) => setPretty(e.target.checked)} className="h-5 w-5 accent-brand-600" />
        Pretty-print JSON
      </label>
      <FieldLabel htmlFor="c2j-input">CSV input (first row = headers)</FieldLabel>
      <Textarea id="c2j-input" value={raw} onChange={(e) => setRaw(e.target.value)} rows={8} className="font-mono text-sm" placeholder={'name,city\nAsha,Pune'} />
      {"error" in res && res.error && <p role="alert" className="mt-2 text-sm font-medium text-danger-600">{res.error}</p>}
      <FieldLabel htmlFor="c2j-output">JSON output</FieldLabel>
      <Textarea id="c2j-output" value={output} readOnly rows={8} className="font-mono text-sm" aria-live="polite" placeholder="Result appears here…" />
      <Actions onCopy={() => copy(output)} copied={copied} disabled={!output}
        onDownload={output ? () => downloadTextFile("data.json", output, "application/json") : undefined}
        onSample={() => setRaw("name,city,orders\nAsha,Pune,3\nRavi,Jaipur,5")} />
    </div>
  );
}

/* ---------- Regex tester ---------- */

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function RegexTesterTool() {
  const [pattern, setPattern] = useState("\\b\\w+@\\w+\\.\\w+\\b");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("Contact asha@example.com or ravi@test.org for details.");
  const res = useMemo(() => {
    try {
      const re = new RegExp(pattern || "(?:)", flags.replace(/[^dgimsuy]/g, ""));
      const matches = [...text.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`))];
      let html = "";
      let last = 0;
      const shown = matches.slice(0, 100);
      for (const m of shown) {
        const idx = m.index ?? 0;
        html += escapeHtml(text.slice(last, idx));
        html += `<mark class="rounded bg-brand-200 px-0.5 dark:bg-brand-500/30">${escapeHtml(m[0])}</mark>`;
        last = idx + m[0].length;
      }
      html += escapeHtml(text.slice(last));
      return { html, count: matches.length, groups: matches[0]?.length ? matches[0].length - 1 : 0 };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Invalid regular expression." };
    }
  }, [pattern, flags, text]);
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <FieldLabel htmlFor="rx-pattern">Pattern</FieldLabel>
          <Input id="rx-pattern" value={pattern} onChange={(e) => setPattern(e.target.value)} className="font-mono" placeholder="\d+" />
        </div>
        <div>
          <FieldLabel htmlFor="rx-flags">Flags</FieldLabel>
          <Input id="rx-flags" value={flags} onChange={(e) => setFlags(e.target.value)} className="w-28 font-mono" placeholder="gimsuy" />
        </div>
      </div>
      <div className="mt-3">
        <FieldLabel htmlFor="rx-text">Test text</FieldLabel>
        <Textarea id="rx-text" value={text} onChange={(e) => setText(e.target.value)} rows={6} className="font-mono text-sm" />
      </div>
      {"error" in res && res.error
        ? <p role="alert" className="mt-2 text-sm font-medium text-danger-600">Invalid pattern: {res.error}</p>
        : (
          <>
            <p className="mt-2 text-sm text-(--muted)" aria-live="polite">
              {res.count} match{(res.count as number) === 1 ? "" : "es"}
              {(res.groups as number) > 0 && ` · ${res.groups} group${(res.groups as number) === 1 ? "" : "s"} in first match`}
            </p>
            <div
              className="mt-2 rounded-xl border border-(--border) bg-(--surface-2)/60 px-4 py-3 font-mono text-sm break-words whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: (res.html as string) || "&nbsp;" }}
              aria-live="polite"
              aria-label="Highlighted matches"
            />
          </>
        )}
      <p className="mt-2 text-xs text-(--muted)">Flags: g global · i case-insensitive · m multiline · s dot-all · u unicode · y sticky. Patterns run locally in your browser.</p>
    </div>
  );
}

/* ---------- HTML / CSS / JS format + minify ---------- */

function formatHtml(src: string): string {
  const tokens = src.replace(/>\s*</g, ">\n<").split("\n");
  let depth = 0;
  const voids = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  return tokens
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const close = /^<\//.test(t);
      const tag = (t.match(/^<\/?([a-zA-Z][\w-]*)/) ?? [])[1]?.toLowerCase();
      const selfClose = /\/>$/.test(t) || (tag !== undefined && voids.has(tag)) || /^<!/.test(t);
      if (close) depth = Math.max(0, depth - 1);
      const line = `${"  ".repeat(depth)}${t}`;
      if (!close && !selfClose) depth += 1;
      return line;
    })
    .join("\n");
}

function formatBraces(src: string): string {
  // Generic brace/semicolon-based formatter for CSS and simple JS.
  const lines: string[] = [];
  let depth = 0;
  let cur = "";
  let str: string | null = null;
  let esc = false;
  const flush = () => {
    const t = cur.trim();
    if (t) lines.push(`${"  ".repeat(Math.max(0, depth))}${t}`);
    cur = "";
  };
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i]!;
    if (str) {
      cur += c;
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === str) str = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      str = c;
      cur += c;
      continue;
    }
    if (c === "{") {
      cur += " {";
      flush();
      depth += 1;
      continue;
    }
    if (c === "}") {
      flush();
      depth = Math.max(0, depth - 1);
      cur += "}";
      flush();
      continue;
    }
    if (c === ";") {
      cur += ";";
      flush();
      continue;
    }
    cur += c;
  }
  flush();
  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

function minifyCode(src: string, lineComments: boolean): string {
  // String-aware comment stripper + whitespace collapser (basic minification).
  let out = "";
  let str: string | null = null;
  let esc = false;
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    const next = src[i + 1] ?? "";
    if (str) {
      out += c;
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === str) str = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      str = c;
      out += c;
      i += 1;
      continue;
    }
    if (c === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end === -1 ? src.length : end + 2;
      continue;
    }
    if (lineComments && c === "/" && next === "/") {
      const end = src.indexOf("\n", i + 2);
      i = end === -1 ? src.length : end;
      continue;
    }
    out += c;
    i += 1;
  }
  return out
    .replace(/\s+/g, " ")
    .replace(/\s*([{};:,>+~()=[\]!])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

function CodeTool({ id, title, run, placeholder, note }: {
  id: string; title: string; run: (s: string) => string; placeholder: string; note: string;
}) {
  const [raw, setRaw] = useState("");
  const [copied, copy] = useCopy();
  const res = useMemo(() => {
    if (!raw.trim()) return { empty: true as const };
    try {
      const output = run(raw);
      return { output, before: raw.length, after: output.length };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Processing failed." };
    }
  }, [raw, run]);
  const output = "output" in res ? (res.output as string) : "";
  return (
    <div>
      <FieldLabel htmlFor={`${id}-input`}>{title} input</FieldLabel>
      <Textarea id={`${id}-input`} value={raw} onChange={(e) => setRaw(e.target.value)} rows={9} className="font-mono text-sm" placeholder={placeholder} />
      {"error" in res && res.error && <p role="alert" className="mt-2 text-sm font-medium text-danger-600">{res.error}</p>}
      {"before" in res && (
        <p className="mt-2 text-sm text-(--muted)">
          {formatInteger(res.before as number)} → {formatInteger(res.after as number)} chars
        </p>
      )}
      <FieldLabel htmlFor={`${id}-output`}>Output</FieldLabel>
      <Textarea id={`${id}-output`} value={output} readOnly rows={9} className="font-mono text-sm" aria-live="polite" placeholder="Result appears here…" />
      <p className="mt-2 text-xs text-(--muted)">{note}</p>
      <Actions onCopy={() => copy(output)} copied={copied} disabled={!output}
        onDownload={output ? () => downloadTextFile(`${id}.txt`, output, "text/plain") : undefined} />
    </div>
  );
}

const BASIC_NOTE = "Basic formatter for quick cleanup — not a full language parser. Complex or invalid code may need manual review.";

export function HtmlFormatterTool() {
  return <CodeTool id="html-format" title="HTML" run={formatHtml} placeholder="<div><p>Hello</p></div>" note={BASIC_NOTE} />;
}
export function CssFormatterTool() {
  return <CodeTool id="css-format" title="CSS" run={(s) => formatBraces(s)} placeholder=".a{color:red}.b{margin:0}" note={BASIC_NOTE} />;
}
export function JavascriptFormatterTool() {
  return <CodeTool id="js-format" title="JavaScript" run={(s) => formatBraces(s)} placeholder="function hi(){return 1;}" note={BASIC_NOTE} />;
}
export function HtmlMinifierTool() {
  return <CodeTool id="html-min" title="HTML" run={(s) => minifyCode(s.replace(/<!--[\s\S]*?-->/g, ""), false)} placeholder="<div>  <p>Hello</p> </div>" note="Strips comments and collapses whitespace. Test the result before deploying." />;
}
export function CssMinifierTool() {
  return <CodeTool id="css-min" title="CSS" run={(s) => minifyCode(s, false)} placeholder=".a { color: red; }" note="Strips comments and collapses whitespace. Test the result before deploying." />;
}
export function JavascriptMinifierTool() {
  return <CodeTool id="js-min" title="JavaScript" run={(s) => minifyCode(s, true)} placeholder="function hi() { return 1; }" note="Basic minification (comments + whitespace). For production builds use a real bundler; test before deploying." />;
}

/* ---------- JWT decoder ---------- */

function b64urlDecode(seg: string): string {
  const b64 = seg.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function JwtDecoderTool() {
  const [raw, setRaw] = useState("");
  const [copied, copy] = useCopy();
  const res = useMemo(() => {
    if (!raw.trim()) return { empty: true as const };
    const parts = raw.trim().split(".");
    if (parts.length !== 3) return { error: "A JWT has three dot-separated parts (header.payload.signature)." };
    try {
      const header = JSON.stringify(JSON.parse(b64urlDecode(parts[0]!)), null, 2);
      const payload = JSON.stringify(JSON.parse(b64urlDecode(parts[1]!)), null, 2);
      return { header, payload, sig: parts[2]! };
    } catch {
      return { error: "Could not decode. Check the token is complete and correctly pasted." };
    }
  }, [raw]);
  return (
    <div>
      <p role="note" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
        Decoding is not verification — anyone can read a JWT&apos;s payload. Never paste production secrets here.
      </p>
      <div className="mt-3">
        <FieldLabel htmlFor="jwt-input">JWT</FieldLabel>
        <Textarea id="jwt-input" value={raw} onChange={(e) => setRaw(e.target.value)} rows={5} className="font-mono text-xs break-all" placeholder="eyJhbGciOi…" />
      </div>
      {"error" in res && res.error && <p role="alert" className="mt-2 text-sm font-medium text-danger-600">{res.error}</p>}
      {"header" in res && (
        <>
          <FieldLabel htmlFor="jwt-header">Header</FieldLabel>
          <Textarea id="jwt-header" value={res.header as string} readOnly rows={5} className="font-mono text-xs" aria-live="polite" />
          <FieldLabel htmlFor="jwt-payload">Payload</FieldLabel>
          <Textarea id="jwt-payload" value={res.payload as string} readOnly rows={8} className="font-mono text-xs" aria-live="polite" />
          <p className="mt-2 font-mono text-xs break-all text-(--muted)">Signature: {(res.sig as string).slice(0, 48)}… (not verified)</p>
          <Actions onCopy={() => copy(res.payload as string)} copied={copied} disabled={!("payload" in res)} />
        </>
      )}
    </div>
  );
}

/* ---------- Hash generator ---------- */

const HASH_ALGOS = ["SHA-256", "SHA-512", "SHA-384", "SHA-1", "MD5"] as const;

export function HashGeneratorTool() {
  const [text, setText] = useState("");
  const [algo, setAlgo] = useState<(typeof HASH_ALGOS)[number]>("SHA-256");
  const [upper, setUpper] = useState(false);
  const [hash, setHash] = useState("");
  const [error, setError] = useState("");
  const [copied, copy] = useCopy();

  const run = async () => {
    setError("");
    setHash("");
    if (!text) {
      setError("Enter some text to hash.");
      return;
    }
    try {
      let digest: string;
      if (algo === "MD5") {
        digest = md5Hex(text);
      } else {
        if (!crypto.subtle) throw new Error("unsupported");
        const out = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
        digest = [...new Uint8Array(out)].map((b) => b.toString(16).padStart(2, "0")).join("");
      }
      setHash(upper ? digest.toUpperCase() : digest);
    } catch {
      setError("Hashing is unavailable here — SHA hashing needs a secure context (HTTPS or localhost).");
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="hash-algo">Algorithm</FieldLabel>
          <select id="hash-algo" value={algo} onChange={(e) => setAlgo(e.target.value as typeof algo)}
            className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-3 font-mono text-[15px]">
            {HASH_ALGOS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <label className="flex min-h-[44px] items-center gap-2 self-end pb-1 text-sm font-medium">
          <input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} className="h-5 w-5 accent-brand-600" />
          Uppercase output
        </label>
      </div>
      <div className="mt-3">
        <FieldLabel htmlFor="hash-input">Text to hash</FieldLabel>
        <Textarea id="hash-input" value={text} onChange={(e) => setText(e.target.value)} rows={5} className="font-mono text-sm" />
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-danger-600">{error}</p>}
      <div className="mt-3">
        <Button type="button" onClick={() => void run()}>Generate hash</Button>
      </div>
      {hash && (
        <>
          <FieldLabel htmlFor="hash-output">{algo} digest</FieldLabel>
          <Textarea id="hash-output" value={hash} readOnly rows={4} className="font-mono text-xs break-all" aria-live="polite" />
          <Actions onCopy={() => copy(hash)} copied={copied} disabled={!hash} />
        </>
      )}
      <p className="mt-2 text-xs text-(--muted)">SHA-1 is shown for legacy checksums only — prefer SHA-256 or SHA-512. Hashing runs locally.</p>
    </div>
  );
}
