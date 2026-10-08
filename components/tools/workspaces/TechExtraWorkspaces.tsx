"use client";

import { Calc, Gen, RefTable, TextOp } from "../kits/kits";
import { parseDelimited, stringifyDelimited } from "@/lib/data/csv";

export const techextraRegistry: Record<string, React.ComponentType> = {
  "paragraph-counter": ParagraphCounterTool,
  "find-and-replace": FindReplaceTool,
  "text-diff-checker": TextDiffTool,
  "text-to-ascii": TextToAsciiTool,
  "ascii-to-text": AsciiToTextTool,
  "rot13-encoder": Rot13EncoderTool,
  "rot13-decoder": Rot13DecoderTool,
  "html-entity-encoder": HtmlEntityEncoderTool,
  "html-entity-decoder": HtmlEntityDecoderTool,
  "unicode-escape-encoder": UnicodeEscapeEncoderTool,
  "unicode-escape-decoder": UnicodeEscapeDecoderTool,
  "text-to-binary": TextToBinaryTool,
  "binary-to-text": BinaryToTextTool,
  "text-to-hex": TextToHexTool,
  "hex-to-text": HexToTextTool,
  "text-to-decimal": TextToDecimalTool,
  "decimal-to-text": DecimalToTextTool,
  "morse-code-encoder": MorseEncoderTool,
  "morse-code-decoder": MorseDecoderTool,
  "camelcase-converter": CamelCaseTool,
  "pascalcase-converter": PascalCaseTool,
  "snakecase-converter": SnakeCaseTool,
  "kebabcase-converter": KebabCaseTool,
  "constantcase-converter": ConstantCaseTool,
  "remove-empty-lines": RemoveEmptyLinesTool,
  "reverse-lines": ReverseLinesTool,
  "alphabetize-text": AlphabetizeTool,
  "whitespace-cleaner": WhitespaceCleanerTool,
  "text-deduplicator": TextDeduplicatorTool,
  "xml-formatter": XmlFormatterTool,
  "xml-minifier": XmlMinifierTool,
  "csv-formatter": CsvFormatterTool,
  "markdown-formatter": MarkdownFormatterTool,
  "sql-formatter": SqlFormatterTool,
  "slug-generator-pro": SlugProTool,
  "password-strength": PasswordStrengthTool,
  "sentence-case-pro": SentenceCaseProTool,
  "email-extractor": EmailExtractorTool,
  "url-extractor": UrlExtractorTool,
  "html-tag-stripper": HtmlTagStripperTool,
  "line-number-adder": LineNumberAdderTool,
  "text-truncator": TextTruncatorTool,
  "word-frequency-counter": WordFrequencyTool,
  "tab-to-spaces-converter": TabToSpacesTool,
  "json-path-tester": JsonPathTool,
  "xml-validator": XmlValidatorTool,
  "xml-to-json": XmlToJsonTool,
  "json-to-xml": JsonToXmlTool,
  "tsv-to-csv": TsvToCsvTool,
  "csv-to-tsv": CsvToTsvTool,
  "jwt-header-viewer": JwtHeaderTool,
  "jwt-payload-viewer": JwtPayloadTool,
  "uuid-validator": UuidValidatorTool,
  "uuid-version-detector": UuidVersionTool,
  "regex-generator": RegexGeneratorTool,
  "regex-escape-tool": RegexEscapeTool,
  "regex-replace-tester": RegexReplaceTool,
  "http-header-parser": HttpHeaderParserTool,
  "url-parser": UrlParserTool,
  "url-query-parser": UrlQueryParserTool,
  "url-builder": UrlBuilderTool,
  "query-string-generator": QueryStringTool,
  "html-entity-lookup": HtmlEntityLookupTool,
  "unicode-inspector": UnicodeInspectorTool,
  "charcode-inspector": CharcodeInspectorTool,
  "color-code-converter": ColorConverterTool,
  "css-beautifier": CssBeautifierTool,
  "js-beautifier": JsBeautifierTool,
  "sql-minifier": SqlMinifierTool,
  "markdown-to-html": MarkdownToHtmlTool,
  "cron-explainer": CronExplainerTool,
  "semver-comparator": SemverComparatorTool,
  "chmod-permission-calculator": ChmodTool,
  "json-key-sorter": JsonKeySorterTool,
  "json-diff-checker": JsonDiffTool,
  "dotenv-formatter": DotenvFormatterTool,
  "gitignore-generator": GitignoreTool,
  "ascii-table-lookup": AsciiTableTool,
  "port-reference-lookup": PortLookupTool,
  "base64url-encoder": Base64UrlEncoderTool,
  "base64url-decoder": Base64UrlDecoderTool,
  "jwt-expiry-checker": JwtExpiryTool,
  "css-unit-converter": CssUnitConverterTool,
  "curl-command-builder": CurlBuilderTool,
  "fetch-snippet-generator": FetchSnippetTool,
  "webhook-payload-formatter": WebhookPayloadTool,
};

/* ================= shared pure helpers ================= */

const te = new TextEncoder();
const td = new TextDecoder();

function rot13(s: string): string {
  return s.replace(/[A-Za-z]/g, (c) => {
    const b = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - b + 13) % 26) + b);
  });
}

function countWords(s: string): number {
  const m = s.trim().match(/[A-Za-z0-9'’-]+/g);
  return m ? m.length : 0;
}

const HTML_NAMES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  nbsp: " ", copy: "©", reg: "®", trade: "™", euro: "€",
  pound: "£", yen: "¥", cent: "¢", sect: "§", hellip: "…",
  mdash: "—", ndash: "–", lsquo: "‘", rsquo: "’", ldquo: "“",
  rdquo: "”", bull: "•", middot: "·", times: "×", divide: "÷",
  plusmn: "±", para: "¶", deg: "°", frac12: "½", frac14: "¼",
  laquo: "«", raquo: "»", iexcl: "¡", iquest: "¿",
};

function htmlEncode(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/[^\x20-\x7E]/g, (c) => `&#${c.codePointAt(0)};`);
}

function htmlDecode(s: string): string {
  if (!s.includes("&")) return s;
  return s.replace(/&(#\d+|#[xX][0-9A-Fa-f]+|[A-Za-z][A-Za-z0-9]+);/g, (m, body: string) => {
    if (body.charAt(0) === "#") {
      const hex = body.charAt(1) === "x" || body.charAt(1) === "X";
      const cp = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return m;
      try {
        return String.fromCodePoint(cp);
      } catch {
        return m;
      }
    }
    return HTML_NAMES[body] ?? m;
  });
}

function unicodeEscapeEncode(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    out += "\\u" + s.charCodeAt(i).toString(16).padStart(4, "0");
  }
  return out;
}

function unicodeEscapeDecode(s: string): string {
  if (!/\\u[0-9A-Fa-f]{4}/.test(s)) throw new Error("No \\uXXXX escapes found.");
  const bad = s.match(/\\u(?![0-9A-Fa-f]{4})/);
  if (bad) throw new Error("Malformed escape: \\u must be followed by exactly 4 hex digits.");
  return s.replace(/\\u([0-9A-Fa-f]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}

const MORSE: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....",
  I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.",
  Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--..", "0": "-----", "1": ".----", "2": "..---", "3": "...--",
  "4": "....-", "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "!": "-.-.--", "/": "-..-.",
  ":": "---...", "-": "-....-", "@": ".--.-.",
};
const MORSE_REV: Record<string, string> = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

function splitWords(s: string): string[] {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w.length > 0);
}

function cap(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function diffLines(a: string[], b: string[]): string[] {
  const n = a.length;
  const m = b.length;
  if (n * m > 400000) {
    const out: string[] = [];
    const L = Math.max(n, m);
    for (let i = 0; i < L; i++) {
      const x = a[i];
      const y = b[i];
      if (x === y) {
        if (x !== undefined) out.push("  " + x);
      } else {
        if (x !== undefined) out.push("- " + x);
        if (y !== undefined) out.push("+ " + y);
      }
    }
    return out;
  }
  const dp = new Uint32Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * (m + 1) + j] =
        a[i] === b[j]
          ? dp[(i + 1) * (m + 1) + j + 1] + 1
          : Math.max(dp[(i + 1) * (m + 1) + j], dp[i * (m + 1) + j + 1]);
    }
  }
  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push("  " + a[i]);
      i++;
      j++;
    } else if (dp[(i + 1) * (m + 1) + j] >= dp[i * (m + 1) + j + 1]) {
      out.push("- " + a[i]);
      i++;
    } else {
      out.push("+ " + b[j]);
      j++;
    }
  }
  while (i < n) out.push("- " + a[i++]);
  while (j < m) out.push("+ " + b[j++]);
  return out;
}

/* ---------- XML ---------- */

function parseXmlOrThrow(s: string): Document {
  const doc = new DOMParser().parseFromString(s, "application/xml");
  const errs = doc.getElementsByTagName("parsererror");
  if (errs.length > 0) {
    throw new Error("Invalid XML: " + (errs[0]?.textContent ?? "parse error").replace(/\s+/g, " ").slice(0, 180));
  }
  return doc;
}

function xmlTokens(s: string): string[] {
  const m = s.match(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]+>|[^<]+/g);
  return m ?? [];
}

function formatXml(s: string): string {
  parseXmlOrThrow(s);
  const toks = xmlTokens(s)
    .map((t) => t.trim())
    .filter((t) => t !== "");
  let depth = 0;
  const out: string[] = [];
  for (const t of toks) {
    if (/^<\//.test(t)) {
      depth = Math.max(0, depth - 1);
      out.push("  ".repeat(depth) + t);
    } else if (/^<[^!?/]/.test(t) && !/\/>$/.test(t)) {
      out.push("  ".repeat(depth) + t);
      depth++;
    } else {
      out.push("  ".repeat(depth) + t);
    }
  }
  return out.join("\n");
}

function minifyXml(s: string): string {
  parseXmlOrThrow(s);
  return s
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .trim();
}

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function safeTag(t: string): string {
  return /^[A-Za-z_][\w.-]*$/.test(t) ? t : "field";
}

function xmlNodeToJson(node: Element): unknown {
  const obj: Record<string, unknown> = {};
  for (const a of Array.from(node.attributes)) obj["@" + a.name] = a.value;
  const kids = Array.from(node.childNodes);
  const elems = kids.filter((k) => k.nodeType === 1) as Element[];
  const text = kids
    .filter((k) => k.nodeType === 3 || k.nodeType === 4)
    .map((k) => k.nodeValue ?? "")
    .join("")
    .trim();
  if (elems.length === 0) {
    if (Object.keys(obj).length === 0) return text;
    if (text) obj["#text"] = text;
    return obj;
  }
  for (const el of elems) {
    const v = xmlNodeToJson(el);
    const t = el.tagName;
    const cur = obj[t];
    if (cur === undefined) obj[t] = v;
    else if (Array.isArray(cur)) cur.push(v);
    else obj[t] = [cur, v];
  }
  if (text) obj["#text"] = text;
  return obj;
}

