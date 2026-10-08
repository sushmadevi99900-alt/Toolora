"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../ui/Button";
import { Stat } from "../../ui/Card";
import { FieldLabel, Input, Textarea } from "../../ui/Input";
import { copyText, downloadTextFile } from "@/lib/engine/formatters";
import { guardLargeInput } from "@/lib/engine/validation";

/* ---------- tiny shared bits ---------- */

export function useCopied(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const t = useRef<number | null>(null);
  useEffect(() => () => {
    if (t.current) window.clearTimeout(t.current);
  }, []);
  return [
    copied,
    (text: string) => {
      void copyText(text).then((ok) => {
        if (!ok) return;
        setCopied(true);
        if (t.current) window.clearTimeout(t.current);
        t.current = window.setTimeout(() => setCopied(false), 1600);
      });
    },
  ];
}

export function Err({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-3 rounded-xl bg-danger-500/10 px-4 py-2.5 text-sm font-medium text-danger-600">
      {message}
    </p>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="mt-3 text-sm leading-relaxed text-(--muted)">
      {children}
    </p>
  );
}

export function beep(freq = 880, ms = 180) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
    o.stop(ctx.currentTime + ms / 1000 + 0.05);
    window.setTimeout(() => void ctx.close(), ms + 200);
  } catch {
    /* audio unavailable — timer still works visually */
  }
}

/** Registry helper: turn a static element into a stable component. */
export function asTool(el: React.ReactElement): React.ComponentType {
  const C = () => el;
  return C;
}

/* ---------- form fields ---------- */

export interface Field {
  key: string;
  label: string;
  type: "number" | "text" | "select" | "date" | "time" | "textarea" | "color" | "checkbox";
  options?: { value: string; label: string }[];
  placeholder?: string;
  def?: string;
  min?: number;
  max?: number;
  step?: string;
  required?: boolean;
  hint?: string;
}

function FieldInput({ f, value, onChange }: { f: Field; value: string; onChange: (v: string) => void }) {
  const id = `kit-${f.key}`;
  if (f.type === "select") {
    return (
      <div>
        <FieldLabel htmlFor={id} required={f.required}>{f.label}</FieldLabel>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)"
        >
          {(f.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {f.hint && <p className="mt-1 text-xs text-(--muted)">{f.hint}</p>}
      </div>
    );
  }
  if (f.type === "textarea") {
    return (
      <div>
        <FieldLabel htmlFor={id} required={f.required}>{f.label}</FieldLabel>
        <Textarea id={id} value={value} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }
  if (f.type === "checkbox") {
    return (
      <label htmlFor={id} className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[15px] font-medium text-(--foreground)">
        <input
          id={id}
          type="checkbox"
          checked={value === "1"}
          onChange={(e) => onChange(e.target.checked ? "1" : "0")}
          className="h-5 w-5 accent-indigo-600"
        />
        {f.label}
      </label>
    );
  }
  return (
    <div>
      <FieldLabel htmlFor={id} required={f.required}>{f.label}</FieldLabel>
      <Input
        id={id}
        type={f.type === "number" ? "number" : f.type}
        value={value}
        placeholder={f.placeholder}
        min={f.min}
        max={f.max}
        step={f.type === "number" ? (f.step ?? "any") : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {f.hint && <p className="mt-1 text-xs text-(--muted)">{f.hint}</p>}
    </div>
  );
}

export function num(vals: Record<string, string>, key: string): number | null {
  const raw = (vals[key] ?? "").trim().replace(/,/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function req(vals: Record<string, string>, key: string, label: string): number | { error: string } {
  const n = num(vals, key);
  if (n === null) return { error: `Enter a valid number for “${label}”.` };
  return n;
}

/* ---------- Calc: fields -> computed rows ---------- */

export type CalcOut = { error: string } | { rows: [string, string][]; note?: string };

export function Calc({
  fields,
  compute,
  button = "Calculate",
}: {
  fields: Field[];
  compute: (vals: Record<string, string>) => CalcOut;
  button?: string;
}) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.def ?? (f.type === "checkbox" ? "0" : "")])),
  );
  const [out, setOut] = useState<CalcOut | null>(null);
  const [copied, copy] = useCopied();
  const set = (k: string, v: string) => setVals((p) => ({ ...p, [k]: v }));

  const run = () => {
    for (const f of fields) {
      if (f.required && f.type !== "checkbox" && !vals[f.key]?.trim()) {
        setOut({ error: `“${f.label}” is required.` });
        return;
      }
    }
    setOut(compute(vals));
  };

  const copyTextOut =
    out && "rows" in out ? out.rows.map(([k, v]) => `${k}: ${v}`).join("\n") : "";
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <FieldInput key={f.key} f={f} value={vals[f.key] ?? ""} onChange={(v) => set(f.key, v)} />
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={run}>{button}</Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setVals(Object.fromEntries(fields.map((f) => [f.key, f.def ?? (f.type === "checkbox" ? "0" : "")])));
            setOut(null);
          }}
        >
          Reset
        </Button>
        {out && "rows" in out && (
          <Button type="button" variant="ghost" onClick={() => copy(copyTextOut)}>
            {copied ? "Copied!" : "Copy result"}
          </Button>
        )}
      </div>
      {out && "error" in out && <Err message={out.error} />}
      {out && "rows" in out && (
        <div aria-live="polite" className="mt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {out.rows.slice(0, 4).map(([k, v]) => (
              <Stat key={k} label={k} value={v} />
            ))}
          </div>
          {out.rows.length > 4 && (
            <dl className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)">
              {out.rows.slice(4).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <dt className="text-(--muted)">{k}</dt>
                  <dd className="font-semibold text-(--foreground) tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {out.note && <Note>{out.note}</Note>}
        </div>
      )}
    </div>
  );
}

