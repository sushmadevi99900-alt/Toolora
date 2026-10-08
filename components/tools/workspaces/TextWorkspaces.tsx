"use client";

import { useMemo, useState } from "react";
import { Stat } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { FieldLabel, Input, Textarea } from "../../ui/Input";
import { copyText, downloadTextFile, formatInteger } from "@/lib/engine/formatters";
import { guardLargeInput } from "@/lib/engine/validation";

/* ---------- shared bits ---------- */

function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    if (!text) return;
    if (await copyText(text)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };
  return [copied, copy];
}

function OutputActions({ onCopy, onClear, onDownload, copied, disabled }: {
  onCopy: () => void; onClear: () => void; onDownload?: () => void; copied: boolean; disabled: boolean;
}) {
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <Button type="button" variant="secondary" onClick={onCopy} disabled={disabled}>
        {copied ? "Copied ✓" : "Copy result"}
      </Button>
      {onDownload && (
        <Button type="button" variant="secondary" onClick={onDownload} disabled={disabled}>
          Download .txt
        </Button>
      )}
      <Button type="button" variant="ghost" onClick={onClear} disabled={disabled}>
        Clear
      </Button>
    </div>
  );
}

function transformCase(text: string, mode: string): string {
  switch (mode) {
    case "upper": return text.toUpperCase();
    case "lower": return text.toLowerCase();
    case "title":
      return text.toLowerCase().replace(/(^|[\s\-–—(["'])([a-z])/g, (m, pre, ch) => pre + ch.toUpperCase());
    case "sentence":
      return text.toLowerCase().replace(/(^\s*[a-z])|([.!?…]\s*[a-z])/g, (m) => m.toUpperCase());
    case "capitalised":
      return text.toLowerCase().replace(/(^|\n)\s*[a-z]/g, (m) => m.toUpperCase());
    case "alternating": {
      let i = 0;
      return text.split("").map((ch) => (/[a-zA-Z]/.test(ch) ? (i++ % 2 === 0 ? ch.toLowerCase() : ch.toUpperCase()) : ch)).join("");
    }
    case "inverse":
      return text.split("").map((ch) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase())).join("");
    default: return text;
  }
}

const CASE_MODES = [
  { value: "upper", label: "UPPERCASE" },
  { value: "lower", label: "lowercase" },
  { value: "title", label: "Title Case" },
  { value: "sentence", label: "Sentence case" },
  { value: "capitalised", label: "Capitalised lines" },
  { value: "alternating", label: "aLtErNaTiNg" },
  { value: "inverse", label: "iNVERSE" },
];

/* ---------- Character Counter ---------- */

export function CharacterCounterTool() {
  const [text, setText] = useState("");
  const [copied, copy] = useCopy();
  const stats = useMemo(() => {
    const withSpaces = text.length;
    const withoutSpaces = text.replace(/\s/g, "").length;
    const words = text.trim() ? (text.trim().match(/\S+/g) ?? []).length : 0;
    const lines = text ? text.split("\n").length : 0;
    return { withSpaces, withoutSpaces, words, lines };
  }, [text]);
  const warn = guardLargeInput(text.length);
  const limits = [
    { label: "Tweet / X post", limit: 280, used: stats.withSpaces },
    { label: "Meta description", limit: 160, used: stats.withSpaces },
    { label: "SMS segment", limit: 160, used: stats.withSpaces },
  ];
  return (
    <div>
      <FieldLabel htmlFor="char-input">Your text</FieldLabel>
      <Textarea id="char-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type or paste text…" rows={7} />
      {!warn.ok && <p role="alert" className="mt-2 text-sm font-medium text-danger-600">{warn.error}</p>}
      <div aria-live="polite" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={formatInteger(stats.withSpaces)} label="With spaces" />
        <Stat value={formatInteger(stats.withoutSpaces)} label="No spaces" />
        <Stat value={formatInteger(stats.words)} label="Words" />
        <Stat value={formatInteger(stats.lines)} label="Lines" />
      </div>
      <ul className="mt-4 space-y-2">
        {limits.map((l) => {
          const left = l.limit - l.used;
          return (
            <li key={l.label} className="flex items-center justify-between rounded-xl bg-(--surface-2) px-4 py-2.5 text-sm">
              <span className="font-medium text-(--foreground)">{l.label} ({l.limit})</span>
              <span className={left < 0 ? "font-bold text-danger-600" : "font-semibold text-(--muted)"}>
                {left < 0 ? `${-left} over` : `${left} left`}
              </span>
            </li>
          );
        })}
      </ul>
      <OutputActions onCopy={() => copy(text)} onClear={() => setText("")} copied={copied} disabled={!text} />
    </div>
  );
}

/* ---------- Case Converter (all 7 case tools share this) ---------- */

export function CaseConverterTool({ defaultMode = "upper" }: { defaultMode?: string }) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState(defaultMode);
  const [copied, copy] = useCopy();
  const output = useMemo(() => transformCase(text, mode), [text, mode]);
  return (
    <div>
      <FieldLabel htmlFor="case-input">Your text</FieldLabel>
      <Textarea id="case-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste text to convert…" rows={7} />
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Case style">
        {CASE_MODES.map((m) => (
          <button key={m.value} type="button" onClick={() => setMode(m.value)} aria-pressed={mode === m.value}
            className={`min-h-[40px] rounded-full border px-4 text-sm font-semibold ${mode === m.value ? "border-brand-600 bg-brand-600 text-white" : "border-(--border) bg-(--surface) text-(--muted) hover:text-(--foreground)"}`}>
            {m.label}
          </button>
        ))}
      </div>
      <FieldLabel htmlFor="case-output">Result</FieldLabel>
      <Textarea id="case-output" value={output} readOnly placeholder="Result appears here…" rows={7} aria-live="polite" />
      <OutputActions onCopy={() => copy(output)} onClear={() => setText("")} onDownload={() => downloadTextFile("converted.txt", output)} copied={copied} disabled={!output} />
    </div>
  );
}

/* ---------- Line-based tools ---------- */

function LineToolShell({ id, label, placeholder, process, buttonLabel = "Copy result" }: {
  id: string; label: string; placeholder: string;
  process: (lines: string[], opts: { ignoreCase: boolean; ignoreBlank: boolean }) => { lines: string[]; note: string };
  buttonLabel?: string;
}) {
  const [text, setText] = useState("");
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [ignoreBlank, setIgnoreBlank] = useState(false);
  const [copied, copy] = useCopy();
  const result = useMemo(
    () => process(text ? text.split("\n") : [], { ignoreCase, ignoreBlank }),
    [text, ignoreCase, ignoreBlank, process],
  );
  const output = result.lines.join("\n");
  return (
    <div>
      <FieldLabel htmlFor={`${id}-input`}>{label}</FieldLabel>
      <Textarea id={`${id}-input`} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} rows={7} />
      <div className="mt-3 flex flex-wrap gap-4 text-sm font-medium text-(--foreground)">
        <label className="flex min-h-[44px] items-center gap-2">
          <input type="checkbox" checked={ignoreCase} onChange={(e) => setIgnoreCase(e.target.checked)} className="h-5 w-5 accent-brand-600" />
          Ignore case
        </label>
        <label className="flex min-h-[44px] items-center gap-2">
          <input type="checkbox" checked={ignoreBlank} onChange={(e) => setIgnoreBlank(e.target.checked)} className="h-5 w-5 accent-brand-600" />
          Ignore blank lines
        </label>
      </div>
      {result.note && <p role="status" aria-live="polite" className="mt-2 text-sm text-(--muted)">{result.note}</p>}
      <FieldLabel htmlFor={`${id}-output`}>Result</FieldLabel>
      <Textarea id={`${id}-output`} value={output} readOnly rows={7} aria-live="polite" placeholder="Result appears here…" />
      <OutputActions onCopy={() => copy(output)} onClear={() => setText("")} onDownload={() => downloadTextFile(`${id}.txt`, output)} copied={copied} disabled={!output} />
      <span className="sr-only">{buttonLabel}</span>
    </div>
  );
}

export function RemoveDuplicateLinesTool() {
  return (
    <LineToolShell id="dedupe" label="Your list (one item per line)" placeholder={"apple\nbanana\napple\nApple"}
      process={(lines, opts) => {
        const seen = new Set<string>();
        const out: string[] = [];
        let removed = 0;
        for (const line of lines) {
          if (opts.ignoreBlank && !line.trim()) { removed += 1; continue; }
          const key = opts.ignoreCase ? line.trim().toLowerCase() : line;
          if (seen.has(key)) { removed += 1; continue; }
          seen.add(key);
          out.push(line);
        }
        return { lines: out, note: lines.length ? `Removed ${removed} duplicate line${removed === 1 ? "" : "s"} — ${out.length} kept.` : "" };
      }} />
  );
}

export function RemoveExtraSpacesTool() {
  const [text, setText] = useState("");
  const [copied, copy] = useCopy();
  const output = useMemo(
    () => text.split("\n").map((l) => l.replace(/[ \t]+/g, " ").trimEnd()).join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    [text],
  );
  return (
    <div>
      <FieldLabel htmlFor="spaces-input">Messy text</FieldLabel>
      <Textarea id="spaces-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste text with  double   spaces…" rows={7} />
      <FieldLabel htmlFor="spaces-output">Cleaned text</FieldLabel>
      <Textarea id="spaces-output" value={output} readOnly rows={7} aria-live="polite" placeholder="Cleaned text appears here…" />
      <OutputActions onCopy={() => copy(output)} onClear={() => setText("")} onDownload={() => downloadTextFile("cleaned.txt", output)} copied={copied} disabled={!output} />
    </div>
  );
}

export function TextSorterTool() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("az");
  const [dedupe, setDedupe] = useState(false);
  const [copied, copy] = useCopy();
  const output = useMemo(() => {
    let lines = text ? text.split("\n") : [];
    if (dedupe) lines = [...new Set(lines)];
    const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
    const sorted = [...lines];
    if (mode === "az") sorted.sort(collator.compare);
    else if (mode === "za") sorted.sort((a, b) => collator.compare(b, a));
    else if (mode === "len") sorted.sort((a, b) => a.length - b.length);
    else if (mode === "len-desc") sorted.sort((a, b) => b.length - a.length);
    else if (mode === "num") sorted.sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
    return sorted.join("\n");
  }, [text, mode, dedupe]);
  return (
    <div>
      <FieldLabel htmlFor="sort-input">Lines to sort</FieldLabel>
      <Textarea id="sort-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={"banana\napple\ncherry"} rows={7} />
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Sort mode">
        {[["az", "A–Z"], ["za", "Z–A"], ["num", "Numeric"], ["len", "Shortest first"], ["len-desc", "Longest first"]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setMode(v)} aria-pressed={mode === v}
            className={`min-h-[40px] rounded-full border px-4 text-sm font-semibold ${mode === v ? "border-brand-600 bg-brand-600 text-white" : "border-(--border) text-(--muted) hover:text-(--foreground)"}`}>{l}</button>
        ))}
      </div>
      <label className="mt-3 flex min-h-[44px] items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} className="h-5 w-5 accent-brand-600" />
        Remove duplicates while sorting
      </label>
      <FieldLabel htmlFor="sort-output">Sorted result</FieldLabel>
      <Textarea id="sort-output" value={output} readOnly rows={7} aria-live="polite" />
      <OutputActions onCopy={() => copy(output)} onClear={() => setText("")} onDownload={() => downloadTextFile("sorted.txt", output)} copied={copied} disabled={!output} />
    </div>
  );
}

