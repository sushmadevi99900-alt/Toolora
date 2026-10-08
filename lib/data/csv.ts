/* Small dependency-free CSV/TSV engine: parse, stringify, analyse, transform. */

export interface Table {
  headers: string[];
  rows: string[][];
}

export function detectDelimiter(text: string): "," | "\t" | ";" {
  const first = (text.split(/\r?\n/).find((l) => l.trim()) ?? "");
  const counts = {
    ",": (first.match(/,/g) ?? []).length,
    "\t": (first.match(/\t/g) ?? []).length,
    ";": (first.match(/;/g) ?? []).length,
  };
  if (counts["\t"] >= counts[","] && counts["\t"] >= counts[";"]) return "\t";
  if (counts[";"] > counts[","]) return ";";
  return ",";
}

export function parseDelimited(text: string, delimiter?: string): Table {
  const d = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === d) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch === "\r") {
      /* skip */
    } else cell += ch;
  }
  row.push(cell);
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (row.some((c) => c.trim() !== "")) nonEmpty.push(row);
  if (quoted) throw new Error("Unterminated quoted field — check your quotes.");
  if (nonEmpty.length === 0) throw new Error("No data rows found.");
  const width = Math.max(...nonEmpty.map((r) => r.length));
  const norm = nonEmpty.map((r) => [...r, ...Array(Math.max(0, width - r.length)).fill("")]);
  const [headers, ...body] = norm as [string[], ...string[][]];
  return { headers: headers as string[], rows: body };
}

export function stringifyDelimited(table: Table, delimiter = ","): string {
  const esc = (c: string) =>
    c.includes(delimiter) || c.includes('"') || c.includes("\n") ? `"${c.replace(/"/g, '""')}"` : c;
  return [table.headers, ...table.rows].map((r) => r.map(esc).join(delimiter)).join("\n");
}

export function tableStats(table: Table): { label: string; value: string }[] {
  const emptyCells = table.rows.flat().filter((c) => !c.trim()).length;
  return [
    { label: "Columns", value: String(table.headers.length) },
    { label: "Rows", value: String(table.rows.length) },
    { label: "Empty cells", value: String(emptyCells) },
  ];
}

export function transposeTable(table: Table): Table {
  const grid = [table.headers, ...table.rows];
  const cols = Math.max(...grid.map((r) => r.length));
  const out: string[][] = [];
  for (let c = 0; c < cols; c++) out.push(grid.map((r) => r[c] ?? ""));
  const [headers, ...rows] = out;
  return { headers: headers as string[], rows };
}

export function dedupeRows(table: Table): { table: Table; removed: number } {
  const seen = new Set<string>();
  const rows = table.rows.filter((r) => {
    const k = JSON.stringify(r);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { table: { headers: table.headers, rows }, removed: table.rows.length - rows.length };
}

export function filterRows(table: Table, query: string, column: number | null): Table {
  const q = query.toLowerCase();
  const rows = table.rows.filter((r) =>
    (column === null ? r.join("\u0000") : (r[column] ?? "")).toLowerCase().includes(q),
  );
  return { headers: table.headers, rows };
}

export function jsonToTable(json: unknown): Table {
  if (!Array.isArray(json) || json.length === 0 || typeof json[0] !== "object" || json[0] === null) {
    throw new Error("Need a JSON array of objects, e.g. [{\"a\":1},{\"a\":2}].");
  }
  const headers = [...new Set((json as Record<string, unknown>[]).flatMap((o) => Object.keys(o)))];
  if (headers.length === 0) throw new Error("Objects have no keys.");
  if (headers.length > 100) throw new Error("Too many columns (max 100).");
  const rows = (json as Record<string, unknown>[]).slice(0, 50000).map((o) =>
    headers.map((h) => {
      const v = o[h];
      return v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    }),
  );
  return { headers, rows };
}

export function tableToJson(table: Table): Record<string, string>[] {
  return table.rows.map((r) => Object.fromEntries(table.headers.map((h, i) => [h || `col${i + 1}`, r[i] ?? ""])));
}