/* ---------- TextOp: textarea -> processed text ---------- */

export type TextOut = string | { error: string } | { output: string; stats?: [string, string][] };

export function TextOp({
  placeholder = "Paste or type your text…",
  button = "Process",
  outLabel = "Result",
  fileName = "toolora-output.txt",
  live = false,
  process,
}: {
  placeholder?: string;
  button?: string;
  outLabel?: string;
  fileName?: string;
  live?: boolean;
  process: (text: string) => TextOut;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ output: string; stats?: [string, string][] } | null>(null);
  const [copied, copy] = useCopied();

  const run = (text: string) => {
    setError("");
    if (!text.trim()) {
      setResult(null);
      if (!live) setError("Enter some text first.");
      return;
    }
    const guard = guardLargeInput(text.length);
    if (!guard.ok) {
      setResult(null);
      setError(guard.error ?? "Input is too large.");
      return;
    }
    try {
      const r = process(text);
      if (typeof r === "string") setResult({ output: r });
      else if ("error" in r) {
        setResult(null);
        setError(r.error);
      } else setResult(r);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Processing failed. Check your input.");
    }
  };

  const liveResult = useMemo(() => {
    if (!live || !input.trim()) return null;
    try {
      const r = process(input);
      if (typeof r === "string") return { output: r };
      return "error" in r ? null : r;
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, live]);

  const shown = live ? liveResult : result;
  return (
    <div>
      <FieldLabel htmlFor="kit-textop-in">Input</FieldLabel>
      <Textarea
        id="kit-textop-in"
        value={input}
        placeholder={placeholder}
        onChange={(e) => {
          setInput(e.target.value);
          if (live) setError("");
        }}
      />
      {!live && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={() => run(input)}>{button}</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setInput("");
              setResult(null);
              setError("");
            }}
          >
            Clear
          </Button>
        </div>
      )}
      <Err message={error} />
      {shown && (
        <div className="mt-4">
          {shown.stats && (
            <div aria-live="polite" className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {shown.stats.map(([k, v]) => (
                <Stat key={k} label={k} value={v} />
              ))}
            </div>
          )}
          <FieldLabel htmlFor="kit-textop-out">{outLabel}</FieldLabel>
          <Textarea id="kit-textop-out" value={shown.output} readOnly aria-live="polite" />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => copy(shown.output)}>
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => downloadTextFile(fileName, shown.output, "text/plain")}
            >
              Download
            </Button>
            {!live && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setInput("");
                  setResult(null);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Gen: fields -> generated document/code ---------- */

export function Gen({
  fields,
  generate,
  button = "Generate",
  fileName = "toolora-output.txt",
  mime = "text/plain",
  outLabel = "Generated output",
}: {
  fields: Field[];
  generate: (vals: Record<string, string>) => string | { error: string };
  button?: string;
  fileName?: string;
  mime?: string;
  outLabel?: string;
}) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.def ?? (f.type === "checkbox" ? "0" : "")])),
  );
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, copy] = useCopied();
  const set = (k: string, v: string) => setVals((p) => ({ ...p, [k]: v }));

  const run = () => {
    setError("");
    for (const f of fields) {
      if (f.required && f.type !== "checkbox" && !vals[f.key]?.trim()) {
        setError(`“${f.label}” is required.`);
        return;
      }
    }
    try {
      const r = generate(vals);
      if (typeof r === "string") setOutput(r);
      else setError(r.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed. Check your input.");
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <FieldInput key={f.key} f={f} value={vals[f.key] ?? ""} onChange={(v) => set(f.key, v)} />
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={run}>{button}</Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setVals(Object.fromEntries(fields.map((f) => [f.key, f.def ?? (f.type === "checkbox" ? "0" : "")])));
            setOutput("");
            setError("");
          }}
        >
          Reset
        </Button>
      </div>
      <Err message={error} />
      {output && (
        <div className="mt-4">
          <FieldLabel htmlFor="kit-gen-out">{outLabel}</FieldLabel>
          <Textarea id="kit-gen-out" value={output} readOnly aria-live="polite" className="font-mono text-[13px]" />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => copy(output)}>
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => downloadTextFile(fileName, output, mime)}>
              Download
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Units: amount + from/to converter ---------- */

export interface UnitDef {
  id: string;
  label: string;
  /** factor relative to the base unit (linear units) */
  factor: number;
}

export function Units({
  units,
  def,
  defFrom,
  defTo,
  hint,
  convert,
  format = (n: number) => (Object.is(n, -0) ? "0" : String(Number(n.toPrecision(10)))),
}: {
  units: UnitDef[];
  def?: string;
  defFrom?: string;
  defTo?: string;
  hint?: string;
  /** override for non-linear conversions (temperature, sizes, …) */
  convert?: (value: number, from: string, to: string) => number | null;
  format?: (n: number) => string;
}) {
  const [amount, setAmount] = useState(def ?? "1");
  const [from, setFrom] = useState(defFrom ?? units[0]?.id ?? "");
  const [to, setTo] = useState(defTo ?? units[1]?.id ?? units[0]?.id ?? "");
  const [copied, copy] = useCopied();

  const result: { error: string } | { value: string } = useMemo(() => {
    const v = Number(String(amount).replace(/,/g, ""));
    if (!Number.isFinite(v)) return { error: "Enter a valid number." };
    if (convert) {
      const r = convert(v, from, to);
      if (r === null || !Number.isFinite(r)) return { error: "This conversion is not defined for the selected units." };
      return { value: format(r) };
    }
    const a = units.find((u) => u.id === from);
    const b = units.find((u) => u.id === to);
    if (!a || !b) return { error: "Select two units." };
    return { value: format((v * a.factor) / b.factor) };
  }, [amount, from, to, units, convert, format]);

  const fromLabel = units.find((u) => u.id === from)?.label ?? from;
  const toLabel = units.find((u) => u.id === to)?.label ?? to;
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_1fr]">
        <div>
          <FieldLabel htmlFor="kit-units-amount">Amount</FieldLabel>
          <Input id="kit-units-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="kit-units-from">From</FieldLabel>
          <select id="kit-units-from" value={from} onChange={(e) => setFrom(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)">
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.label}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="kit-units-to">To</FieldLabel>
          <select id="kit-units-to" value={to} onChange={(e) => setTo(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)">
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <Button type="button" variant="secondary" onClick={() => { setFrom(to); setTo(from); }}>
          Swap units
        </Button>
      </div>
      {"error" in result ? (
        <Err message={result.error} />
      ) : (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
          <p className="text-sm font-medium text-(--muted)">{amount || "0"} {fromLabel} =</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-(--foreground) tabular-nums">{result.value}</p>
          <p className="mt-1 text-sm font-semibold text-brand-700 dark:text-brand-300">{toLabel}</p>
          <div className="mt-3">
            <Button type="button" variant="ghost" onClick={() => copy(`${amount} ${fromLabel} = ${result.value} ${toLabel}`)}>
              {copied ? "Copied!" : "Copy result"}
            </Button>
          </div>
        </div>
      )}
      {hint && <Note>{hint}</Note>}
    </div>
  );
}