function valToXml(v: unknown, tag: string): string {
  if (v === null || v === undefined) return `<${tag}/>`;
  if (Array.isArray(v)) return v.map((i) => valToXml(i, tag)).join("");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const attrs = Object.entries(o)
      .filter(([k]) => k.startsWith("@"))
      .map(([k, val]) => ` ${k.slice(1)}="${escXml(String(val))}"`)
      .join("");
    const inner = Object.entries(o)
      .filter(([k]) => !k.startsWith("@"))
      .map(([k, val]) => (k === "#text" ? escXml(String(val)) : valToXml(val, safeTag(k))))
      .join("");
    return `<${tag}${attrs}>${inner}</${tag}>`;
  }
  return `<${tag}>${escXml(String(v))}</${tag}>`;
}

/* ---------- JSONPath subset ---------- */

function jsonPathQuery(root: unknown, path: string): unknown {
  const p = path.trim();
  if (!p.startsWith("$")) throw new Error('Path must start with "$" (subset: $.a.b[0], $["a"], $[0]).');
  let cur = root;
  let i = 1;
  const s = p;
  const skip = () => {
    while (s[i] === " " || s[i] === "\t") i++;
  };
  skip();
  if (i >= s.length) return cur;
  for (;;) {
    skip();
    if (i >= s.length) break;
    const sub = s.slice(i);
    let m =
      /^\.([A-Za-z_$][\w$]*)/.exec(sub) ??
      /^\["((?:[^"\\]|\\.)*)"\]/.exec(sub) ??
      /^\['((?:[^'\\]|\\.)*)'\]/.exec(sub) ??
      /^\[(\d+)\]/.exec(sub);
    if (!m) throw new Error(`Cannot parse near "${sub.slice(0, 14)}" — supported: .name ["name"] ['name'] [0].`);
    i += m[0].length;
    if (m[1] !== undefined || m[2] !== undefined || m[3] !== undefined) {
      const key = (m[1] ?? m[2] ?? m[3] ?? "").replace(/\\(.)/g, "$1");
      if (cur === null || typeof cur !== "object") throw new Error(`Cannot read "${key}" — not an object here.`);
      cur = (cur as Record<string, unknown>)[key];
    } else {
      const idx = Number(m[4]);
      if (!Array.isArray(cur)) throw new Error(`Index [${idx}] used on a non-array.`);
      if (idx >= cur.length) throw new Error(`Index [${idx}] out of range (length ${cur.length}).`);
      cur = cur[idx];
    }
  }
  return cur;
}

/* ---------- JWT / base64url ---------- */

function b64urlDecode(seg: string): string {
  const t = seg.trim();
  if (!/^[A-Za-z0-9_-]*$/.test(t) || t.length === 0) throw new Error("Not a base64url segment.");
  let std = t.replace(/-/g, "+").replace(/_/g, "/");
  while (std.length % 4 !== 0) std += "=";
  const bin = atob(std);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return td.decode(bytes);
}

function b64urlEncodeText(s: string): string {
  const bytes = te.encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function jwtSegment(token: string, index: 0 | 1): Record<string, unknown> {
  const parts = token.trim().split(".");
  if (parts.length !== 3) throw new Error("A JWT has 3 dot-separated segments.");
  const json = b64urlDecode(parts[index] as string);
  const v: unknown = JSON.parse(json);
  if (v === null || typeof v !== "object" || Array.isArray(v)) throw new Error("That segment is not a JSON object.");
  return v as Record<string, unknown>;
}

/* ---------- semver / chmod / cron ---------- */

function parseSemver(v: string): { n: [number, number, number]; pre: string | null } {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(v.trim());
  if (!m) throw new Error(`"${v.trim()}" is not major.minor.patch semver.`);
  return { n: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ?? null };
}

function compareSemver(a: string, b: string): number {
  const A = parseSemver(a);
  const B = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if ((A.n[i] as number) !== (B.n[i] as number)) return (A.n[i] as number) < (B.n[i] as number) ? -1 : 1;
  }
  if (A.pre === B.pre) return 0;
  if (A.pre === null) return 1;
  if (B.pre === null) return -1;
  return A.pre < B.pre ? -1 : 1;
}

function octalToSymbolic(oct: string): string {
  return oct
    .split("")
    .map((d) => {
      const n = Number(d);
      return (n & 4 ? "r" : "-") + (n & 2 ? "w" : "-") + (n & 1 ? "x" : "-");
    })
    .join("");
}

const CRON_RANGES: [number, number][] = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 7],
];
const CRON_NAMES = ["minute", "hour", "day of month", "month", "day of week"];

function describeCronField(f: string, idx: number): string {
  const [lo, hi] = CRON_RANGES[idx] as [number, number];
  const name = CRON_NAMES[idx] as string;
  const check = (n: number) => {
    if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(`"${f}" out of range for ${name} (${lo}–${hi}).`);
  };
  if (f === "*") return `every ${name}`;
  let m = /^\*\/(\d+)$/.exec(f);
  if (m) {
    const s = Number(m[1]);
    if (!Number.isInteger(s) || s < 1) throw new Error(`Bad step in "${f}".`);
    return `every ${s} ${name}${s === 1 ? "" : "s"}`;
  }
  m = /^(\d+)-(\d+)(?:\/(\d+))?$/.exec(f);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    check(a);
    check(b);
    if (a > b) throw new Error(`Reversed range in "${f}".`);
    return m[3] ? `every ${m[3]} ${name}s from ${a} to ${b}` : `${name}s ${a} through ${b}`;
  }
  if (/^\d+(,\d+)+$/.test(f)) {
    const parts = f.split(",").map(Number);
    parts.forEach(check);
    return `${name}s ${parts.join(", ")}`;
  }
  m = /^(\d+)$/.exec(f);
  if (m) {
    check(Number(m[1]));
    return `${name} ${m[1]}`;
  }
  throw new Error(`Cannot explain "${f}" — use *, */n, a-b, a,b or a number.`);
}