export function TextReverserTool({ defaultMode = "chars" }: { defaultMode?: string }) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState(defaultMode);
  const [copied, copy] = useCopy();
  const output = useMemo(() => {
    if (!text) return "";
    if (mode === "words") return text.split(/(\s+)/).reverse().join("");
    if (mode === "lines") return text.split("\n").reverse().join("\n");
    return [...text].reverse().join("");
  }, [text, mode]);
  return (
    <div>
      <FieldLabel htmlFor="rev-input">Your text</FieldLabel>
      <Textarea id="rev-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Hello world" rows={6} />
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Reverse mode">
        {[["chars", "Characters"], ["words", "Words"], ["lines", "Lines"]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setMode(v)} aria-pressed={mode === v}
            className={`min-h-[40px] rounded-full border px-4 text-sm font-semibold ${mode === v ? "border-brand-600 bg-brand-600 text-white" : "border-(--border) text-(--muted) hover:text-(--foreground)"}`}>{l}</button>
        ))}
      </div>
      <FieldLabel htmlFor="rev-output">Reversed</FieldLabel>
      <Textarea id="rev-output" value={output} readOnly rows={6} aria-live="polite" />
      <OutputActions onCopy={() => copy(output)} onClear={() => setText("")} copied={copied} disabled={!output} />
    </div>
  );
}