/* ---------- RefTable: searchable reference lookup ---------- */

export function RefTable({
  columns,
  rows,
  searchPlaceholder = "Type to filter…",
}: {
  columns: string[];
  rows: string[][];
  searchPlaceholder?: string;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => r.join(" ").toLowerCase().includes(t));
  }, [q, rows]);
  return (
    <div>
      <FieldLabel htmlFor="kit-reftable-q">Search</FieldLabel>
      <Input id="kit-reftable-q" value={q} placeholder={searchPlaceholder} onChange={(e) => setQ(e.target.value)} />
      <p role="status" className="mt-2 text-xs text-(--muted)">
        {filtered.length} of {rows.length} entries
      </p>
      <div className="mt-2 overflow-x-auto rounded-xl border border-(--border)">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="bg-(--surface-2)">
              {columns.map((c) => (
                <th key={c} scope="col" className="px-4 py-2.5 font-bold text-(--foreground)">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border)">
            {filtered.slice(0, 200).map((r, i) => (
              <tr key={i}>
                {r.map((cell, j) => (
                  <td key={j} className={j === 0 ? "px-4 py-2 font-semibold text-(--foreground)" : "px-4 py-2 text-(--muted)"}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <Note>No entries match your search.</Note>}
    </div>
  );
}

/* ---------- Checklist: interactive list builder/tracker ---------- */

export function Checklist({
  initial,
  addLabel = "Add item",
  placeholder = "New item…",
  persistKey,
  exportName = "toolora-list.txt",
}: {
  initial: string[];
  addLabel?: string;
  placeholder?: string;
  persistKey?: string;
  exportName?: string;
}) {
  const [items, setItems] = useState<{ text: string; done: boolean }[]>(() =>
    initial.map((text) => ({ text, done: false })),
  );
  const [draft, setDraft] = useState("");
  const [copied, copy] = useCopied();

  useEffect(() => {
    if (!persistKey) return;
    try {
      const raw = window.localStorage.getItem(persistKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { text: string; done: boolean }[];
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey]);

  useEffect(() => {
    if (!persistKey) return;
    try {
      window.localStorage.setItem(persistKey, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, persistKey]);

  const done = items.filter((i) => i.done).length;
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    setItems((p) => [...p, { text: t, done: false }]);
    setDraft("");
  };
  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          aria-label={placeholder}
        />
        <Button type="button" onClick={add}>{addLabel}</Button>
      </div>
      <p role="status" className="mt-3 text-sm font-semibold text-(--muted)">
        {done} of {items.length} done{items.length > 0 && ` (${Math.round((done / items.length) * 100)}%)`}
      </p>
      {items.length > 0 && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-(--surface-2)" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={items.length}>
          <div className="h-full bg-brand-600 transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
        </div>
      )}
      <ul className="mt-3 space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl border border-(--border) px-3 py-2">
            <input
              type="checkbox"
              checked={it.done}
              onChange={() => setItems((p) => p.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
              aria-label={`Mark “${it.text}” ${it.done ? "not done" : "done"}`}
              className="h-5 w-5 shrink-0 accent-indigo-600"
            />
            <span className={it.done ? "flex-1 text-[15px] text-(--muted) line-through" : "flex-1 text-[15px] text-(--foreground)"}>
              {it.text}
            </span>
            <button
              type="button"
              onClick={() => setItems((p) => p.filter((_, j) => j !== i))}
              aria-label={`Remove “${it.text}”`}
              className="grid h-9 w-9 place-items-center rounded-lg text-(--muted) hover:bg-(--surface-2)"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      {items.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            onClick={() => copy(items.map((x) => `${x.done ? "[x]" : "[ ]"} ${x.text}`).join("\n"))}
          >
            {copied ? "Copied!" : "Copy list"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => downloadTextFile(exportName, items.map((x) => `${x.done ? "[x]" : "[ ]"} ${x.text}`).join("\n"), "text/plain")}
          >
            Download
          </Button>
          <Button type="button" variant="ghost" onClick={() => setItems(initial.map((text) => ({ text, done: false })))}>
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------- Timer: stopwatch / countdown ---------- */

export function Timer({ mode, presets }: { mode: "stopwatch" | "countdown"; presets?: number[] }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [target, setTarget] = useState(presets?.[0] ?? 300);
  const [custom, setCustom] = useState("");
  const [done, setDone] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const started = Date.now() - elapsed * 1000;
    ref.current = window.setInterval(() => {
      const e = (Date.now() - started) / 1000;
      if (mode === "countdown" && e >= target) {
        setElapsed(target);
        setRunning(false);
        setDone(true);
        beep(880, 400);
        window.setTimeout(() => beep(880, 400), 500);
      } else setElapsed(e);
    }, 200);
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, target]);

  useEffect(() => () => {
    if (ref.current) window.clearInterval(ref.current);
  }, []);

  const show = mode === "countdown" ? Math.max(0, target - elapsed) : elapsed;
  const h = Math.floor(show / 3600);
  const m = Math.floor((show % 3600) / 60);
  const s = Math.floor(show % 60);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div>
      {mode === "countdown" && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex gap-2">
            {(presets ?? [60, 300, 600, 900]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setTarget(p);
                  setElapsed(0);
                  setDone(false);
                }}
                aria-pressed={target === p}
                className={
                  target === p
                    ? "min-h-[44px] rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white"
                    : "min-h-[44px] rounded-xl border border-(--border) px-4 text-sm font-semibold text-(--foreground)"
                }
              >
                {p >= 60 ? `${p / 60}m` : `${p}s`}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={custom}
              inputMode="numeric"
              placeholder="Seconds"
              aria-label="Custom seconds"
              onChange={(e) => setCustom(e.target.value)}
              className="max-w-[140px]"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const n = Number(custom);
                if (Number.isFinite(n) && n > 0 && n <= 86400) {
                  setTarget(Math.floor(n));
                  setElapsed(0);
                  setDone(false);
                  setCustom("");
                }
              }}
            >
              Set
            </Button>
          </div>
        </div>
      )}
      <div aria-live="polite" className="rounded-2xl bg-(--surface-2) px-5 py-6 text-center">
        <p className="text-5xl font-extrabold tracking-tight text-(--foreground) tabular-nums">
          {pad(h)}:{pad(m)}:{pad(s)}
        </p>
        {done && mode === "countdown" && (
          <p role="alert" className="mt-2 font-bold text-emerald-600">Time is up!</p>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={() => { setDone(false); setRunning((r) => !r); }}>
          {running ? "Pause" : elapsed > 0 ? "Resume" : "Start"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setRunning(false);
            setElapsed(0);
            setDone(false);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

/* ---------- FilePick: validated file input ---------- */

export interface PickedFile {
  file: File;
  url: string;
}

export function FilePick({
  accept,
  multiple,
  maxMB = 50,
  onFiles,
  label = "Choose file",
}: {
  accept: string;
  multiple?: boolean;
  maxMB?: number;
  onFiles: (files: File[]) => void;
  label?: string;
}) {
  const [error, setError] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (list: FileList | null) => {
    setError("");
    if (!list || list.length === 0) return;
    const files = [...list];
    const bad = files.find((f) => f.size > maxMB * 1024 * 1024);
    if (bad) {
      setError(`“${bad.name}” is larger than the ${maxMB} MB limit.`);
      return;
    }
    setNames(files.map((f) => f.name));
    onFiles(multiple ? files : [files[0] as File]);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        aria-label={label}
        onChange={(e) => handle(e.target.files)}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="button" onClick={() => inputRef.current?.click()}>
          {label}
        </Button>
        {names.length > 0 && (
          <p className="text-sm font-medium text-(--muted)" role="status">
            {names.length === 1 ? names[0] : `${names.length} files selected`}
          </p>
        )}
      </div>
      <Err message={error} />
    </div>
  );
}