/* ---------- colour ---------- */

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, Math.round(l * 100)];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = 0;
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (mx === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function parseColor(input: string): [number, number, number] {
  const t = input.trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(t);
  if (m) {
    const h = m[1] as string;
    return [
      parseInt(h[0] as string + h[0], 16),
      parseInt(h[1] as string + h[1], 16),
      parseInt(h[2] as string + h[2], 16),
    ];
  }
  m = /^#([0-9a-f]{6})$/.exec(t);
  if (m) {
    const h = m[1] as string;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)$/.exec(t);
  if (m) {
    const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (r > 255 || g > 255 || b > 255) throw new Error("RGB channels run 0–255.");
    return [r, g, b];
  }
  m = /^hsla?\(\s*(-?[\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*[\d.]+\s*)?\)$/.exec(t);
  if (m) {
    const s = Number(m[2]);
    const l = Number(m[3]);
    if (s < 0 || s > 100 || l < 0 || l > 100) throw new Error("Saturation and lightness run 0–100%.");
    return hslToRgb(Number(m[1]), s / 100, l / 100);
  }
  throw new Error("Enter #rgb, #rrggbb, rgb(r,g,b) or hsl(h,s%,l%).");
}

/* ---------- markdown / sql / misc ---------- */

function escapeHtmlSrc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMd(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|[^_\w])_([^_\n]+)_/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

function markdownToHtmlSrc(md: string): string {
  const lines = escapeHtmlSrc(md).split("\n");
  const out: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let list: "ul" | "ol" | null = null;
  const closeList = () => {
    if (list) {
      out.push(list === "ul" ? "</ul>" : "</ol>");
      list = null;
    }
  };
  for (const raw of lines) {
    if (/^```/.test(raw.trim())) {
      if (inCode) {
        out.push("<pre><code>" + codeBuf.join("\n") + "</code></pre>");
        codeBuf = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(raw);
      continue;
    }
    const t = raw.trim();
    if (t === "") {
      closeList();
      continue;
    }
    if (/^---+$/.test(t) || /^\*\*\*+$/.test(t)) {
      closeList();
      out.push("<hr />");
      continue;
    }
    const h = /^(#{1,6})\s+(.+)$/.exec(t);
    if (h) {
      closeList();
      out.push(`<h${h[1]?.length}>${inlineMd(h[2] as string)}</h${h[1]?.length}>`);
      continue;
    }
    const bq = /^&gt;\s?(.*)$/.exec(t);
    if (bq) {
      closeList();
      out.push(`<blockquote>${inlineMd(bq[1] as string)}</blockquote>`);
      continue;
    }
    const ul = /^[-*+]\s+(.+)$/.exec(t);
    if (ul) {
      if (list !== "ul") {
        closeList();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li>${inlineMd(ul[1] as string)}</li>`);
      continue;
    }
    const ol = /^(\d+)[.)]\s+(.+)$/.exec(t);
    if (ol) {
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${inlineMd(ol[2] as string)}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inlineMd(t)}</p>`);
  }
  if (inCode) out.push("<pre><code>" + codeBuf.join("\n") + "</code></pre>");
  closeList();
  return out.join("\n");
}

const SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "OFFSET",
  "INNER JOIN", "LEFT JOIN", "LEFT OUTER JOIN", "RIGHT JOIN", "FULL JOIN", "CROSS JOIN", "JOIN",
  "ON", "AND", "OR", "NOT", "IN", "AS", "DISTINCT", "INSERT INTO", "VALUES", "UPDATE",
  "SET", "DELETE FROM", "CREATE TABLE", "UNION ALL", "UNION", "ORDER", "BY", "ASC", "DESC",
];

function formatSql(s: string): string {
  let t = s.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\s+/g, " ").trim();
  if (!t) throw new Error("Enter a SQL query first.");
  const ordered = [...new Set(SQL_KEYWORDS)].sort((a, b) => b.length - a.length);
  for (const k of ordered) {
    if (k === "AND" || k === "OR") continue;
    t = t.replace(new RegExp(`\\b${k.replace(/ /g, "\\s+")}\\b`, "gi"), `\n${k}`);
  }
  t = t
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "")
    .join("\n");
  t = t.replace(/\b(AND|OR)\b/gi, (_, w: string) => `\n  ${String(w).toUpperCase()}`);
  t = t.replace(/;/g, ";\n");
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

function minifySql(s: string): string {
  let out = "";
  let i = 0;
  let str: string | null = null;
  while (i < s.length) {
    const c = s[i] as string;
    if (str) {
      out += c;
      if (c === str && s[i - 1] !== "\\") str = null;
      i++;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      str = c;
      out += c;
      i++;
      continue;
    }
    if (c === "-" && s[i + 1] === "-") {
      while (i < s.length && s[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && s[i + 1] === "*") {
      i += 2;
      while (i < s.length && !(s[i] === "*" && s[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  const min = out.replace(/\s+/g, " ").trim();
  if (!min) throw new Error("Enter a SQL query first.");
  return min;
}

function simpleCssBeautify(s: string): string {
  const t = s.trim();
  if (!t) throw new Error("Enter some CSS first.");
  let depth = 0;
  let out = "";
  let i = 0;
  let str: string | null = null;
  const nl = () => {
    out += "\n" + "  ".repeat(Math.max(0, depth));
  };
  while (i < t.length) {
    const c = t[i] as string;
    if (str) {
      out += c;
      if (c === str) str = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      str = c;
      out += c;
      i++;
      continue;
    }
    if (c === "{") {
      out = out.trimEnd() + " {";
      depth++;
      nl();
      i++;
      continue;
    }
    if (c === "}") {
      depth = Math.max(0, depth - 1);
      out = out.trimEnd();
      nl();
      out += "}";
      nl();
      i++;
      continue;
    }
    if (c === ";") {
      out += ";";
      nl();
      i++;
      continue;
    }
    if (c === "/" && t[i + 1] === "*") {
      const end = t.indexOf("*/", i + 2);
      const comment = end === -1 ? t.slice(i) : t.slice(i, end + 2);
      out = out.trimEnd();
      nl();
      out += comment;
      nl();
      i = end === -1 ? t.length : end + 2;
      continue;
    }
    out += c;
    i++;
  }
  return out
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l, idx, arr) => !(l === "" && (idx === 0 || arr[idx - 1] === "")))
    .join("\n")
    .trim();
}

function simpleJsBeautify(s: string): string {
  const t = s.trim();
  if (!t) throw new Error("Enter some JavaScript first.");
  let depth = 0;
  let out = "";
  let i = 0;
  let str: string | null = null;
  let tplDepth = 0;
  const indent = () => "  ".repeat(Math.max(0, depth));
  while (i < t.length) {
    const c = t[i] as string;
    if (str) {
      out += c;
      if (c === "\\") {
        out += t[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (c === str && !(str === "`" && tplDepth > 0)) str = null;
      if (str === "`" && c === "$" && t[i + 1] === "{") {
        out += "{";
        tplDepth++;
        depth++;
        out += "\n" + indent();
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      str = c;
      out += c;
      i++;
      continue;
    }
    if (c === "/" && (t[i + 1] === "/" || t[i + 1] === "*")) {
      if (t[i + 1] === "/") {
        const end = t.indexOf("\n", i);
        out = out.trimEnd() + "\n" + indent() + (end === -1 ? t.slice(i) : t.slice(i, end));
        i = end === -1 ? t.length : end;
        continue;
      }
      const end = t.indexOf("*/", i + 2);
      out = out.trimEnd() + "\n" + indent() + (end === -1 ? t.slice(i) : t.slice(i, end + 2));
      i = end === -1 ? t.length : end + 2;
      continue;
    }
    if (c === "{" || c === "[") {
      out = out.trimEnd() + " " + c;
      depth++;
      out += "\n" + indent();
      i++;
      continue;
    }
    if (c === "}" || c === "]") {
      depth = Math.max(0, depth - 1);
      out = out.trimEnd() + "\n" + indent() + c;
      if (tplDepth > 0 && c === "}") tplDepth--;
      i++;
      continue;
    }
    if (c === ";") {
      out += ";";
      out += "\n" + indent();
      i++;
      continue;
    }
    if (c === "\n") {
      out = out.trimEnd() + "\n" + indent();
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== "")
    .join("\n")
    .trim();
}

/* ================= TEXT tools ================= */

function ParagraphCounterTool() {
  return (
    <Calc
      button="Count paragraphs"
      fields={[{ key: "t", label: "Text", type: "textarea", required: true }]}
      compute={(v) => {
        const t = (v.t ?? "").trim();
        if (!t) return { error: "Enter some text first." };
        const paras = t.split(/\n\s*\n/).filter((p) => p.trim() !== "");
        const lines = t.split("\n").length;
        return {
          rows: [
            ["Paragraphs", String(paras.length)],
            ["Lines", String(lines)],
            ["Avg lines / paragraph", paras.length ? (lines / paras.length).toFixed(1) : "—"],
          ],
        };
      }}
    />
  );
}

function FindReplaceTool() {
  return (
    <Gen
      button="Replace"
      fileName="find-replace.txt"
      fields={[
        { key: "t", label: "Text", type: "textarea", required: true },
        { key: "find", label: "Find (literal text)", type: "text", required: true },
        { key: "rep", label: "Replace with", type: "text" },
        { key: "cs", label: "Case sensitive", type: "checkbox", def: "1" },
      ]}
      generate={(v) => {
        const text = v.t ?? "";
        const find = v.find ?? "";
        if (!find) return { error: "Enter the text to find." };
        const rep = v.rep ?? "";
        const sensitive = (v.cs ?? "1") === "1";
        let count = 0;
        let out: string;
        if (sensitive) {
          count = text.split(find).length - 1;
          out = text.split(find).join(rep);
        } else {
          const lower = text.toLowerCase();
          const lf = find.toLowerCase();
          let i = 0;
          let res = "";
          for (;;) {
            const j = lower.indexOf(lf, i);
            if (j === -1) {
              res += text.slice(i);
              break;
            }
            count++;
            res += text.slice(i, j) + rep;
            i = j + find.length;
          }
          out = res;
        }
        return `${out}\n\n---\n${count} replacement${count === 1 ? "" : "s"} made.`;
      }}
    />
  );
}

function TextDiffTool() {
  return (
    <Gen
      button="Compare"
      fileName="text-diff.txt"
      fields={[
        { key: "a", label: "Original text", type: "textarea", required: true },
        { key: "b", label: "Revised text", type: "textarea", required: true },
      ]}
      generate={(v) => {
        const a = (v.a ?? "").split("\n");
        const b = (v.b ?? "").split("\n");
        const lines = diffLines(a, b);
        const added = lines.filter((l) => l.startsWith("+ ")).length;
        const removed = lines.filter((l) => l.startsWith("- ")).length;
        return `Legend: "  " unchanged, "- " removed, "+ " added\n\n${lines.join("\n")}\n\n---\n${added} added, ${removed} removed.`;
      }}
    />
  );
}

function TextToAsciiTool() {
  return (
    <TextOp
      button="Convert to ASCII"
      fileName="ascii-codes.txt"
      process={(t) => {
        const codes: number[] = [];
        for (const ch of t) {
          const cp = ch.codePointAt(0) as number;
          if (cp > 127) return { error: `Non-ASCII character "${ch}" (U+${cp.toString(16).toUpperCase()}) cannot be encoded.` };
          codes.push(cp);
        }
        return { output: codes.join(" "), stats: [["Characters", String(codes.length)]] };
      }}
    />
  );
}

function AsciiToTextTool() {
  return (
    <TextOp
      button="Decode codes"
      placeholder="e.g. 72 101 108 108 111"
      fileName="ascii-decoded.txt"
      process={(t) => {
        const parts = t.split(/[\s,]+/).filter((p) => p !== "");
        if (parts.length === 0) return { error: "Enter decimal codes separated by spaces." };
        let out = "";
        for (const p of parts) {
          if (!/^\d+$/.test(p)) return { error: `"${p}" is not a decimal number.` };
          const n = Number(p);
          if (n > 127) return { error: `Code ${n} is outside ASCII range 0–127.` };
          out += String.fromCharCode(n);
        }
        return out;
      }}
    />
  );
}

function Rot13EncoderTool() {
  return <TextOp button="Encode" fileName="rot13.txt" process={(t) => rot13(t)} />;
}

function Rot13DecoderTool() {
  return <TextOp button="Decode" fileName="rot13-decoded.txt" process={(t) => rot13(t)} />;
}

function HtmlEntityEncoderTool() {
  return <TextOp button="Encode entities" fileName="html-entities.txt" process={(t) => htmlEncode(t)} />;
}

function HtmlEntityDecoderTool() {
  return (
    <TextOp
      button="Decode entities"
      fileName="html-decoded.txt"
      process={(t) => {
        if (!t.includes("&")) return { error: "No &entities found in the input." };
        return htmlDecode(t);
      }}
    />
  );
}

function UnicodeEscapeEncoderTool() {
  return (
    <TextOp button="Encode" fileName="unicode-escaped.txt" process={(t) => unicodeEscapeEncode(t)} />
  );
}

function UnicodeEscapeDecoderTool() {
  return (
    <TextOp
      button="Decode"
      placeholder="Paste text with \\uXXXX escapes…"
      fileName="unicode-decoded.txt"
      process={(t) => unicodeEscapeDecode(t)}
    />
  );
}

function TextToBinaryTool() {
  return (
    <TextOp
      button="Convert to binary"
      fileName="binary.txt"
      process={(t) => {
        const bytes = te.encode(t);
        const out = Array.from(bytes)
          .map((b) => b.toString(2).padStart(8, "0"))
          .join(" ");
        return { output: out, stats: [["Bytes (UTF-8)", String(bytes.length)]] };
      }}
    />
  );
}

function BinaryToTextTool() {
  return (
    <TextOp
      button="Decode binary"
      placeholder="e.g. 01001000 01101001"
      fileName="binary-decoded.txt"
      process={(t) => {
        const parts = t.split(/[\s,]+/).filter((p) => p !== "");
        if (parts.length === 0) return { error: "Enter 8-bit binary groups." };
        const bytes = new Uint8Array(parts.length);
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i] as string;
          if (!/^[01]{8}$/.test(p)) return { error: `"${p}" is not an 8-bit group of 0s and 1s.` };
          bytes[i] = parseInt(p, 2);
        }
        try {
          return td.decode(bytes);
        } catch {
          return { error: "Those bytes are not valid UTF-8." };
        }
      }}
    />
  );
}

function TextToHexTool() {
  return (
    <TextOp
      button="Convert to hex"
      fileName="hex.txt"
      process={(t) => {
        const bytes = te.encode(t);
        return Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }}
    />
  );
}

function HexToTextTool() {
  return (
    <TextOp
      button="Decode hex"
      placeholder="e.g. 48656c6c6f"
      fileName="hex-decoded.txt"
      process={(t) => {
        const h = t.replace(/[\s,]/g, "");
        if (!/^[0-9A-Fa-f]+$/.test(h)) return { error: "Hex uses digits 0–9 and A–F only." };
        if (h.length % 2 !== 0) return { error: "Hex length must be even (two digits per byte)." };
        const bytes = new Uint8Array(h.length / 2);
        for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
        try {
          return td.decode(bytes);
        } catch {
          return { error: "Those bytes are not valid UTF-8." };
        }
      }}
    />
  );
}

function TextToDecimalTool() {
  return (
    <TextOp
      button="Convert to decimals"
      fileName="decimal-bytes.txt"
      process={(t) => Array.from(te.encode(t)).join(" ")}
    />
  );
}

