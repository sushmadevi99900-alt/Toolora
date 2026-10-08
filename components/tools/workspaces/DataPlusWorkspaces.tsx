"use client";

import { useState } from "react";
import { Button } from "../../ui/Button";
import { FieldLabel, Input, Textarea } from "../../ui/Input";
import { Calc, Err, FilePick, Note, TextOp, Units, asTool, useCopied } from "../kits/kits";
import {
  dedupeRows,
  filterRows,
  parseDelimited,
  stringifyDelimited,
  tableStats,
  transposeTable,
  type Table,
} from "@/lib/data/csv";
import { md5Hex } from "@/lib/engine/crypto";
import { downloadTextFile } from "@/lib/engine/formatters";

export const dataplusRegistry: Record<string, React.ComponentType> = {
  "csv-viewer": asTool(<CsvViewerTool />),
  "csv-cleaner": asTool(<CsvCleanerTool />),
  "csv-validator": asTool(<CsvValidatorTool />),
  "csv-column-extractor": asTool(<CsvColumnTool />),
  "csv-row-filter": asTool(<CsvFilterTool />),
  "csv-duplicate-remover": asTool(<CsvDedupeTool />),
  "csv-transpose": asTool(<CsvTransposeTool />),
  "tsv-viewer": asTool(<TsvViewerTool />),
  "json-viewer": asTool(<JsonViewerTool />),
  "json-key-extractor": asTool(<JsonKeysTool />),
  "json-value-extractor": asTool(<JsonValueTool />),
  "xml-viewer": asTool(<XmlViewerTool />),
  "log-file-analyzer": asTool(<LogAnalyzerTool />),
  "text-file-analyzer": asTool(<TextFileAnalyzerTool />),
  "file-hash-generator": asTool(<FileHashTool />),
  "md5-generator": asTool(<Md5Tool />),
  "sha1-generator": asTool(<ShaTool kind="SHA-1" />),
  "sha256-generator": asTool(<ShaTool kind="SHA-256" />),
  "sha512-generator": asTool(<ShaTool kind="SHA-512" />),
  "file-checksum-verifier": asTool(<ChecksumTool />),
  "file-type-detector": asTool(<FileTypeTool />),
  "file-extension-checker": asTool(<ExtCheckTool />),
  "mime-detector": asTool(<MimeTool />),
  "binary-file-inspector": asTool(<BinaryInspectorTool />),
  "hex-viewer": asTool(<HexViewerTool />),
  "file-size-converter": asTool(<FileSizeTool />),
  "filename-cleaner": asTool(<FilenameCleanerTool />),
};

/* ---------- CSV ---------- */