export function LineCounterTool() {
  const [text, setText] = useState("");
  const [copied, copy] = useCopy();
  const stats = useMemo(() => {
    if (!text) return { total: 0, nonEmpty: 0, avg: "—", longest: "—", longestLen: 0 };
    const lines = text.split("\n");
    const nonEmpty = lines.filter((l) => l.trim()).length;
    const lens = lines.map((l) => l.length);
    const avg = (lens.reduce((a, b) => a + b, 0) / lines.length).toFixed(1);
    const longestLen = Math.max(...lens);
    const longest = lines.find((l) => l.length === longestLen) ?? "";
    return { total: lines.length, nonEmpty, avg, longest: longest.slice(0, 80), longestLen };
  }, [text]);
  return (
    <div>
      <FieldLabel htmlFor="line-input">Your text</FieldLabel>
      <Textarea id="line-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste code, CSV or a list…" rows={7} />
      <div aria-live="polite" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={formatInteger(stats.total)} label="Total lines" />
        <Stat value={formatInteger(stats.nonEmpty)} label="Non-empty" />
        <Stat value={String(stats.avg)} label="Avg length" />
        <Stat value={formatInteger(stats.longestLen)} label="Longest" />
      </div>
      {stats.longest && <p className="mt-3 truncate text-sm text-(--muted)">Longest line: <span className="font-mono">{stats.longest}</span></p>}
      <OutputActions onCopy={() => copy(text)} onClear={() => setText("")} copied={copied} disabled={!text} />
    </div>
  );
}