function DecimalToTextTool() {
  return (
    <TextOp
      button="Decode decimals"
      placeholder="e.g. 72 101 108 108 111"
      fileName="decimal-decoded.txt"
      process={(t) => {
        const parts = t.split(/[\s,]+/).filter((p) => p !== "");
        if (parts.length === 0) return { error: "Enter decimal byte values." };
        const bytes = new Uint8Array(parts.length);
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i] as string;
          if (!/^\d+$/.test(p)) return { error: `"${p}" is not a decimal number.` };
          const n = Number(p);
          if (n > 255) return { error: `Byte ${n} is out of range 0–255.` };
          bytes[i] = n;
        }
        try {
          return td.decode(bytes);
        } catch {
          return { error: "Those bytes are not valid UTF-8." };
        }
      }}
    />
  );
}

function MorseEncoderTool() {
  return (
    <TextOp
      button="Encode Morse"
      fileName="morse.txt"
      process={(t) => {
        const words = t.toUpperCase().trim().split(/\s+/);
        const out = words.map((w) => {
          const letters: string[] = [];
          for (const ch of w) {
            const code = MORSE[ch];
            if (!code) throw new Error(`Character "${ch}" has no Morse code here.`);
            letters.push(code);
          }
          return letters.join(" ");
        });
        return out.join(" / ");
      }}
    />
  );
}

function MorseDecoderTool() {
  return (
    <TextOp
      button="Decode Morse"
      placeholder="e.g. .... .. / - .... . .-. ."
      fileName="morse-decoded.txt"
      process={(t) => {
        if (!/^[.\-/\s]+$/.test(t.trim())) return { error: "Morse uses only dots, dashes, spaces and /." };
        const words = t.trim().split(/\s*\/\s*/);
        return words
          .map((w) =>
            w
              .trim()
              .split(/\s+/)
              .map((l) => {
                const ch = MORSE_REV[l];
                if (!ch) throw new Error(`"${l}" is not a known Morse letter.`);
                return ch;
              })
              .join(""),
          )
          .join(" ");
      }}
    />
  );
}

function CamelCaseTool() {
  return (
    <TextOp
      button="Convert"
      fileName="camelcase.txt"
      process={(t) => {
        const w = splitWords(t);
        if (!w.length) return { error: "No words found." };
        return (w[0] as string).toLowerCase() + w.slice(1).map(cap).join("");
      }}
    />
  );
}

function PascalCaseTool() {
  return (
    <TextOp
      button="Convert"
      fileName="pascalcase.txt"
      process={(t) => {
        const w = splitWords(t);
        if (!w.length) return { error: "No words found." };
        return w.map(cap).join("");
      }}
    />
  );
}

function SnakeCaseTool() {
  return (
    <TextOp
      button="Convert"
      fileName="snakecase.txt"
      process={(t) => {
        const w = splitWords(t);
        if (!w.length) return { error: "No words found." };
        return w.map((x) => x.toLowerCase()).join("_");
      }}
    />
  );
}

function KebabCaseTool() {
  return (
    <TextOp
      button="Convert"
      fileName="kebabcase.txt"
      process={(t) => {
        const w = splitWords(t);
        if (!w.length) return { error: "No words found." };
        return w.map((x) => x.toLowerCase()).join("-");
      }}
    />
  );
}

function ConstantCaseTool() {
  return (
    <TextOp
      button="Convert"
      fileName="constantcase.txt"
      process={(t) => {
        const w = splitWords(t);
        if (!w.length) return { error: "No words found." };
        return w.map((x) => x.toUpperCase()).join("_");
      }}
    />
  );
}

function RemoveEmptyLinesTool() {
  return (
    <TextOp
      button="Remove blanks"
      fileName="no-empty-lines.txt"
      process={(t) => {
        const lines = t.split("\n");
        const kept = lines.filter((l) => l.trim() !== "");
        if (kept.length === lines.length) return { output: t, stats: [["Removed", "0"]] };
        return { output: kept.join("\n"), stats: [["Removed", String(lines.length - kept.length)]] };
      }}
    />
  );
}

function ReverseLinesTool() {
  return (
    <TextOp button="Reverse order" fileName="reversed-lines.txt" process={(t) => t.split("\n").reverse().join("\n")} />
  );
}

function AlphabetizeTool() {
  return (
    <TextOp
      button="Sort A–Z"
      fileName="sorted.txt"
      process={(t) => {
        const lines = t.split("\n").filter((l) => l.trim() !== "");
        lines.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
        return { output: lines.join("\n"), stats: [["Lines", String(lines.length)]] };
      }}
    />
  );
}