function CsvTable({ table, max = 100 }: { table: Table; max?: number }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-(--border)">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="bg-(--surface-2)">
            {table.headers.map((h, i) => (
              <th key={i} scope="col" className="px-3 py-2 font-bold">{h || `col${i + 1}`}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-(--border)">
          {table.rows.slice(0, max).map((r, i) => (
            <tr key={i}>
              {table.headers.map((_, j) => (
                <td key={j} className="max-w-[240px] truncate px-3 py-1.5 text-(--muted)">{r[j] ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CsvViewerTool() {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [table, setTable] = useState<Table | null>(null);

  const run = (t: string) => {
    setError("");
    try {
      if (!t.trim()) throw new Error("Paste CSV text or choose a file below.");
      setTable(parseDelimited(t));
    } catch (e) {
      setTable(null);
      setError(e instanceof Error ? e.message : "Parse failed.");
    }
  };

  const shown = table && q.trim()
    ? { headers: table.headers, rows: table.rows.filter((r) => r.join(" ").toLowerCase().includes(q.toLowerCase())).slice(0, 500) }
    : table;

  return (
    <div>
      <FieldLabel htmlFor="csv-in">CSV text</FieldLabel>
      <Textarea id="csv-in" value={text} placeholder="name,age&#10;ada,36" onChange={(e) => setText(e.target.value)} />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={() => run(text)}>View table</Button>
        <Button type="button" variant="secondary" onClick={() => { setText(""); setTable(null); setError(""); setQ(""); }}>Clear</Button>
      </div>
      <div className="mt-3">
        <FilePick accept=".csv,.tsv,.txt,text/csv" maxMB={20} onFiles={async (f) => {
          const t = await (f[0] as File).text();
          setText(t.slice(0, 500000));
          run(t.slice(0, 500000));
        }} label="Or choose a file" />
      </div>
      <Err message={error} />
      {shown && (
        <>
          <div className="mt-3">
            <FieldLabel htmlFor="csv-q">Filter rows</FieldLabel>
            <Input id="csv-q" value={q} placeholder="Type to filter…" onChange={(e) => setQ(e.target.value)} />
          </div>
          <p role="status" className="mt-2 text-xs text-(--muted)">
            {tableStats(table as Table).map((s) => `${s.label}: ${s.value}`).join(" · ")}
          </p>
          <CsvTable table={shown} />
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => downloadTextFile("table.csv", stringifyDelimited(shown), "text/csv")}>
              Download CSV
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function csvProcess(text: string, delim: string | undefined, fn: (t: Table) => { table: Table; extra?: [string, string][] }): { output: string; stats?: [string, string][] } {
  const parsed = parseDelimited(text, delim === "auto" ? undefined : (delim as "," | "\t" | ";"));
  const { table, extra } = fn(parsed);
  const stats = tableStats(table).map((s) => [s.label, s.value] as [string, string]);
  return { output: stringifyDelimited(table, delim === "\t" ? "\t" : ","), stats: extra ? [...stats, ...extra] : stats };
}

function CsvCleanerTool() {
  return (
    <TextOp
      placeholder="Paste messy CSV…"
      button="Clean"
      fileName="cleaned.csv"
      process={(t) => csvProcess(t, "auto", (p) => {
        const clean = {
          headers: p.headers.map((h) => h.trim()),
          rows: p.rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== "")),
        };
        const before = p.rows.length;
        return { table: clean, extra: [["Rows removed", String(before - clean.rows.length)]] as [string, string][] };
      })}
    />
  );
}

function CsvValidatorTool() {
  return (
    <TextOp
      placeholder="Paste CSV to validate…"
      button="Validate"
      process={(t) => {
        const issues: string[] = [];
        let table: Table;
        try {
          table = parseDelimited(t);
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Invalid CSV." };
        }
        const w = table.headers.length;
        table.rows.forEach((r, i) => {
          if (r.length !== w) issues.push(`Row ${i + 2}: ${r.length} cells, expected ${w}.`);
        });
        if (table.headers.some((h) => !h.trim())) issues.push("Empty header cell(s).");
        const dups = new Set<string>();
        const dupCols = table.headers.filter((h) => {
          if (dups.has(h)) return true;
          dups.add(h);
          return false;
        });
        if (dupCols.length > 0) issues.push(`Duplicate headers: ${dupCols.join(", ")}.`);
        const report = issues.length === 0
          ? `VALID — ${table.rows.length} rows × ${w} columns, consistent.`
          : `FOUND ${issues.length} issue(s):\n` + issues.slice(0, 30).join("\n");
        return { output: report, stats: [["Rows", String(table.rows.length)], ["Columns", String(w)], ["Issues", String(issues.length)]] };
      }}
    />
  );
}

function CsvColumnTool() {
  const [text, setText] = useState("");
  const [col, setCol] = useState("");
  const [error, setError] = useState("");
  const [out, setOut] = useState("");
  const [copied, copy] = useCopied();

  const run = () => {
    setError("");
    try {
      const t = parseDelimited(text);
      let idx = Number(col);
      if (!Number.isInteger(idx)) {
        idx = t.headers.findIndex((h) => h.toLowerCase() === col.trim().toLowerCase());
        if (idx < 0) throw new Error(`No column named “${col}”.`);
      } else if (idx < 0 || idx >= t.headers.length) throw new Error(`Column index 0–${t.headers.length - 1}.`);
      const lines = [(t.headers[idx] as string), ...t.rows.map((r) => r[idx] ?? "")];
      const csv = lines.map((c) => (c.includes(",") || c.includes('"') ? `"${c.replace(/"/g, '""')}"` : c)).join("\n");
      setOut(csv);
    } catch (e) {
      setOut("");
      setError(e instanceof Error ? e.message : "Extraction failed.");
    }
  };

  return (
    <div>
      <FieldLabel htmlFor="cc-in">CSV text</FieldLabel>
      <Textarea id="cc-in" value={text} placeholder="Paste CSV…" onChange={(e) => setText(e.target.value)} />
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="cc-col">Column name or 0-based index</FieldLabel>
          <Input id="cc-col" value={col} placeholder="e.g. email or 2" onChange={(e) => setCol(e.target.value)} />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={run}>Extract column</Button>
      </div>
      <Err message={error} />
      {out && (
        <>
          <div className="mt-3">
            <FieldLabel htmlFor="cc-out">Column values ({out.split("\n").length - 1} rows)</FieldLabel>
            <Textarea id="cc-out" value={out} readOnly />
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="secondary" onClick={() => copy(out)}>{copied ? "Copied!" : "Copy"}</Button>
            <Button type="button" variant="secondary" onClick={() => downloadTextFile("column.csv", out, "text/csv")}>Download</Button>
          </div>
        </>
      )}
    </div>
  );
}

function CsvFilterTool() {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [out, setOut] = useState<{ csv: string; kept: number; total: number } | null>(null);

  const run = () => {
    setError("");
    try {
      const t = parseDelimited(text);
      const f = filterRows(t, q.trim(), null);
      setOut({ csv: stringifyDelimited(f), kept: f.rows.length, total: t.rows.length });
    } catch (e) {
      setOut(null);
      setError(e instanceof Error ? e.message : "Filter failed.");
    }
  };

  return (
    <div>
      <FieldLabel htmlFor="cf-in">CSV text</FieldLabel>
      <Textarea id="cf-in" value={text} placeholder="Paste CSV…" onChange={(e) => setText(e.target.value)} />
      <div className="mt-3">
        <FieldLabel htmlFor="cf-q">Keep rows containing (case-insensitive)</FieldLabel>
        <Input id="cf-q" value={q} placeholder="e.g. pending" onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-3">
        <Button type="button" onClick={run}>Filter rows</Button>
      </div>
      <Err message={error} />
      {out && (
        <>
          <p role="status" className="mt-2 text-sm text-(--muted)">Kept {out.kept} of {out.total} rows.</p>
          <div className="mt-2">
            <FieldLabel htmlFor="cf-out">Filtered CSV</FieldLabel>
            <Textarea id="cf-out" value={out.csv} readOnly />
          </div>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => downloadTextFile("filtered.csv", out.csv, "text/csv")}>Download</Button>
          </div>
        </>
      )}
    </div>
  );
}

function CsvDedupeTool() {
  return (
    <TextOp
      placeholder="Paste CSV with duplicate rows…"
      button="Remove duplicates"
      fileName="deduped.csv"
      process={(t) => {
        const p = parseDelimited(t);
        const { table, removed } = dedupeRows(p);
        return { output: stringifyDelimited(table), stats: [["Rows kept", String(table.rows.length)], ["Removed", String(removed)]] };
      }}
    />
  );
}

function CsvTransposeTool() {
  return (
    <TextOp
      placeholder="Paste CSV to transpose…"
      button="Transpose"
      fileName="transposed.csv"
      process={(t) => {
        const p = parseDelimited(t);
        if (p.rows.length > 5000) return { error: "Too many rows to transpose safely (max 5,000)." };
        const table = transposeTable(p);
        return { output: stringifyDelimited(table), stats: [["New rows", String(table.rows.length)], ["New columns", String(table.headers.length)]] };
      }}
    />
  );
}

function TsvViewerTool() {
  return (
    <TextOp
      placeholder="Paste TSV (tab-separated)…"
      button="View as table"
      process={(t) => {
        const p = parseDelimited(t, "\t");
        const lines = [p.headers.join(" | "), ...p.rows.slice(0, 100).map((r) => r.join(" | "))];
        const more = p.rows.length > 100 ? `\n… and ${p.rows.length - 100} more rows (download not needed — copy above).` : "";
        return { output: lines.join("\n") + more, stats: [["Rows", String(p.rows.length)], ["Columns", String(p.headers.length)], ["Delimiter", "TAB"]] };
      }}
    />
  );
}

/* ---------- JSON / XML ---------- */

function depthOf(v: unknown, d = 0): number {
  if (d > 50) return d;
  if (Array.isArray(v)) return 1 + Math.max(0, ...v.map((x) => depthOf(x, d + 1)));
  if (v && typeof v === "object") {
    const vs = Object.values(v);
    return 1 + (vs.length ? Math.max(...vs.map((x) => depthOf(x, d + 1))) : 0);
  }
  return 1;
}

function JsonViewerTool() {
  return (
    <TextOp
      placeholder='Paste JSON, e.g. {"a":1}…'
      button="Pretty-print"
      fileName="pretty.json"
      process={(t) => {
        let v: unknown;
        try {
          v = JSON.parse(t);
        } catch {
          return { error: "Invalid JSON — check commas, quotes and brackets." };
        }
        const pretty = JSON.stringify(v, null, 2);
        const keys = Array.isArray(v) ? (v as unknown[]).length : v && typeof v === "object" ? Object.keys(v).length : 0;
        return {
          output: pretty,
          stats: [
            ["Top-level", Array.isArray(v) ? `array[${(v as unknown[]).length}]` : typeof v],
            ["Keys/items", String(keys)],
            ["Depth", String(depthOf(v))],
            ["Size", `${new Blob([pretty]).size.toLocaleString()} B`],
          ],
        };
      }}
    />
  );
}

function keyPaths(v: unknown, prefix = "", out: string[] = [], seen = new Set<unknown>()): string[] {
  if (out.length > 2000) return out;
  if (v && typeof v === "object") {
    if (seen.has(v)) return out;
    seen.add(v);
    if (Array.isArray(v)) {
      (v as unknown[]).forEach((x, i) => keyPaths(x, `${prefix}[${i}]`, out, seen));
    } else {
      for (const k of Object.keys(v)) keyPaths((v as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k, out, seen);
    }
  } else if (prefix) out.push(prefix);
  return out;
}

function JsonKeysTool() {
  return (
    <TextOp
      placeholder="Paste JSON to list every key path…"
      button="List keys"
      process={(t) => {
        let v: unknown;
        try {
          v = JSON.parse(t);
        } catch {
          return { error: "Invalid JSON." };
        }
        const paths = keyPaths(v);
        if (paths.length === 0) return { error: "No leaf values found." };
        return { output: paths.join("\n"), stats: [["Key paths", String(paths.length)]] };
      }}
    />
  );
}

function getPath(v: unknown, path: string): { found: boolean; value: unknown } {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let cur = v;
  for (const p of parts) {
    if (cur === null || cur === undefined) return { found: false, value: undefined };
    if (typeof cur !== "object") return { found: false, value: undefined };
    cur = (cur as Record<string, unknown>)[p];
  }
  return { found: cur !== undefined, value: cur };
}

function JsonValueTool() {
  const [json, setJson] = useState("");
  const [path, setPath] = useState("");
  const [error, setError] = useState("");
  const [out, setOut] = useState("");
  const [copied, copy] = useCopied();

  const run = () => {
    setError("");
    try {
      const v: unknown = JSON.parse(json);
      const r = getPath(v, path.trim());
      if (!r.found) throw new Error(`Path “${path}” not found.`);
      setOut(typeof r.value === "string" ? (r.value as string) : JSON.stringify(r.value, null, 2));
    } catch (e) {
      setOut("");
      setError(e instanceof Error ? e.message : "Lookup failed.");
    }
  };

  return (
    <div>
      <FieldLabel htmlFor="jv-json">JSON document</FieldLabel>
      <Textarea id="jv-json" value={json} placeholder='{"user":{"tags":["a","b"]}}' onChange={(e) => setJson(e.target.value)} />
      <div className="mt-3">
        <FieldLabel htmlFor="jv-path">Path (e.g. user.tags[0])</FieldLabel>
        <Input id="jv-path" value={path} placeholder="user.tags[0]" onChange={(e) => setPath(e.target.value)} />
      </div>
      <div className="mt-3">
        <Button type="button" onClick={run}>Get value</Button>
      </div>
      <Err message={error} />
      {out && (
        <>
          <div className="mt-3">
            <FieldLabel htmlFor="jv-out">Value</FieldLabel>
            <Textarea id="jv-out" value={out} readOnly />
          </div>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => copy(out)}>{copied ? "Copied!" : "Copy"}</Button>
          </div>
        </>
      )}
    </div>
  );
}

function prettyXml(xml: string): string {
  const parts = xml.replace(/>\s*</g, ">\n<").split("\n");
  let indent = 0;
  return parts
    .map((line) => {
      const t = line.trim();
      if (!t) return "";
      if (/^<\//.test(t)) indent = Math.max(0, indent - 1);
      const out = "  ".repeat(Math.min(indent, 20)) + t;
      if (/^<[^?!/][^>]*[^/]>$/.test(t)) indent++;
      return out;
    })
    .filter(Boolean)
    .join("\n");
}

function XmlViewerTool() {
  return (
    <TextOp
      placeholder="Paste XML…"
      button="Format & validate"
      fileName="formatted.xml"
      process={(t) => {
        let doc: Document;
        try {
          doc = new DOMParser().parseFromString(t, "application/xml");
        } catch {
          return { error: "XML could not be parsed." };
        }
        const err = doc.querySelector("parsererror");
        if (err) return { error: `Invalid XML: ${(err.textContent ?? "").slice(0, 220)}` };
        const pretty = prettyXml(t);
        const tags = new Set([...pretty.matchAll(/<([a-zA-Z][\w:.-]*)/g)].map((m) => m[1]));
        return {
          output: pretty,
          stats: [
            ["Root", doc.documentElement.tagName],
            ["Distinct tags", String(tags.size)],
            ["Size", `${new Blob([t]).size.toLocaleString()} B`],
          ],
        };
      }}
    />
  );
}

/* ---------- logs / text files ---------- */

function LogAnalyzerTool() {
  return (
    <TextOp
      placeholder="Paste log lines…"
      button="Analyze"
      process={(t) => {
        const lines = t.split("\n").filter((l) => l.trim());
        const counts: Record<string, number> = { ERROR: 0, WARN: 0, INFO: 0, DEBUG: 0, OTHER: 0 };
        const top = new Map<string, number>();
        for (const l of lines) {
          const u = l.toUpperCase();
          const lvl = /ERROR|FAIL|EXCEPTION/.test(u) ? "ERROR" : /WARN/.test(u) ? "WARN" : /INFO/.test(u) ? "INFO" : /DEBUG|TRACE/.test(u) ? "DEBUG" : "OTHER";
          counts[lvl] = (counts[lvl] ?? 0) + 1;
          if (lvl === "ERROR") {
            const key = l.trim().slice(0, 140);
            top.set(key, (top.get(key) ?? 0) + 1);
          }
        }
        const topLines = [...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([m, c]) => `(${c}×) ${m}`);
        const report = [
          `Lines: ${lines.length}`,
          ...Object.entries(counts).map(([k, v]) => `${k}: ${v}`),
          ...(topLines.length ? ["", "Top errors:", ...topLines] : []),
        ].join("\n");
        return {
          output: report,
          stats: [["Lines", String(lines.length)], ["Errors", String(counts.ERROR)], ["Warnings", String(counts.WARN)]],
        };
      }}
    />
  );
}

function TextFileAnalyzerTool() {
  return (
    <TextOp
      placeholder="Paste text to analyse…"
      button="Analyze"
      process={(t) => {
        const bytes = new Blob([t]).size;
        const words = t.trim() ? t.trim().split(/\s+/).length : 0;
        const lines = t.split("\n").length;
        const digits = (t.match(/\d/g) ?? []).length;
        const upper = (t.match(/[A-Z]/g) ?? []).length;
        const lower = (t.match(/[a-z]/g) ?? []).length;
        return {
          output: [
            `Characters: ${t.length.toLocaleString()} (${bytes.toLocaleString()} bytes UTF-8)`,
            `Words: ${words.toLocaleString()} · Lines: ${lines.toLocaleString()} · Non-empty lines: ${t.split("\n").filter((l) => l.trim()).length.toLocaleString()}`,
            `Digits: ${digits.toLocaleString()} · Uppercase: ${upper.toLocaleString()} · Lowercase: ${lower.toLocaleString()}`,
            `Avg word length: ${words ? (t.replace(/\s/g, "").length / words).toFixed(2) : "—"}`,
          ].join("\n"),
          stats: [["Chars", t.length.toLocaleString()], ["Words", words.toLocaleString()], ["Lines", lines.toLocaleString()], ["Bytes", bytes.toLocaleString()]],
        };
      }}
    />
  );
}

/* ---------- hashes ---------- */

async function digestHex(algo: string, data: Uint8Array): Promise<string> {
  const ab = await crypto.subtle.digest(algo, data as BufferSource);
  return [...new Uint8Array(ab)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function ShaTool({ kind }: { kind: "SHA-1" | "SHA-256" | "SHA-512" }) {
  const [input, setInput] = useState("");
  const [out, setOut] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [copied, copy] = useCopied();

  const run = async () => {
    setError("");
    if (!input) {
      setError("Enter text to hash.");
      return;
    }
    setWorking(true);
    try {
      setOut(await digestHex(kind, new TextEncoder().encode(input)));
    } catch {
      setOut("");
      setError("Hashing failed — WebCrypto may be unavailable.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <FieldLabel htmlFor="sha-in">Text</FieldLabel>
      <Textarea id="sha-in" value={input} placeholder="Text to hash…" onChange={(e) => setInput(e.target.value)} />
      <div className="mt-3">
        <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Hashing…" : `Generate ${kind}`}</Button>
      </div>
      <Err message={error} />
      {out && (
        <>
          <div className="mt-3">
            <FieldLabel htmlFor="sha-out">{kind} digest</FieldLabel>
            <Textarea id="sha-out" value={out} readOnly className="font-mono text-[13px]" />
          </div>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => copy(out)}>{copied ? "Copied!" : "Copy"}</Button>
          </div>
        </>
      )}
    </div>
  );
}

function Md5Tool() {
  return (
    <TextOp
      placeholder="Text to hash with MD5…"
      button="Generate MD5"
      process={(t) => ({ output: md5Hex(t) })}
    />
  );
}

function FileHashTool() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<[string, string][] | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [copied, copy] = useCopied();

  const run = async () => {
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setError("");
    setWorking(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const [s1, s256, s512] = await Promise.all([
        digestHex("SHA-1", buf),
        digestHex("SHA-256", buf),
        digestHex("SHA-512", buf),
      ]);
      setRows([["SHA-256", s256], ["SHA-1", s1], ["SHA-512", s512.slice(0, 64) + "…"]]);
    } catch {
      setRows(null);
      setError("Hashing failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <FilePick accept="*/*" maxMB={200} onFiles={(f) => { setFile(f[0] ?? null); setRows(null); }} label="Choose file" />
      <div className="mt-3">
        <Button type="button" onClick={() => void run()} disabled={working || !file}>{working ? "Hashing…" : "Hash file"}</Button>
      </div>
      <Err message={error} />
      {rows && (
        <>
          <dl className="mt-3 space-y-2">
            {rows.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-(--surface-2) px-4 py-2">
                <dt className="text-xs font-bold text-(--muted)">{k}</dt>
                <dd className="font-mono text-xs break-all text-(--foreground)">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => copy(rows.map(([k, v]) => `${k}: ${v}`).join("\n"))}>
              {copied ? "Copied!" : "Copy hashes"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ChecksumTool() {
  const [file, setFile] = useState<File | null>(null);
  const [expected, setExpected] = useState("");
  const [algo, setAlgo] = useState("SHA-256");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState<boolean | null>(null);
  const [working, setWorking] = useState(false);

  const run = async () => {
    if (!file) {
      setMsg("Choose a file first.");
      return;
    }
    const clean = expected.trim().toLowerCase().replace(/\s/g, "");
    if (!/^[0-9a-f]+$/.test(clean)) {
      setMsg("Enter the expected checksum in hex.");
      return;
    }
    setWorking(true);
    setMsg("");
    setOk(null);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const actual = await digestHex(algo, buf);
      const match = actual.toLowerCase() === clean;
      setOk(match);
      setMsg(match ? `MATCH — the file matches the expected ${algo} checksum.` : `MISMATCH — computed ${actual.slice(0, 32)}…`);
    } catch {
      setMsg("Verification failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <FilePick accept="*/*" maxMB={200} onFiles={(f) => { setFile(f[0] ?? null); setOk(null); }} label="Choose file" />
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="cs-algo">Algorithm</FieldLabel>
          <select id="cs-algo" value={algo} onChange={(e) => setAlgo(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px]">
            {["SHA-256", "SHA-1", "SHA-512"].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="cs-exp">Expected checksum (hex)</FieldLabel>
          <Input id="cs-exp" value={expected} placeholder="Paste expected hash…" onChange={(e) => setExpected(e.target.value)} className="font-mono text-[13px]" />
        </div>
      </div>
      <div className="mt-3">
        <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Checking…" : "Verify"}</Button>
      </div>
      {msg && (
        <p role={ok === false ? "alert" : "status"} className={ok ? "mt-3 font-bold text-emerald-600" : "mt-3 font-medium text-(--foreground)"}>
          {msg}
        </p>
      )}
    </div>
  );
}

/* ---------- file inspection ---------- */

const MAGIC: [Uint8Array, string, string][] = [
  [new Uint8Array([0x89, 0x50, 0x4e, 0x47]), "PNG image", "image/png"],
  [new Uint8Array([0xff, 0xd8, 0xff]), "JPEG image", "image/jpeg"],
  [new Uint8Array([0x47, 0x49, 0x46]), "GIF image", "image/gif"],
  [new Uint8Array([0x25, 0x50, 0x44, 0x46]), "PDF document", "application/pdf"],
  [new Uint8Array([0x50, 0x4b, 0x03, 0x04]), "ZIP archive", "application/zip"],
  [new Uint8Array([0x52, 0x49, 0x46, 0x46]), "RIFF container (WAV/AVI/WebP)", "audio/wav"],
  [new Uint8Array([0x66, 0x4c, 0x61, 0x43]), "FLAC audio", "audio/flac"],
  [new Uint8Array([0x49, 0x44, 0x33]), "MP3 audio (ID3)", "audio/mpeg"],
  [new Uint8Array([0x4f, 0x67, 0x67, 0x53]), "OGG container", "audio/ogg"],
  [new Uint8Array([0x7b]), "Likely JSON text", "application/json"],
  [new Uint8Array([0x3c, 0x3f, 0x78, 0x6d, 0x6c]), "XML document", "application/xml"],
  [new Uint8Array([0x25, 0x21, 0x50, 0x53]), "PostScript/EPS", "application/postscript"],
  [new Uint8Array([0x42, 0x4d]), "BMP image", "image/bmp"],
  [new Uint8Array([0x1f, 0x8b]), "GZIP data", "application/gzip"],
];

function detectMagic(bytes: Uint8Array): { label: string; mime: string } | null {
  for (const [sig, label, mime] of MAGIC) {
    let ok = true;
    for (let i = 0; i < sig.length; i++) {
      if (bytes[i] !== sig[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { label, mime };
  }
  return null;
}

function hexOf(bytes: Uint8Array, n = 32): string {
  return [...bytes.subarray(0, n)].map((b) => (b as number).toString(16).padStart(2, "0")).join(" ");
}

function FileTypeTool() {
  const [info, setInfo] = useState<[string, string][] | null>(null);
  const [error, setError] = useState("");

  const onFiles = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError("");
    try {
      const buf = new Uint8Array((await f.arrayBuffer()).slice(0, 64));
      const hit = detectMagic(buf);
      setInfo([
        ["File", f.name],
        ["Detected", hit ? hit.label : "Unknown binary/text"],
        ["MIME guess", hit ? hit.mime : (f.type || "unknown")],
        ["Header hex", hexOf(buf, 16)],
      ]);
    } catch {
      setInfo(null);
      setError("Could not read the file.");
    }
  };

  return (
    <div>
      <FilePick accept="*/*" maxMB={100} onFiles={(f) => void onFiles(f)} label="Choose file" />
      <Err message={error} />
      {info && (
        <dl className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)">
          {info.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <dt className="text-(--muted)">{k}</dt>
              <dd className="font-mono text-xs text-(--foreground)">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <Note>Detection reads magic bytes — the file's true format, not its extension.</Note>
    </div>
  );
}

function ExtCheckTool() {
  const [info, setInfo] = useState<string | null>(null);
  const [warnMsg, setWarnMsg] = useState("");

  const onFiles = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    const buf = new Uint8Array((await f.arrayBuffer()).slice(0, 32));
    const hit = detectMagic(buf);
    const ext = (f.name.split(".").pop() ?? "").toLowerCase();
    if (!hit) {
      setInfo(null);
      setWarnMsg(`“${f.name}”: type unknown — cannot verify .${ext}.`);
      return;
    }
    const mimeExt = (hit.mime.split("/")[1] ?? "").toLowerCase();
    const alias: Record<string, string[]> = {
      jpeg: ["jpg", "jpeg"], "x-wav": ["wav"], wav: ["wav"], mpeg: ["mp3"], zip: ["zip"],
      png: ["png"], gif: ["gif"], pdf: ["pdf"], json: ["json"], xml: ["xml", "svg"],
    };
    const okExts = alias[mimeExt] ?? [mimeExt];
    if (okExts.includes(ext)) {
      setInfo(`“${f.name}”: extension .${ext} matches detected ${hit.label}.`);
      setWarnMsg("");
    } else {
      setInfo(null);
      setWarnMsg(`“${f.name}”: extension .${ext} does NOT match detected ${hit.label} (expected ${okExts.map((e) => "." + e).join(" or ")}).`);
    }
  };

  return (
    <div>
      <FilePick accept="*/*" maxMB={100} onFiles={(f) => void onFiles(f)} label="Choose file" />
      {info && <p role="status" className="mt-3 font-semibold text-emerald-600">{info}</p>}
      {warnMsg && <p role="alert" className="mt-3 font-medium text-danger-600">{warnMsg}</p>}
    </div>
  );
}

function MimeTool() {
  const [mime, setMime] = useState<string | null>(null);

  return (
    <div>
      <FilePick accept="*/*" maxMB={100} onFiles={async (files) => {
        const f = files[0];
        if (!f) return;
        const buf = new Uint8Array((await f.arrayBuffer()).slice(0, 32));
        setMime(detectMagic(buf)?.mime ?? f.type ?? "application/octet-stream");
      }} label="Choose file" />
      {mime && (
        <div aria-live="polite" className="mt-3 rounded-xl bg-(--surface-2) px-4 py-3 font-mono text-sm">{mime}</div>
      )}
      <Note>From magic bytes first, falling back to the browser-provided type.</Note>
    </div>
  );
}

function BinaryInspectorTool() {
  const [rows, setRows] = useState<[string, string][] | null>(null);

  const onFiles = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    const buf = new Uint8Array((await f.arrayBuffer()).slice(0, 65536));
    const freq = new Array(256).fill(0);
    for (const b of buf) freq[b as number]++;
    let entropy = 0;
    for (const c of freq as number[]) {
      if (c === 0) continue;
      const p = c / buf.length;
      entropy -= p * Math.log2(p);
    }
    const printable = buf.filter((b) => (b as number) >= 32 && (b as number) <= 126).length;
    setRows([
      ["File", f.name],
      ["Size", `${f.size.toLocaleString()} bytes`],
      ["Header (32 B)", hexOf(buf, 32)],
      ["Entropy", `${entropy.toFixed(2)} bits/byte ${entropy > 7.5 ? "(likely compressed/encrypted)" : entropy < 4 ? "(likely plain text)" : ""}`],
      ["Printable share", `${((printable / Math.max(1, buf.length)) * 100).toFixed(1)}%`],
    ]);
  };

  return (
    <div>
      <FilePick accept="*/*" maxMB={100} onFiles={(f) => void onFiles(f)} label="Choose file" />
      {rows && (
        <dl className="mt-3 space-y-2">
          {rows.map(([k, v]) => (
            <div key={k} className="rounded-xl bg-(--surface-2) px-4 py-2">
              <dt className="text-xs font-bold text-(--muted)">{k}</dt>
              <dd className="font-mono text-xs break-all">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function HexViewerTool() {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [dump, setDump] = useState("");

  const show = (buf: Uint8Array) => {
    if (buf.length === 0) {
      setError("Nothing to show.");
      return;
    }
    if (buf.length > 65536) {
      setError("Showing the first 64 KB only.");
    }
    const view = buf.subarray(0, 65536);
    const lines: string[] = [];
    for (let i = 0; i < view.length; i += 16) {
      const chunk = view.subarray(i, i + 16);
      const hex = [...chunk].map((b) => (b as number).toString(16).padStart(2, "0")).join(" ").padEnd(47, " ");
      const asc = [...chunk].map((b) => ((b as number) >= 32 && (b as number) <= 126 ? String.fromCharCode(b as number) : ".")).join("");
      lines.push(`${i.toString(16).padStart(8, "0")}  ${hex}  |${asc}|`);
    }
    setDump(lines.join("\n"));
    if (buf.length <= 65536) setError("");
  };

  return (
    <div>
      <FieldLabel htmlFor="hex-in">Text</FieldLabel>
      <Textarea id="hex-in" value={text} placeholder="Or choose a file below…" onChange={(e) => setText(e.target.value)} />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={() => show(new TextEncoder().encode(text))}>Dump text</Button>
      </div>
      <div className="mt-3">
        <FilePick accept="*/*" maxMB={20} onFiles={async (f) => {
          const b = new Uint8Array(await (f[0] as File).arrayBuffer());
          show(b);
        }} label="Or choose a file" />
      </div>
      <Err message={error} />
      {dump && (
        <div className="mt-3">
          <FieldLabel htmlFor="hex-out">Hex dump</FieldLabel>
          <Textarea id="hex-out" value={dump} readOnly className="font-mono text-xs" />
        </div>
      )}
    </div>
  );
}

function FileSizeTool() {
  return (
    <Units
      units={[
        { id: "b", label: "Bytes (B)", factor: 1 },
        { id: "kb", label: "Kilobytes (KB)", factor: 1024 },
        { id: "mb", label: "Megabytes (MB)", factor: 1024 ** 2 },
        { id: "gb", label: "Gigabytes (GB)", factor: 1024 ** 3 },
        { id: "tb", label: "Terabytes (TB)", factor: 1024 ** 4 },
        { id: "kib", label: "Kibibytes (KiB)", factor: 1024 },
        { id: "mib", label: "Mebibytes (MiB)", factor: 1024 ** 2 },
      ]}
      defFrom="mb"
      defTo="kb"
      hint="Uses binary units (1 KB = 1024 B)."
    />
  );
}

function FilenameCleanerTool() {
  return (
    <TextOp
      placeholder={"My Vacation Photo (final)!!.JPG\nreport Q3 — draft.pdf"}
      button="Clean names"
      fileName="filenames.txt"
      process={(t) => {
        const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) return { error: "Enter one filename per line." };
        const clean = lines.map((name) => {
          const dot = name.lastIndexOf(".");
          const stem = dot > 0 ? name.slice(0, dot) : name;
          const ext = dot > 0 ? name.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, "") : "";
          const slug = stem
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 80) || "file";
          return slug + ext;
        });
        return { output: clean.join("\n"), stats: [["Names", String(clean.length)]] };
      }}
    />
  );
}