export function ReadingTimeTool() {
  const [text, setText] = useState("");
  const stats = useMemo(() => {
    const words = text.trim() ? (text.trim().match(/\S+/g) ?? []).length : 0;
    const at = (wpm: number) => {
      if (!words) return "—";
      const s = Math.round((words / wpm) * 60);
      if (s < 60) return `${Math.max(s, 1)}s`;
      const m = Math.floor(s / 60);
      const r = s % 60;
      return r ? `${m} min ${r}s` : `${m} min`;
    };
    return { words, slow: at(150), avg: at(200), fast: at(250), speak: at(130) };
  }, [text]);
  return (
    <div>
      <FieldLabel htmlFor="read-input">Your text</FieldLabel>
      <Textarea id="read-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste an article, script or essay…" rows={8} />
      <div aria-live="polite" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat value={formatInteger(stats.words)} label="Words" />
        <Stat value={stats.slow} label="Slow (150wpm)" />
        <Stat value={stats.avg} label="Average (200)" />
        <Stat value={stats.fast} label="Fast (250)" />
        <Stat value={stats.speak} label="Speaking" />
      </div>
    </div>
  );
}

const LOREM = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

export function LoremIpsumTool() {
  const [kind, setKind] = useState<"paragraphs" | "sentences" | "words">("paragraphs");
  const [count, setCount] = useState("3");
  const [copied, copy] = useCopy();
  const output = useMemo(() => {
    const n = Math.max(1, Math.min(100, Number(count) || 3));
    const sentences = LOREM.split(". ").map((s) => s.trim().replace(/\.$/, "") + ".");
    const words = LOREM.replace(/\./g, "").split(" ");
    if (kind === "words") {
      const out: string[] = [];
      for (let i = 0; i < n; i++) out.push(words[i % words.length]);
      return out.join(" ");
    }
    if (kind === "sentences") {
      const out: string[] = [];
      for (let i = 0; i < n; i++) out.push(sentences[i % sentences.length]);
      return out.join(" ");
    }
    return Array.from({ length: n }, (_, p) => {
      const rot = p % sentences.length;
      return [...sentences.slice(rot), ...sentences.slice(0, rot)].join(" ");
    }).join("\n\n");
  }, [kind, count]);
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="lorem-kind">Type</FieldLabel>
          <select id="lorem-kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}
            className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px]">
            <option value="paragraphs">Paragraphs</option>
            <option value="sentences">Sentences</option>
            <option value="words">Words</option>
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="lorem-count">Count (1–100)</FieldLabel>
          <Input id="lorem-count" type="number" min={1} max={100} value={count} onChange={(e) => setCount(e.target.value)} />
        </div>
      </div>
      <FieldLabel htmlFor="lorem-output">Placeholder text</FieldLabel>
      <Textarea id="lorem-output" value={output} readOnly rows={8} aria-live="polite" />
      <OutputActions onCopy={() => copy(output)} onClear={() => setCount("3")} onDownload={() => downloadTextFile("lorem.txt", output)} copied={copied} disabled={!output} />
    </div>
  );
}