function WhitespaceCleanerTool() {
  return (
    <TextOp
      button="Clean whitespace"
      fileName="cleaned.txt"
      process={(t) => {
        return t
          .split("\n")
          .map((l) => l.replace(/[ \t]+/g, " ").trimEnd())
          .join("\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      }}
    />
  );
}

function TextDeduplicatorTool() {
  return (
    <TextOp
      button="Deduplicate"
      fileName="deduplicated.txt"
      process={(t) => {
        const seen = new Set<string>();
        const out: string[] = [];
        for (const l of t.split("\n")) {
          if (!seen.has(l)) {
            seen.add(l);
            out.push(l);
          }
        }
        return { output: out.join("\n"), stats: [["Removed", String(t.split("\n").length - out.length)]] };
      }}
    />
  );
}

function XmlFormatterTool() {
  return (
    <TextOp button="Format XML" fileName="formatted.xml" process={(t) => formatXml(t.trim())} />
  );
}

function XmlMinifierTool() {
  return (
    <TextOp
      button="Minify XML"
      fileName="minified.xml"
      process={(t) => {
        const min = minifyXml(t.trim());
        return { output: min, stats: [["Before", `${t.length} chars`], ["After", `${min.length} chars`]] };
      }}
    />
  );
}

function CsvFormatterTool() {
  return (
    <TextOp
      button="Align columns"
      fileName="aligned.txt"
      process={(t) => {
        const table = parseDelimited(t.trim(), ",");
        const grid = [table.headers, ...table.rows];
        const widths = grid[0]?.map((_, c) => Math.max(...grid.map((r) => (r[c] ?? "").length))) ?? [];
        return grid.map((r) => r.map((c, i) => (c ?? "").padEnd(widths[i] as number)).join("  ").trimEnd()).join("\n");
      }}
    />
  );
}

function MarkdownFormatterTool() {
  return (
    <TextOp
      button="Format Markdown"
      fileName="formatted.md"
      process={(t) => {
        const lines = t.replace(/[ \t]+$/gm, "").split("\n");
        const out: string[] = [];
        let prevBlank = true;
        for (const raw of lines) {
          let l = raw.trimEnd();
          const h = /^(#{1,6})\s*(.*)$/.exec(l);
          if (h) l = `${h[1]} ${(h[2] ?? "").trim()}`;
          const li = /^([-*+])\s+(.*)$/.exec(l);
          if (li) l = `- ${(li[2] ?? "").trim()}`;
          if (l === "") {
            if (!prevBlank) out.push("");
            prevBlank = true;
            continue;
          }
          if (/^#{1,6} /.test(l) && !prevBlank) out.push("");
          out.push(l);
          prevBlank = false;
        }
        return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
      }}
    />
  );
}

function SqlFormatterTool() {
  return <TextOp button="Format SQL" fileName="formatted.sql" process={(t) => formatSql(t)} />;
}

function SlugProTool() {
  return (
    <TextOp
      button="Make slug"
      fileName="slug.txt"
      process={(t) => {
        const slug = t
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .replace(/-{2,}/g, "-")
          .slice(0, 80)
          .replace(/-+$/g, "");
        if (!slug) return { error: "No URL-safe characters found." };
        return slug;
      }}
    />
  );
}

function PasswordStrengthTool() {
  return (
    <Calc
      button="Check strength"
      fields={[{ key: "p", label: "Password (never leaves your device)", type: "text", required: true }]}
      compute={(v) => {
        const p = v.p ?? "";
        if (!p) return { error: "Enter a password to score." };
        let pool = 0;
        const has = (re: RegExp) => re.test(p);
        if (has(/[a-z]/)) pool += 26;
        if (has(/[A-Z]/)) pool += 26;
        if (has(/[0-9]/)) pool += 10;
        if (has(/[^A-Za-z0-9\s]/)) pool += 32;
        if (has(/\s/)) pool += 1;
        if (has(/[^\x00-\x7F]/)) pool += 64;
        const entropy = p.length * Math.log2(Math.max(1, pool));
        const score = entropy < 28 ? 0 : entropy < 36 ? 1 : entropy < 48 ? 2 : entropy < 64 ? 3 : entropy < 90 ? 4 : 5;
        const verdict = ["Very weak", "Weak", "Fair", "Strong", "Very strong", "Excellent"][score] as string;
        const guesses = Math.pow(2, Math.max(0, entropy - 1)) / 1e10;
        const crack =
          guesses < 1 ? "under a second" : guesses < 60 ? `${Math.round(guesses)} seconds` : guesses < 3600 ? `${(guesses / 60).toFixed(1)} minutes` : guesses < 86400 ? `${(guesses / 3600).toFixed(1)} hours` : guesses < 31536000 ? `${(guesses / 86400).toFixed(1)} days` : `${(guesses / 31536000).toFixed(1)} years`;
        return {
          rows: [
            ["Score", `${score} / 5`],
            ["Entropy", `${entropy.toFixed(1)} bits`],
            ["Verdict", verdict],
            ["Guess time (10B/s)", crack],
            ["Length", `${p.length} characters`],
          ],
          note: "Longer and more varied passwords score higher. Estimate only — reuse and leaks matter too.",
        };
      }}
    />
  );
}

function SentenceCaseProTool() {
  return (
    <TextOp
      button="Apply sentence case"
      fileName="sentence-case.txt"
      process={(t) => {
        const lowered = /[a-z]/.test(t) ? t : t.toLowerCase();
        return lowered.replace(/(^|[.!?…]\s+)(["“'‘(\[]*\s*)([a-z])/g, (_, a: string, b: string, c: string) => a + b + c.toUpperCase());
      }}
    />
  );
}

function EmailExtractorTool() {
  return (
    <TextOp
      button="Extract emails"
      fileName="emails.txt"
      process={(t) => {
        const found = t.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [];
        const unique = [...new Set(found)];
        if (!unique.length) return { error: "No email addresses found." };
        return { output: unique.join("\n"), stats: [["Found", String(unique.length)]] };
      }}
    />
  );
}

function UrlExtractorTool() {
  return (
    <TextOp
      button="Extract URLs"
      fileName="urls.txt"
      process={(t) => {
        const found = t.match(/https?:\/\/[^\s<>"')\]]+/g) ?? [];
        const clean = [...new Set(found.map((u) => u.replace(/[.,;:!?]+$/g, "")))];
        if (!clean.length) return { error: "No http(s) URLs found." };
        return { output: clean.join("\n"), stats: [["Found", String(clean.length)]] };
      }}
    />
  );
}

function HtmlTagStripperTool() {
  return (
    <TextOp
      button="Strip tags"
      fileName="plain-text.txt"
      process={(t) => {
        const noScript = t.replace(/<(script|style)[\s\S]*?<\/\1\s*>/gi, " ");
        const noTags = noScript.replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ");
        return htmlDecode(noTags).replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      }}
    />
  );
}

function LineNumberAdderTool() {
  return (
    <TextOp
      button="Add numbers"
      fileName="numbered.txt"
      process={(t) => {
        const lines = t.split("\n");
        const w = String(lines.length).length;
        return lines.map((l, i) => `${String(i + 1).padStart(w, " ")} | ${l}`).join("\n");
      }}
    />
  );
}

function TextTruncatorTool() {
  return (
    <Gen
      button="Truncate"
      fileName="truncated.txt"
      fields={[
        { key: "t", label: "Text", type: "textarea", required: true },
        { key: "n", label: "Limit", type: "number", def: "140", required: true },
        {
          key: "mode", label: "Limit by", type: "select",
          options: [
            { value: "chars", label: "Characters" },
            { value: "words", label: "Whole words" },
          ],
        },
        { key: "ell", label: "Add ellipsis (…)", type: "checkbox", def: "1" },
      ]}
      generate={(v) => {
        const text = v.t ?? "";
        const n = Number((v.n ?? "").replace(/,/g, ""));
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 1000000) {
          return { error: "Limit must be a whole number 1–1000000." };
        }
        const ell = (v.ell ?? "1") === "1" ? "…" : "";
        if (v.mode === "words") {
          const words = text.split(/\s+/).filter((w) => w !== "");
          if (words.length <= n) return text;
          return words.slice(0, n).join(" ") + ell;
        }
        if (text.length <= n) return text;
        const cut = text.slice(0, Math.max(0, n - (ell ? 1 : 0)));
        return cut + ell;
      }}
    />
  );
}

function WordFrequencyTool() {
  return (
    <TextOp
      button="Count frequencies"
      fileName="word-frequency.txt"
      process={(t) => {
        const words = (t.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter((w) => w.replace(/'/g, "") !== "");
        if (!words.length) return { error: "No words found." };
        const counts = new Map<string, number>();
        for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
        const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
        const top = ranked[0] as [string, number];
        return {
          output: ranked.slice(0, 200).map(([w, c]) => `${w}: ${c}`).join("\n"),
          stats: [
            ["Total words", String(words.length)],
            ["Unique", String(counts.size)],
            ["Top word", `${top[0]} (${top[1]}×)`],
          ],
        };
      }}
    />
  );
}

function TabToSpacesTool() {
  return (
    <Gen
      button="Convert tabs"
      fileName="spaces.txt"
      fields={[
        { key: "t", label: "Text", type: "textarea", required: true },
        { key: "n", label: "Spaces per tab", type: "number", def: "4", required: true },
      ]}
      generate={(v) => {
        const n = Number((v.n ?? "").replace(/,/g, ""));
        if (!Number.isInteger(n) || n < 1 || n > 16) return { error: "Use 1–16 spaces per tab." };
        return (v.t ?? "").replace(/\t/g, " ".repeat(n));
      }}
    />
  );
}

/* ================= DEVELOPER tools ================= */

function JsonPathTool() {
  return (
    <Gen
      button="Query"
      fileName="jsonpath-result.json"
      fields={[
        { key: "json", label: "JSON document", type: "textarea", required: true },
        { key: "path", label: 'Path (subset: $.a.b[0], $["a"])', type: "text", def: "$", required: true },
      ]}
      generate={(v) => {
        let doc: unknown;
        try {
          doc = JSON.parse(v.json ?? "");
        } catch {
          return { error: "Invalid JSON document." };
        }
        try {
          const res = jsonPathQuery(doc, v.path ?? "$");
          return res === undefined ? "(no match — undefined)" : JSON.stringify(res, null, 2);
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Query failed." };
        }
      }}
    />
  );
}

function XmlValidatorTool() {
  return (
    <Calc
      button="Validate"
      fields={[{ key: "x", label: "XML document", type: "textarea", required: true }]}
      compute={(v) => {
        const x = (v.x ?? "").trim();
        if (!x) return { error: "Paste an XML document first." };
        try {
          const doc = parseXmlOrThrow(x);
          const root = doc.documentElement;
          return {
            rows: [
              ["Result", "Valid XML"],
              ["Root element", root.tagName],
              ["Elements", String(doc.getElementsByTagName("*").length)],
            ],
          };
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Invalid XML." };
        }
      }}
    />
  );
}

function XmlToJsonTool() {
  return (
    <TextOp
      button="Convert to JSON"
      fileName="data.json"
      process={(t) => {
        const doc = parseXmlOrThrow(t.trim());
        const root = doc.documentElement;
        return JSON.stringify({ [root.tagName]: xmlNodeToJson(root) }, null, 2);
      }}
    />
  );
}

function JsonToXmlTool() {
  return (
    <Gen
      button="Convert to XML"
      fileName="data.xml"
      fields={[
        { key: "json", label: "JSON value", type: "textarea", required: true },
        { key: "root", label: "Root element name", type: "text", def: "root" },
      ]}
      generate={(v) => {
        let doc: unknown;
        try {
          doc = JSON.parse(v.json ?? "");
        } catch {
          return { error: "Invalid JSON." };
        }
        const root = safeTag((v.root ?? "root").trim() || "root");
        return `<?xml version="1.0" encoding="UTF-8"?>\n${valToXml(doc, root)}`;
      }}
    />
  );
}

function TsvToCsvTool() {
  return (
    <TextOp
      button="Convert TSV → CSV"
      fileName="data.csv"
      process={(t) => {
        const table = parseDelimited(t.trim(), "\t");
        const out = stringifyDelimited(table, ",");
        return { output: out, stats: [["Rows", String(table.rows.length)], ["Columns", String(table.headers.length)]] };
      }}
    />
  );
}

function CsvToTsvTool() {
  return (
    <TextOp
      button="Convert CSV → TSV"
      fileName="data.tsv"
      process={(t) => {
        const table = parseDelimited(t.trim(), ",");
        const out = stringifyDelimited(table, "\t");
        return { output: out, stats: [["Rows", String(table.rows.length)], ["Columns", String(table.headers.length)]] };
      }}
    />
  );
}

function JwtHeaderTool() {
  return (
    <Calc
      button="Decode header"
      fields={[{ key: "t", label: "JWT", type: "textarea", required: true }]}
      compute={(v) => {
        try {
          const h = jwtSegment(v.t ?? "", 0);
          const rows = Object.entries(h).slice(0, 8).map(([k, val]): [string, string] => [k, typeof val === "object" ? JSON.stringify(val) : String(val)]);
          if (rows.length === 0) return { error: "Header object is empty." };
          return { rows, note: "Decode only — this does not verify the signature." };
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Cannot decode header." };
        }
      }}
    />
  );
}

function JwtPayloadTool() {
  return (
    <Calc
      button="Decode payload"
      fields={[{ key: "t", label: "JWT", type: "textarea", required: true }]}
      compute={(v) => {
        try {
          const p = jwtSegment(v.t ?? "", 1);
          const rows = Object.entries(p).slice(0, 12).map(([k, val]): [string, string] => [k, typeof val === "object" ? JSON.stringify(val) : String(val)]);
          if (rows.length === 0) return { error: "Payload object is empty." };
          return { rows, note: "Decode only — this does not verify the signature." };
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Cannot decode payload." };
        }
      }}
    />
  );
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function UuidValidatorTool() {
  return (
    <Calc
      button="Validate"
      fields={[{ key: "u", label: "UUID", type: "text", placeholder: "e.g. 550e8400-e29b-41d4-a716-446655440000", required: true }]}
      compute={(v) => {
        const u = (v.u ?? "").trim();
        if (!UUID_RE.test(u)) return { rows: [["Result", "Not a valid UUID"]] };
        const version = parseInt(u.charAt(14) as string, 16);
        return {
          rows: [
            ["Result", "Valid UUID"],
            ["Version digit", String(version)],
            ["Variant", /[89abAB]/.test(u.charAt(19) as string) ? "RFC 4122" : "Non-standard"],
          ],
        };
      }}
    />
  );
}

const UUID_VERSIONS: Record<string, string> = {
  "1": "Time-based (MAC + timestamp)",
  "2": "DCE security (rare)",
  "3": "Name-based (MD5 hash)",
  "4": "Random",
  "5": "Name-based (SHA-1 hash)",
  "6": "Reordered time-based",
  "7": "Unix-timestamp ordered",
  "8": "Custom",
};

function UuidVersionTool() {
  return (
    <Calc
      button="Detect version"
      fields={[{ key: "u", label: "UUID", type: "text", required: true }]}
      compute={(v) => {
        const u = (v.u ?? "").trim();
        if (!UUID_RE.test(u)) return { error: "Not a valid UUID — check the 8-4-4-4-12 shape." };
        const ver = u.charAt(14) as string;
        return {
          rows: [
            ["Version", `Version ${ver}`],
            ["Meaning", UUID_VERSIONS[ver] ?? "Reserved / unknown"],
          ],
        };
      }}
    />
  );
}

const REGEX_TEMPLATES: Record<string, { label: string; pattern: (strict: boolean) => string }> = {
  email: { label: "Email address", pattern: (s) => (s ? "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$" : "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}") },
  url: { label: "HTTP(S) URL", pattern: (s) => (s ? "^https?:\\/\\/[^\\s<>\"]+$" : "https?:\\/\\/[^\\s<>\"]+") },
  slug: { label: "URL slug", pattern: (s) => (s ? "^[a-z0-9]+(?:-[a-z0-9]+)*$" : "[a-z0-9]+(?:-[a-z0-9]+)*") },
  date: { label: "Date YYYY-MM-DD", pattern: (s) => (s ? "^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$" : "\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])") },
  hexcolor: { label: "Hex colour", pattern: (s) => (s ? "^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" : "#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})") },
  ipv4: { label: "IPv4 address", pattern: (s) => (s ? "^(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)$" : "(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)") },
  username: { label: "Username (letters, digits, _)", pattern: (s) => (s ? "^[A-Za-z][A-Za-z0-9_]{2,19}$" : "[A-Za-z][A-Za-z0-9_]{2,19}") },
  digits: { label: "Digits only", pattern: (s) => (s ? "^\\d+$" : "\\d+") },
};

function RegexGeneratorTool() {
  return (
    <Gen
      button="Build pattern"
      fileName="pattern.txt"
      fields={[
        {
          key: "kind", label: "Pattern type", type: "select",
          options: Object.entries(REGEX_TEMPLATES).map(([value, t]) => ({ value, label: t.label })),
        },
        { key: "strict", label: "Anchor full match (^…$)", type: "checkbox", def: "1" },
        { key: "ins", label: "Case-insensitive flag (/i)", type: "checkbox", def: "0" },
      ]}
      generate={(v) => {
        const t = REGEX_TEMPLATES[v.kind ?? "email"];
        if (!t) return { error: "Pick a pattern type." };
        const strict = (v.strict ?? "1") === "1";
        const flags = (v.ins ?? "0") === "1" ? "i" : "";
        const body = t.pattern(strict);
        const literal = `/${body}/${flags}`;
        return `${literal}\n\n---\nStarter pattern for: ${t.label}. Test it against your real data before shipping — no generated regex fits every input.`;
      }}
    />
  );
}

function RegexEscapeTool() {
  return (
    <TextOp
      button="Escape"
      fileName="escaped-regex.txt"
      process={(t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}
    />
  );
}

function RegexReplaceTool() {
  return (
    <Gen
      button="Apply replacement"
      fileName="regex-replaced.txt"
      fields={[
        { key: "t", label: "Source text", type: "textarea", required: true },
        { key: "pat", label: "Pattern (without / /)", type: "text", required: true },
        { key: "rep", label: "Replacement ($1, $2, $& allowed)", type: "text" },
        { key: "glob", label: "Replace all (global)", type: "checkbox", def: "1" },
        { key: "ins", label: "Case-insensitive", type: "checkbox", def: "0" },
      ]}
      generate={(v) => {
        const flags = `${(v.glob ?? "1") === "1" ? "g" : ""}${(v.ins ?? "0") === "1" ? "i" : ""}`;
        let re: RegExp;
        try {
          re = new RegExp(v.pat ?? "", flags);
        } catch {
          return { error: "Invalid regular expression — check brackets and escapes." };
        }
        try {
          const matches = (v.t ?? "").match(re);
          const n = matches ? (flags.includes("g") ? matches.length : 1) : 0;
          const out = (v.t ?? "").replace(re, v.rep ?? "");
          return `${out}\n\n---\n${n} match${n === 1 ? "" : "es"} replaced.`;
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Replacement failed." };
        }
      }}
    />
  );
}


function HttpHeaderParserTool() {
  return (
    <TextOp
      button="Parse headers"
      placeholder={"Content-Type: application/json\nX-Request-Id: abc-123"}
      fileName="headers.txt"
      process={(t) => {
        const lines = t.split("\n");
        const out: string[] = [];
        const bad: string[] = [];
        lines.forEach((raw, i) => {
          if (raw.trim() === "") return;
          const m = /^([A-Za-z0-9-]+)\s*:\s*(.+)$/.exec(raw);
          if (!m) {
            bad.push(`line ${i + 1}`);
            return;
          }
          const name = (m[1] as string).toLowerCase().replace(/(^|-)([a-z])/g, (_, d: string, c: string) => d + c.toUpperCase());
          out.push(`${name}: ${(m[2] as string).trim()}`);
        });
        if (bad.length > 0) return { error: `Malformed header at ${bad.join(", ")} — use "Name: value".` };
        if (!out.length) return { error: "No headers found." };
        return { output: out.join("\n"), stats: [["Headers", String(out.length)]] };
      }}
    />
  );
}

function UrlParserTool() {
  return (
    <Calc
      button="Parse URL"
      fields={[{ key: "u", label: "URL", type: "text", placeholder: "https://example.com:8080/path?q=1#frag", required: true }]}
      compute={(v) => {
        const raw = (v.u ?? "").trim();
        if (!raw) return { error: "Enter a URL first." };
        try {
          const u = new URL(raw);
          return {
            rows: [
              ["Protocol", u.protocol.replace(/:$/, "")],
              ["Host", u.hostname],
              ["Port", u.port || "(default)"],
              ["Path", u.pathname],
              ["Query", u.search ? u.search.slice(1) : "(none)"],
              ["Fragment", u.hash ? u.hash.slice(1) : "(none)"],
            ],
          };
        } catch {
          return { error: "Invalid URL — include the scheme, e.g. https://." };
        }
      }}
    />
  );
}

function UrlQueryParserTool() {
  return (
    <Calc
      button="Parse query"
      fields={[{ key: "u", label: "URL or query string", type: "text", placeholder: "https://x.com/?a=1&b=hi%20there", required: true }]}
      compute={(v) => {
        const raw = (v.u ?? "").trim();
        if (!raw) return { error: "Enter a URL or query string." };
        let qs = raw;
        try {
          if (/^https?:\/\//i.test(raw)) qs = new URL(raw).search.slice(1);
          else if (raw.startsWith("?")) qs = raw.slice(1);
        } catch {
          return { error: "Invalid URL." };
        }
        if (!qs) return { error: "No query string found." };
        const params = new URLSearchParams(qs);
        const rows: [string, string][] = [];
        params.forEach((val, key) => rows.push([key, val]));
        if (!rows.length) return { error: "No parameters found." };
        return { rows: rows.slice(0, 40), note: `${rows.length} parameter${rows.length === 1 ? "" : "s"} decoded.` };
      }}
    />
  );
}

function UrlBuilderTool() {
  return (
    <Gen
      button="Build URL"
      fileName="url.txt"
      fields={[
        {
          key: "scheme", label: "Scheme", type: "select",
          options: [
            { value: "https", label: "https" },
            { value: "http", label: "http" },
          ],
        },
        { key: "host", label: "Host", type: "text", placeholder: "example.com", required: true },
        { key: "port", label: "Port (optional)", type: "text", placeholder: "8080" },
        { key: "path", label: "Path (optional)", type: "text", placeholder: "/docs/search" },
        { key: "q", label: "Query lines key=value (one per line)", type: "textarea" },
        { key: "frag", label: "Fragment (optional)", type: "text" },
      ]}
      generate={(v) => {
        const host = (v.host ?? "").trim();
        if (!/^[A-Za-z0-9.-]+$/.test(host)) return { error: "Host looks invalid." };
        const port = (v.port ?? "").trim();
        if (port && !/^\d{1,5}$/.test(port)) return { error: "Port must be digits." };
        let path = (v.path ?? "").trim();
        if (path && !path.startsWith("/")) path = "/" + path;
        const params = new URLSearchParams();
        for (const line of (v.q ?? "").split("\n")) {
          const t = line.trim();
          if (!t || t.startsWith("#")) continue;
          const eq = t.indexOf("=");
          if (eq === -1) return { error: `Query line "${t}" needs key=value.` };
          params.append(t.slice(0, eq).trim(), t.slice(eq + 1).trim());
        }
        const qs = params.toString();
        const frag = (v.frag ?? "").trim();
        return `${v.scheme ?? "https"}://${host}${port ? ":" + port : ""}${path || "/"}${qs ? "?" + qs : ""}${frag ? "#" + encodeURIComponent(frag) : ""}`;
      }}
    />
  );
}

function QueryStringTool() {
  return (
    <Gen
      button="Build query string"
      fileName="query.txt"
      fields={[{ key: "q", label: "Lines of key=value", type: "textarea", placeholder: "q=hello world\npage=2", required: true }]}
      generate={(v) => {
        const params = new URLSearchParams();
        let n = 0;
        for (const line of (v.q ?? "").split("\n")) {
          const t = line.trim();
          if (!t || t.startsWith("#")) continue;
          const eq = t.indexOf("=");
          if (eq === -1) return { error: `Line "${t}" needs key=value.` };
          params.append(t.slice(0, eq).trim(), t.slice(eq + 1).trim());
          n++;
        }
        if (!n) return { error: "No pairs found." };
        return "?" + params.toString();
      }}
    />
  );
}

const ENTITY_ROWS: string[][] = [
  ["&amp;", "&", "U+0026", "Ampersand"],
  ["&lt;", "<", "U+003C", "Less than"],
  ["&gt;", ">", "U+003E", "Greater than"],
  ["&quot;", '"', "U+0022", "Double quote"],
  ["&apos;", "'", "U+0027", "Single quote"],
  ["&nbsp;", " ", "U+00A0", "Non-breaking space"],
  ["&copy;", "©", "U+00A9", "Copyright"],
  ["&reg;", "®", "U+00AE", "Registered"],
  ["&trade;", "™", "U+2122", "Trademark"],
  ["&euro;", "€", "U+20AC", "Euro"],
  ["&pound;", "£", "U+00A3", "Pound"],
  ["&yen;", "¥", "U+00A5", "Yen"],
  ["&cent;", "¢", "U+00A2", "Cent"],
  ["&sect;", "§", "U+00A7", "Section"],
  ["&hellip;", "…", "U+2026", "Ellipsis"],
  ["&mdash;", "—", "U+2014", "Em dash"],
  ["&ndash;", "–", "U+2013", "En dash"],
  ["&lsquo;", "‘", "U+2018", "Left single quote"],
  ["&rsquo;", "’", "U+2019", "Right single quote"],
  ["&ldquo;", "“", "U+201C", "Left double quote"],
  ["&rdquo;", "”", "U+201D", "Right double quote"],
  ["&bull;", "•", "U+2022", "Bullet"],
  ["&middot;", "·", "U+00B7", "Middle dot"],
  ["&times;", "×", "U+00D7", "Multiply"],
  ["&divide;", "÷", "U+00F7", "Divide"],
  ["&plusmn;", "±", "U+00B1", "Plus-minus"],
  ["&para;", "¶", "U+00B6", "Pilcrow"],
  ["&deg;", "°", "U+00B0", "Degree"],
  ["&frac12;", "½", "U+00BD", "One half"],
  ["&frac14;", "¼", "U+00BC", "One quarter"],
  ["&laquo;", "«", "U+00AB", "Left guillemet"],
  ["&raquo;", "»", "U+00BB", "Right guillemet"],
  ["&iexcl;", "¡", "U+00A1", "Inverted !"],
  ["&iquest;", "¿", "U+00BF", "Inverted ?"],
  ["&larr;", "←", "U+2190", "Left arrow"],
  ["&rarr;", "→", "U+2192", "Right arrow"],
  ["&uarr;", "↑", "U+2191", "Up arrow"],
  ["&darr;", "↓", "U+2193", "Down arrow"],
];

function HtmlEntityLookupTool() {
  return <RefTable columns={["Entity", "Char", "Code point", "Name"]} rows={ENTITY_ROWS} searchPlaceholder="Search entity… e.g. arrow" />;
}

function UnicodeInspectorTool() {
  return (
    <TextOp
      button="Inspect"
      placeholder="Paste characters to inspect…"
      fileName="unicode-inspection.txt"
      process={(t) => {
        const lines: string[] = [];
        let i = 0;
        for (const ch of t) {
          if (ch === "\n") continue;
          const cp = ch.codePointAt(0) as number;
          const bytes = Array.from(te.encode(ch))
            .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
            .join(" ");
          lines.push(`${i + 1}. "${ch}"  U+${cp.toString(16).toUpperCase().padStart(4, "0")}  dec ${cp}  UTF-8 ${bytes}`);
          i++;
          if (i >= 200) {
            lines.push("… (first 200 characters shown)");
            break;
          }
        }
        if (!lines.length) return { error: "No characters to inspect." };
        return { output: lines.join("\n"), stats: [["Characters", String(i)]] };
      }}
    />
  );
}

function CharcodeInspectorTool() {
  return (
    <TextOp
      button="Convert to characters"
      placeholder="U+0041 0x42 67, 68"
      fileName="chars.txt"
      process={(t) => {
        const parts = t.split(/[\s,;]+/).filter((p) => p !== "");
        if (!parts.length) return { error: "Enter codes like U+0041, 0x41 or 65." };
        let out = "";
        for (const p of parts) {
          let n: number | null = null;
          let m = /^[Uu]\+([0-9A-Fa-f]{1,6})$/.exec(p);
          if (m) n = parseInt(m[1] as string, 16);
          else if (/^0x[0-9A-Fa-f]+$/.test(p)) n = parseInt(p, 16);
          else if (/^\d+$/.test(p)) n = Number(p);
          if (n === null || n < 0 || n > 0x10ffff) return { error: `"${p}" is not a valid code point (0–1114111).` };
          try {
            out += String.fromCodePoint(n);
          } catch {
            return { error: `"${p}" is not an assignable code point.` };
          }
        }
        return out;
      }}
    />
  );
}

function ColorConverterTool() {
  return (
    <Calc
      button="Convert colour"
      fields={[{ key: "c", label: "Colour (#rrggbb, rgb(), hsl())", type: "text", placeholder: "#4f46e5", required: true }]}
      compute={(v) => {
        try {
          const [r, g, b] = parseColor(v.c ?? "");
          const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
          const [h, s, l] = rgbToHsl(r, g, b);
          return {
            rows: [
              ["HEX", hex],
              ["RGB", `rgb(${r}, ${g}, ${b})`],
              ["HSL", `hsl(${h}, ${s}%, ${l}%)`],
            ],
          };
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Cannot parse colour." };
        }
      }}
    />
  );
}

function CssBeautifierTool() {
  return (
    <TextOp
      button="Beautify CSS"
      fileName="beautified.css"
      process={(t) => `${simpleCssBeautify(t)}\n\n/* Simple brace-based printer: check complex selectors by hand. */`}
    />
  );
}

function JsBeautifierTool() {
  return (
    <TextOp
      button="Beautify JS"
      fileName="beautified.js"
      process={(t) => `${simpleJsBeautify(t)}\n\n// Simple string-aware printer: verify logic before shipping.`}
    />
  );
}

function SqlMinifierTool() {
  return (
    <TextOp
      button="Minify SQL"
      fileName="minified.sql"
      process={(t) => {
        const min = minifySql(t);
        return { output: min, stats: [["Before", `${t.length} chars`], ["After", `${min.length} chars`]] };
      }}
    />
  );
}

function MarkdownToHtmlTool() {
  return (
    <TextOp
      button="Render HTML"
      fileName="output.html"
      process={(t) => {
        const html = markdownToHtmlSrc(t);
        const note = "<!-- Subset: headings, bold, italic, code, links, lists, quotes, hr, fenced blocks. Raw HTML was escaped. -->\n";
        return note + html;
      }}
    />
  );
}

function CronExplainerTool() {
  return (
    <Calc
      button="Explain"
      fields={[{ key: "c", label: "Cron (5 fields)", type: "text", placeholder: "*/15 9-17 * * 1-5", required: true }]}
      compute={(v) => {
        const fields = (v.c ?? "").trim().split(/\s+/);
        if (fields.length !== 5) return { error: "Enter exactly 5 fields: minute hour day month weekday." };
        try {
          return {
            rows: fields.map((f, i): [string, string] => [CRON_NAMES[i] as string, describeCronField(f as string, i)]),
            note: "Explains schedule shape only — not the next run time.",
          };
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Invalid cron expression." };
        }
      }}
    />
  );
}

function SemverComparatorTool() {
  return (
    <Calc
      button="Compare"
      fields={[
        { key: "a", label: "Version A", type: "text", def: "1.2.3", required: true },
        { key: "b", label: "Version B", type: "text", def: "1.3.0", required: true },
      ]}
      compute={(v) => {
        try {
          const c = compareSemver(v.a ?? "", v.b ?? "");
          return {
            rows: [
              ["Result", c === 0 ? "Equal" : c < 0 ? "B is newer" : "A is newer"],
              ["A parsed", `${parseSemver(v.a ?? "").n.join(".")}${parseSemver(v.a ?? "").pre ? "-" + parseSemver(v.a ?? "").pre : ""}`],
              ["B parsed", `${parseSemver(v.b ?? "").n.join(".")}${parseSemver(v.b ?? "").pre ? "-" + parseSemver(v.b ?? "").pre : ""}`],
            ],
            note: "Release beats prerelease at equal numbers (1.0.0 > 1.0.0-beta).",
          };
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Invalid version." };
        }
      }}
    />
  );
}

function ChmodTool() {
  return (
    <Calc
      button="Convert"
      fields={[{ key: "p", label: "Octal (755) or symbolic (rwxr-xr-x)", type: "text", required: true }]}
      compute={(v) => {
        const p = (v.p ?? "").trim();
        if (/^[0-7]{3,4}$/.test(p)) {
          const digits = p.length === 4 ? p.slice(1) : p;
          const sym = octalToSymbolic(digits);
          const who = ["Owner", "Group", "Others"];
          const rows: [string, string][] = [
            ["Symbolic", sym],
            ["Octal", digits],
          ];
          [0, 1, 2].forEach((i) => {
            const d = Number(digits[i]);
            const bits: string[] = [];
            if (d & 4) bits.push("read");
            if (d & 2) bits.push("write");
            if (d & 1) bits.push("execute");
            rows.push([who[i] as string, bits.join(" + ") || "none"]);
          });
          return { rows };
        }
        if (/^[rwx-]{9}$/.test(p)) {
          let oct = "";
          for (let i = 0; i < 9; i += 3) {
            const tri = p.slice(i, i + 3);
            oct += String((tri[0] === "r" ? 4 : 0) + (tri[1] === "w" ? 2 : 0) + (tri[2] === "x" ? 1 : 0));
          }
          return { rows: [["Octal", oct], ["Symbolic", p]] };
        }
        return { error: "Enter 3–4 octal digits (e.g. 755) or 9 symbols (e.g. rwxr-xr-x)." };
      }}
    />
  );
}

function sortJsonKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortJsonKeys);
  if (v !== null && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = sortJsonKeys((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}

function JsonKeySorterTool() {
  return (
    <TextOp
      button="Sort keys"
      fileName="sorted.json"
      process={(t) => {
        let v: unknown;
        try {
          v = JSON.parse(t);
        } catch {
          return { error: "Invalid JSON." };
        }
        return JSON.stringify(sortJsonKeys(v), null, 2);
      }}
    />
  );
}

function diffJson(a: unknown, b: unknown, path: string, out: string[]): void {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  if (a !== null && b !== null && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    for (const k of Object.keys(ao)) {
      if (!(k in bo)) out.push(`- ${path}.${k} removed (was ${JSON.stringify(ao[k])})`);
      else diffJson(ao[k], bo[k], `${path}.${k}`, out);
    }
    for (const k of Object.keys(bo)) {
      if (!(k in ao)) out.push(`+ ${path}.${k} added (= ${JSON.stringify(bo[k])})`);
    }
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const L = Math.max(a.length, b.length);
    for (let i = 0; i < L; i++) {
      if (i >= a.length) out.push(`+ ${path}[${i}] added (= ${JSON.stringify(b[i])})`);
      else if (i >= b.length) out.push(`- ${path}[${i}] removed (was ${JSON.stringify(a[i])})`);
      else diffJson(a[i], b[i], `${path}[${i}]`, out);
    }
    return;
  }
  out.push(`~ ${path}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
}

function JsonDiffTool() {
  return (
    <Gen
      button="Diff JSON"
      fileName="json-diff.txt"
      fields={[
        { key: "a", label: "Original JSON", type: "textarea", required: true },
        { key: "b", label: "Revised JSON", type: "textarea", required: true },
      ]}
      generate={(v) => {
        let a: unknown;
        let b: unknown;
        try {
          a = JSON.parse(v.a ?? "");
        } catch {
          return { error: "Original is not valid JSON." };
        }
        try {
          b = JSON.parse(v.b ?? "");
        } catch {
          return { error: "Revised is not valid JSON." };
        }
        const out: string[] = [];
        diffJson(a, b, "$", out);
        if (!out.length) return "No differences — the documents are identical.";
        return out.slice(0, 500).join("\n") + (out.length > 500 ? `\n… (${out.length - 500} more)` : "");
      }}
    />
  );
}

function DotenvFormatterTool() {
  return (
    <TextOp
      button="Format .env"
      fileName=".env"
      process={(t) => {
        const out: string[] = [];
        const bad: string[] = [];
        t.split("\n").forEach((raw, i) => {
          const line = raw.trimEnd();
          if (line.trim() === "" || line.trim().startsWith("#")) {
            out.push(line);
            return;
          }
          const m = /^(export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s?(.*)$/.exec(line.trim());
          if (!m) {
            bad.push(`line ${i + 1}`);
            out.push(line);
            return;
          }
          let val = (m[3] ?? "").trim();
          if (val && !/^(['"]).*\1$/.test(val) && /[\s#]/.test(val)) {
            val = `"${val.replace(/"/g, '\\"')}"`;
          }
          out.push(`${m[2]}=${val}`);
        });
        if (bad.length > 0) return { error: `Bad KEY=value syntax at ${bad.join(", ")}.` };
        return { output: out.join("\n"), stats: [["Lines", String(out.length)]] };
      }}
    />
  );
}

const GITIGNORE_TEMPLATES: Record<string, string> = {
  general: "# General\n.DS_Store\nThumbs.db\n*.log\n.env\n.idea/\n.vscode/\n",
  node: "# Node\nnode_modules/\ndist/\nbuild/\ncoverage/\n*.log\n.env\n.npm/\n.next/\n",
  python: "# Python\n__pycache__/\n*.pyc\n.venv/\nvenv/\ndist/\nbuild/\n*.egg-info/\n.env\n.pytest_cache/\n",
  java: "# Java\ntarget/\n*.class\n*.jar\n.gradle/\nbuild/\n.idea/\n*.iml\n",
  go: "# Go\nbin/\n*.exe\n*.test\nvendor/\n.env\n",
  rust: "# Rust\ntarget/\nCargo.lock\n*.rs.bk\n.env\n",
};

function GitignoreTool() {
  return (
    <Gen
      button="Generate"
      fileName=".gitignore"
      fields={[
        {
          key: "stack", label: "Template", type: "select",
          options: [
            { value: "general", label: "General" },
            { value: "node", label: "Node.js" },
            { value: "python", label: "Python" },
            { value: "java", label: "Java" },
            { value: "go", label: "Go" },
            { value: "rust", label: "Rust" },
          ],
        },
        { key: "extra", label: "Extra lines (one per line, optional)", type: "textarea" },
      ]}
      generate={(v) => {
        const base = GITIGNORE_TEMPLATES[v.stack ?? "general"] ?? GITIGNORE_TEMPLATES.general;
        const extra = (v.extra ?? "").split("\n").map((l) => l.trim()).filter((l) => l !== "");
        const lines = [...new Set([...(base as string).trim().split("\n"), ...extra])];
        return `# Starter .gitignore — review before committing.\n${lines.join("\n")}\n`;
      }}
    />
  );
}

function AsciiTableTool() {
  const rows: string[][] = [];
  for (let i = 0; i < 128; i++) {
    const ch = i >= 32 && i < 127 ? String.fromCharCode(i) : i === 127 ? "DEL" : ["NUL", "SOH", "STX", "ETX", "EOT", "ENQ", "ACK", "BEL", "BS", "TAB", "LF", "VT", "FF", "CR", "SO", "SI", "DLE", "DC1", "DC2", "DC3", "DC4", "NAK", "SYN", "ETB", "CAN", "EM", "SUB", "ESC", "FS", "GS", "RS", "US"][i] as string;
    rows.push([String(i), "0x" + i.toString(16).toUpperCase().padStart(2, "0"), i.toString(2).padStart(8, "0"), ch]);
  }
  return <RefTable columns={["Dec", "Hex", "Binary", "Char"]} rows={rows} searchPlaceholder="Search code… e.g. 65 or LF" />;
}

const PORT_ROWS: string[][] = [
  ["20/21", "FTP", "TCP", "File transfer"],
  ["22", "SSH", "TCP", "Secure shell"],
  ["23", "Telnet", "TCP", "Unencrypted shell (legacy)"],
  ["25", "SMTP", "TCP", "Email sending"],
  ["53", "DNS", "TCP/UDP", "Domain names"],
  ["67/68", "DHCP", "UDP", "IP assignment"],
  ["69", "TFTP", "UDP", "Trivial file transfer"],
  ["80", "HTTP", "TCP", "Web traffic"],
  ["110", "POP3", "TCP", "Email retrieval"],
  ["143", "IMAP", "TCP", "Email retrieval"],
  ["161", "SNMP", "UDP", "Network monitoring"],
  ["389", "LDAP", "TCP/UDP", "Directory services"],
  ["443", "HTTPS", "TCP", "Secure web traffic"],
  ["465", "SMTPS", "TCP", "Secure email sending"],
  ["587", "SMTP submission", "TCP", "Email submission"],
  ["993", "IMAPS", "TCP", "Secure IMAP"],
  ["995", "POP3S", "TCP", "Secure POP3"],
  ["1433", "MSSQL", "TCP", "SQL Server"],
  ["1521", "Oracle DB", "TCP", "Oracle database"],
  ["3306", "MySQL", "TCP", "MySQL / MariaDB"],
  ["3389", "RDP", "TCP/UDP", "Remote desktop"],
  ["5432", "PostgreSQL", "TCP", "Postgres database"],
  ["5672", "AMQP", "TCP", "RabbitMQ messaging"],
  ["6379", "Redis", "TCP", "Redis cache"],
  ["6443", "Kubernetes API", "TCP", "K8s control plane"],
  ["27017", "MongoDB", "TCP", "Mongo database"],
  ["8080", "HTTP alt", "TCP", "Dev servers / proxies"],
  ["8443", "HTTPS alt", "TCP", "Alt secure web"],
  ["9200", "Elasticsearch", "TCP", "Search engine HTTP"],
  ["11211", "Memcached", "TCP/UDP", "Memory cache"],
];

function PortLookupTool() {
  return <RefTable columns={["Port", "Service", "Proto", "Use"]} rows={PORT_ROWS} searchPlaceholder="Search port or service… e.g. 443" />;
}

function Base64UrlEncoderTool() {
  return (
    <TextOp button="Encode" fileName="base64url.txt" process={(t) => b64urlEncodeText(t)} />
  );
}

function Base64UrlDecoderTool() {
  return (
    <TextOp
      button="Decode"
      fileName="base64url-decoded.txt"
      process={(t) => b64urlDecode(t.replace(/\s+/g, ""))}
    />
  );
}

function JwtExpiryTool() {
  return (
    <Calc
      button="Check expiry"
      fields={[{ key: "t", label: "JWT", type: "textarea", required: true }]}
      compute={(v) => {
        try {
          const p = jwtSegment(v.t ?? "", 1);
          const exp = p.exp;
          if (typeof exp !== "number" || !Number.isFinite(exp)) {
            return { rows: [["exp claim", "Missing — token carries no expiry"]] };
          }
          const d = new Date(exp * 1000);
          const expired = d.getTime() < Date.now();
          return {
            rows: [
              ["Expiry (UTC)", d.toISOString().replace("T", " ").slice(0, 19) + " UTC"],
              ["Status", expired ? "Expired" : "Still valid"],
              ["Unix exp", String(exp)],
            ],
            note: "Decode only — this does not verify the signature.",
          };
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Cannot decode token." };
        }
      }}
    />
  );
}

function CssUnitConverterTool() {
  return (
    <Calc
      button="Convert"
      fields={[
        { key: "n", label: "Value", type: "number", def: "16", required: true },
        {
          key: "from", label: "From", type: "select",
          options: [
            { value: "px", label: "px" },
            { value: "rem", label: "rem" },
            { value: "em", label: "em" },
            { value: "pt", label: "pt" },
            { value: "pct", label: "%" },
          ],
        },
        {
          key: "to", label: "To", type: "select",
          options: [
            { value: "px", label: "px" },
            { value: "rem", label: "rem" },
            { value: "em", label: "em" },
            { value: "pt", label: "pt" },
            { value: "pct", label: "%" },
          ],
        },
        { key: "root", label: "Root font size (px)", type: "number", def: "16", required: true },
      ]}
      compute={(v) => {
        const n = Number((v.n ?? "").replace(/,/g, ""));
        const root = Number((v.root ?? "").replace(/,/g, ""));
        if (!Number.isFinite(n)) return { error: "Enter a valid value." };
        if (!Number.isFinite(root) || root <= 0 || root > 200) return { error: "Root font size must be 1–200px." };
        const toPx = (x: number, u: string): number | null => {
          if (u === "px") return x;
          if (u === "rem" || u === "em") return x * root;
          if (u === "pt") return (x * 4) / 3;
          if (u === "pct") return (x / 100) * root;
          return null;
        };
        const fromPx = (px: number, u: string): number | null => {
          if (u === "px") return px;
          if (u === "rem" || u === "em") return px / root;
          if (u === "pt") return (px * 3) / 4;
          if (u === "pct") return (px / root) * 100;
          return null;
        };
        const px = toPx(n, v.from ?? "px");
        const out = px === null ? null : fromPx(px, v.to ?? "rem");
        if (px === null || out === null || !Number.isFinite(out)) return { error: "Conversion not defined." };
        const factor = `${v.from} → ${v.to}`;
        return {
          rows: [
            ["Result", `${Number(out.toPrecision(8))} ${v.to}`],
            ["Via px", `${Number(px.toPrecision(8))}px`],
          ],
          note: `96px = 72pt; rem/em relative to ${root}px. (${factor})`,
        };
      }}
    />
  );
}

function shQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function CurlBuilderTool() {
  return (
    <Gen
      button="Build curl"
      fileName="request.sh"
      fields={[
        {
          key: "method", label: "Method", type: "select",
          options: [
            { value: "GET", label: "GET" },
            { value: "POST", label: "POST" },
            { value: "PUT", label: "PUT" },
            { value: "PATCH", label: "PATCH" },
            { value: "DELETE", label: "DELETE" },
          ],
        },
        { key: "url", label: "URL", type: "text", placeholder: "https://api.example.com/items", required: true },
        { key: "headers", label: "Headers (Name: value per line)", type: "textarea" },
        { key: "body", label: "Body (optional)", type: "textarea" },
      ]}
      generate={(v) => {
        const url = (v.url ?? "").trim();
        if (!/^https?:\/\/\S+$/.test(url)) return { error: "Enter a valid http(s) URL." };
        const parts = ["curl", "-X", v.method ?? "GET", shQuote(url)];
        for (const line of (v.headers ?? "").split("\n")) {
          const t = line.trim();
          if (!t) continue;
          if (!/^[^:]+:\s*.+/.test(t)) return { error: `Header "${t}" needs "Name: value".` };
          parts.push("-H", shQuote(t));
        }
        const body = v.body ?? "";
        if (body) parts.push("--data-raw", shQuote(body));
        return parts.join(" ");
      }}
    />
  );
}

function jsStr(s: string): string {
  return JSON.stringify(s);
}

function FetchSnippetTool() {
  return (
    <Gen
      button="Generate fetch()"
      fileName="fetch.js"
      fields={[
        {
          key: "method", label: "Method", type: "select",
          options: [
            { value: "GET", label: "GET" },
            { value: "POST", label: "POST" },
            { value: "PUT", label: "PUT" },
            { value: "PATCH", label: "PATCH" },
            { value: "DELETE", label: "DELETE" },
          ],
        },
        { key: "url", label: "URL", type: "text", placeholder: "https://api.example.com/items", required: true },
        { key: "headers", label: "Headers (Name: value per line)", type: "textarea" },
        { key: "body", label: "Body (optional)", type: "textarea" },
      ]}
      generate={(v) => {
        const url = (v.url ?? "").trim();
        if (!/^https?:\/\/\S+$/.test(url)) return { error: "Enter a valid http(s) URL." };
        const headers: Record<string, string> = {};
        for (const line of (v.headers ?? "").split("\n")) {
          const t = line.trim();
          if (!t) continue;
          const m = /^([^:]+):\s*(.+)$/.exec(t);
          if (!m) return { error: `Header "${t}" needs "Name: value".` };
          headers[(m[1] as string).trim()] = (m[2] as string).trim();
        }
        const body = v.body ?? "";
        const lines = [
          `const res = await fetch(${jsStr(url)}, {`,
          `  method: ${jsStr(v.method ?? "GET")},`,
        ];
        if (Object.keys(headers).length > 0) lines.push(`  headers: ${JSON.stringify(headers, null, 2).split("\n").join("\n  ")},`);
        if (body) lines.push(`  body: ${jsStr(body)},`);
        lines.push("});", "const data = await res.json();", "console.log(res.status, data);");
        return `// Review the URL before running.\n${lines.join("\n")}`;
      }}
    />
  );
}

function WebhookPayloadTool() {
  return (
    <TextOp
      button="Format payload"
      fileName="webhook.json"
      process={(t) => {
        let v: unknown;
        try {
          v = JSON.parse(t);
        } catch {
          return { error: "Invalid JSON payload." };
        }
        const pretty = JSON.stringify(v, null, 2);
        const bytes = te.encode(pretty).length;
        const keys = v !== null && typeof v === "object" && !Array.isArray(v) ? Object.keys(v).length : Array.isArray(v) ? v.length : 0;
        return {
          output: pretty,
          stats: [
            ["Bytes", String(bytes)],
            ["Top-level keys/items", String(keys)],
          ],
        };
      }}
    />
  );
}