/* ---------- Text cleaner ---------- */

export function TextCleanerTool() {
  const [text, setText] = useState("");
  const [opts, setOpts] = useState({
    trimLines: true,
    collapseSpaces: true,
    removeEmpty: true,
    dedupeLines: false,
    smartQuotes: true,
    stripZeroWidth: true,
  });
  const [copied, copy] = useCopy();

  const output = useMemo(() => {
    if (!text) return "";
    let lines = text.replace(/\r\n/g, "\n").split("\n");
    if (opts.stripZeroWidth) lines = lines.map((l) => l.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""));
    if (opts.smartQuotes) {
      lines = lines.map((l) =>
        l
          .replace(/[“”]/g, '"')
          .replace(/[‘’]/g, "'")
          .replace(/—/g, "--")
          .replace(/…/g, "..."),
      );
    }
    if (opts.trimLines) lines = lines.map((l) => l.trim());
    if (opts.collapseSpaces) lines = lines.map((l) => l.replace(/[ \t]+/g, " "));
    if (opts.removeEmpty) lines = lines.filter((l) => l.length > 0);
    if (opts.dedupeLines) {
      const seen = new Set<string>();
      lines = lines.filter((l) => (seen.has(l) ? false : (seen.add(l), true)));
    }
    return lines.join("\n");
  }, [text, opts]);

  const removed = text.split("\n").length - (output ? output.split("\n").length : 0);
  const toggle = (k: keyof typeof opts) => setOpts((o) => ({ ...o, [k]: !o[k] }));

  const LABELS: [keyof typeof opts, string][] = [
    ["trimLines", "Trim each line"],
    ["collapseSpaces", "Collapse multiple spaces"],
    ["removeEmpty", "Remove empty lines"],
    ["dedupeLines", "Remove duplicate lines"],
    ["smartQuotes", "Normalise smart quotes"],
    ["stripZeroWidth", "Strip invisible characters"],
  ];

  return (
    <div>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {LABELS.map(([k, label]) => (
          <label key={k} className="flex min-h-[44px] items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={opts[k]} onChange={() => toggle(k)} className="h-5 w-5 accent-brand-600" /> {label}
          </label>
        ))}
      </div>
      <div className="mt-3">
        <FieldLabel htmlFor="cleaner-input">Messy text</FieldLabel>
        <Textarea id="cleaner-input" value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Paste text that needs cleaning…" />
      </div>
      <div className="mt-3">
        <FieldLabel htmlFor="cleaner-output">Cleaned text</FieldLabel>
        <Textarea id="cleaner-output" value={output} readOnly rows={8} aria-live="polite" placeholder="Clean result appears here…" />
        {output && (
          <p className="mt-1 text-sm text-(--muted)">
            {formatInteger(output.length)} chars · {output.split("\n").length} lines
            {removed > 0 && ` · ${removed} line${removed === 1 ? "" : "s"} removed`}
          </p>
        )}
      </div>
      <OutputActions onCopy={() => copy(output)} onClear={() => setText("")} onDownload={() => downloadTextFile("cleaned.txt", output)} copied={copied} disabled={!output} />
    </div>
  );
}
