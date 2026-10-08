"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stat } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { FieldLabel, Textarea, Input } from "../../ui/Input";
import { copyText, downloadTextFile } from "@/lib/engine/formatters";
import { randomInt, randomBytes, bytesToHex, bytesToBase64, bytesToBase64Url, pickChars } from "@/lib/engine/crypto";

function useCopy(): [boolean, (t: string) => void] {
  const [copied, setCopied] = useState(false);
  return [copied, async (t: string) => {
    if (t && (await copyText(t))) { setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
  }];
}

function CopyBar({ onCopy, copied, disabled, onRegen, onDownload }: {
  onCopy: () => void; copied: boolean; disabled: boolean; onRegen?: () => void; onDownload?: () => void;
}) {
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      {onRegen && <Button type="button" onClick={onRegen}>Regenerate</Button>}
      <Button type="button" variant="secondary" onClick={onCopy} disabled={disabled}>{copied ? "Copied ✓" : "Copy"}</Button>
      {onDownload && <Button type="button" variant="ghost" onClick={onDownload} disabled={disabled}>Download</Button>}
    </div>
  );
}

/* ---------- Password ---------- */

const SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
};
const AMBIGUOUS = new Set("Il1O0|`'\"".split(""));

function strengthInfo(pw: string): { label: string; score: number } {
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 32;
  const bits = pw.length * Math.log2(Math.max(pool, 2));
  if (bits < 40) return { label: "Weak", score: 1 };
  if (bits < 60) return { label: "Fair", score: 2 };
  if (bits < 80) return { label: "Strong", score: 3 };
  return { label: "Excellent", score: 4 };
}

export function PasswordGeneratorTool() {
  const [length, setLength] = useState("16");
  const [opts, setOpts] = useState({ lower: true, upper: true, digits: true, symbols: true, noAmbiguous: true });
  const [pw, setPw] = useState(() => makePassword(16, { lower: true, upper: true, digits: true, symbols: true, noAmbiguous: true }));
  const [copied, copy] = useCopy();
  function makePassword(len: number, o: typeof opts): string {
    let pool = "";
    if (o.lower) pool += SETS.lower;
    if (o.upper) pool += SETS.upper;
    if (o.digits) pool += SETS.digits;
    if (o.symbols) pool += SETS.symbols;
    if (o.noAmbiguous) pool = pool.split("").filter((c) => !AMBIGUOUS.has(c)).join("");
    if (!pool) return "";
    return pickChars(pool, Math.max(4, Math.min(128, len)));
  }
  const regen = () => setPw(makePassword(Number(length) || 16, opts));
  const strength = useMemo(() => strengthInfo(pw), [pw]);
  const toggle = (k: keyof typeof opts) => {
    const next = { ...opts, [k]: !opts[k] };
    setOpts(next);
    setPw(makePassword(Number(length) || 16, next));
  };
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="pw-len">Length (4–128)</FieldLabel>
          <Input id="pw-len" type="number" min={4} max={128} value={length}
            onChange={(e) => { setLength(e.target.value); setPw(makePassword(Number(e.target.value) || 16, opts)); }} className="font-mono" />
        </div>
        <div className="flex items-end pb-1">
          <p aria-live="polite" className="text-sm font-bold">Strength: <span className={strength.score >= 3 ? "text-emerald-600 dark:text-emerald-400" : strength.score === 2 ? "text-amber-600" : "text-danger-600"}>{strength.label}</span></p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {[["lower", "Lowercase (a–z)"], ["upper", "Uppercase (A–Z)"], ["digits", "Digits (0–9)"], ["symbols", "Symbols (!@#…)"], ["noAmbiguous", "Exclude ambiguous (Il1O0)"]].map(([k, l]) => (
          <label key={k} className="flex min-h-[44px] items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={opts[k as keyof typeof opts]} onChange={() => toggle(k as keyof typeof opts)} className="h-5 w-5 accent-brand-600" /> {l}
          </label>
        ))}
      </div>
      {!pw && <p role="alert" className="mt-2 text-sm font-medium text-danger-600">Enable at least one character set.</p>}
      <FieldLabel htmlFor="pw-output">Generated password</FieldLabel>
      <Textarea id="pw-output" value={pw} readOnly rows={3} className="font-mono text-base break-all" aria-live="polite" />
      <CopyBar onCopy={() => copy(pw)} copied={copied} disabled={!pw} onRegen={regen} />
      <p className="mt-2 text-xs text-(--muted)">Generated on-device with crypto randomness — nothing is stored or sent anywhere.</p>
    </div>
  );
}

/* ---------- Random number ---------- */

export function RandomNumberGeneratorTool() {
  const [min, setMin] = useState("1");
  const [max, setMax] = useState("100");
  const [count, setCount] = useState("1");
  const [unique, setUnique] = useState(false);
  const [sorted, setSorted] = useState(false);
  const [result, setResult] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [copied, copy] = useCopy();
  const generate = () => {
    const lo = Number(min), hi = Number(max), n = Math.max(1, Math.min(1000, Number(count) || 1));
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) { setError("Enter valid min and max."); return; }
    const [a, b] = lo <= hi ? [Math.ceil(lo), Math.floor(hi)] : [Math.ceil(hi), Math.floor(lo)];
    if (unique && n > b - a + 1) { setError(`Only ${b - a + 1} unique numbers exist in that range — lower the count or widen the range.`); return; }
    setError("");
    const out: number[] = [];
    const seen = new Set<number>();
    let guard = 0;
    while (out.length < n && guard++ < n * 50 + 100) {
      const v = randomInt(a, b).value;
      if (unique && seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
    setResult(sorted ? [...out].sort((x, y) => x - y) : out);
  };
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div><FieldLabel htmlFor="rng-min">Min</FieldLabel><Input id="rng-min" type="number" value={min} onChange={(e) => setMin(e.target.value)} /></div>
        <div><FieldLabel htmlFor="rng-max">Max</FieldLabel><Input id="rng-max" type="number" value={max} onChange={(e) => setMax(e.target.value)} /></div>
        <div><FieldLabel htmlFor="rng-count">How many (≤1000)</FieldLabel><Input id="rng-count" type="number" min={1} max={1000} value={count} onChange={(e) => setCount(e.target.value)} /></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        <label className="flex min-h-[44px] items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} className="h-5 w-5 accent-brand-600" /> No repeats
        </label>
        <label className="flex min-h-[44px] items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={sorted} onChange={(e) => setSorted(e.target.checked)} className="h-5 w-5 accent-brand-600" /> Sorted
        </label>
      </div>
      <div className="mt-3"><Button type="button" onClick={generate}>Generate</Button></div>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-danger-600">{error}</p>}
      {result.length > 0 && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) p-5">
          <p className="text-2xl font-extrabold tabular-nums break-words">{result.join(", ")}</p>
        </div>
      )}
      <CopyBar onCopy={() => copy(result.join(", "))} copied={copied} disabled={!result.length} onRegen={result.length ? generate : undefined} />
    </div>
  );
}

/* ---------- Random string ---------- */

export function RandomStringGeneratorTool() {
  const [length, setLength] = useState("12");
  const [count, setCount] = useState("5");
  const [charset, setCharset] = useState("alnum");
  const [prefix, setPrefix] = useState("");
  const [copied, copy] = useCopy();
  const pools: Record<string, string> = {
    alnum: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    alpha: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    lower: "abcdefghijklmnopqrstuvwxyz",
    numeric: "0123456789",
    hex: "0123456789abcdef",
  };
  const makeList = (len: number, n: number, pool: string, pre: string) =>
    Array.from({ length: n }, () => `${pre}${pickChars(pool, len)}`);
  const [list, setList] = useState<string[]>(() =>
    makeList(12, 5, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", ""),
  );
  const generate = () => {
    const len = Math.max(1, Math.min(256, Number(length) || 12));
    const n = Math.max(1, Math.min(200, Number(count) || 1));
    const pool = pools[charset] ?? pools.alnum;
    setList(makeList(len, n, pool, prefix));
  };
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div><FieldLabel htmlFor="rs-len">Length</FieldLabel><Input id="rs-len" type="number" min={1} max={256} value={length} onChange={(e) => setLength(e.target.value)} /></div>
        <div><FieldLabel htmlFor="rs-count">How many</FieldLabel><Input id="rs-count" type="number" min={1} max={200} value={count} onChange={(e) => setCount(e.target.value)} /></div>
        <div><FieldLabel htmlFor="rs-set">Charset</FieldLabel>
          <select id="rs-set" value={charset} onChange={(e) => setCharset(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px]">
            <option value="alnum">A–Z a–z 0–9</option>
            <option value="alpha">Letters only</option>
            <option value="lower">Lowercase only</option>
            <option value="numeric">Digits only</option>
            <option value="hex">Hex</option>
          </select>
        </div>
        <div><FieldLabel htmlFor="rs-prefix">Prefix (optional)</FieldLabel><Input id="rs-prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="id_" /></div>
      </div>
      <div className="mt-3"><Button type="button" onClick={generate}>Generate strings</Button></div>
      <FieldLabel htmlFor="rs-output">Results</FieldLabel>
      <Textarea id="rs-output" value={list.join("\n")} readOnly rows={Math.min(10, Math.max(4, list.length + 1))} className="font-mono text-sm" aria-live="polite" />
      <CopyBar onCopy={() => copy(list.join("\n"))} copied={copied} disabled={!list[0]} onDownload={() => downloadTextFile("random-strings.txt", list.join("\n"))} />
    </div>
  );
}

/* ---------- Color ---------- */

function randomHexColor(): string {
  const { bytes } = randomBytes(3);
  return `#${bytesToHex(bytes).toUpperCase()}`;
}
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function ColorGeneratorTool() {
  const [colors, setColors] = useState<string[]>(() => Array.from({ length: 5 }, randomHexColor));
  const [locked, setLocked] = useState<boolean[]>([false, false, false, false, false]);
  const [, copy] = useCopy();
  const [copiedIdx, setCopiedIdx] = useState(-1);
  const regenerate = () => setColors((prev) => prev.map((c, i) => (locked[i] ? c : randomHexColor())));
  const copyOne = async (hex: string, i: number) => {
    if (await copyText(hex)) { setCopiedIdx(i); window.setTimeout(() => setCopiedIdx(-1), 1500); }
  };
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5" role="list" aria-label="Generated colours">
        {colors.map((hex, i) => {
          const [r, g, b] = hexToRgb(hex);
          const [h, s, l] = hexToHsl(hex);
          return (
            <div key={`${hex}-${i}`} role="listitem" className="overflow-hidden rounded-2xl border border-(--border)">
              <button type="button" onClick={() => copyOne(hex, i)} aria-label={`Copy ${hex}`}
                className="block h-24 w-full" style={{ background: hex }} />
              <div className="bg-(--surface) p-3">
                <p className="font-mono text-sm font-bold">{copiedIdx === i ? "Copied ✓" : hex}</p>
                <p className="mt-0.5 font-mono text-[11px] text-(--muted)">rgb({r} {g} {b})</p>
                <p className="font-mono text-[11px] text-(--muted)">hsl({h} {s}% {l}%)</p>
                <button type="button" onClick={() => setLocked((prev) => prev.map((v, j) => (j === i ? !v : v)))} aria-pressed={locked[i]}
                  className="mt-2 min-h-[36px] w-full rounded-lg border border-(--border) text-xs font-semibold">
                  {locked[i] ? "🔒 Locked" : "Lock"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <CopyBar onCopy={() => copy(colors.join(" "))} copied={false} disabled={false} onRegen={regenerate}
        onDownload={() => downloadTextFile("palette.css", `:root {\n${colors.map((c, i) => `  --color-${i + 1}: ${c};`).join("\n")}\n}\n`, "text/css")} />
    </div>
  );
}

/* ---------- Secure token ---------- */

export function SecureTokenGeneratorTool() {
  const [format, setFormat] = useState<"hex" | "base64" | "base64url">("hex");
  const [byteLen, setByteLen] = useState("32");
  const [token, setToken] = useState(() => {
    const { bytes } = randomBytes(32);
    return bytesToHex(bytes);
  });
  const [copied, copy] = useCopy();
  const regen = () => {
    const n = Math.max(8, Math.min(128, Number(byteLen) || 32));
    const { bytes } = randomBytes(n);
    setToken(format === "hex" ? bytesToHex(bytes) : format === "base64" ? bytesToBase64(bytes) : bytesToBase64Url(bytes));
  };
  const entropy = useMemo(() => (Math.max(8, Math.min(128, Number(byteLen) || 32)) * 8), [byteLen]);
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="tok-fmt">Format</FieldLabel>
          <select id="tok-fmt" value={format} onChange={(e) => { setFormat(e.target.value as typeof format); }}
            className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px]">
            <option value="hex">Hex</option>
            <option value="base64">Base64</option>
            <option value="base64url">URL-safe Base64</option>
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="tok-len">Bytes (8–128, entropy {entropy} bits)</FieldLabel>
          <Input id="tok-len" type="number" min={8} max={128} value={byteLen} onChange={(e) => setByteLen(e.target.value)} />
        </div>
      </div>
      <FieldLabel htmlFor="tok-output">Token — copy it now, it can&apos;t be recovered</FieldLabel>
      <Textarea id="tok-output" value={token} readOnly rows={4} className="font-mono text-sm break-all" aria-live="polite" />
      <CopyBar onCopy={() => copy(token)} copied={copied} disabled={!token} onRegen={regen} />
    </div>
  );
}

/* ---------- QR (local rendering via canvas; no external calls) ---------- */

export function QrGeneratorTool() {
  const [mode, setMode] = useState<"url" | "text" | "wifi">("url");
  const [text, setText] = useState("https://toolora.example.com");
  const [ssid, setSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [size, setSize] = useState("256");
  const [error, setError] = useState("");
  const [copied, copy] = useCopy();

  const payload = mode === "url" || mode === "text" ? text : ssid ? `WIFI:T:WPA;S:${ssid};P:${wifiPass};;` : "";

  const draw = async (canvas: HTMLCanvasElement | null, download = false) => {
    if (!canvas) return;
    setError("");
    if (!payload.trim()) { setError(mode === "wifi" ? "Enter a Wi-Fi network name." : "Enter content for the QR code."); return; }
    if (payload.length > 2000) { setError("Content is too long for a reliable QR code (keep it under ~2000 characters)."); return; }
    try {
      const mod = await import("qrcode");
      const px = Math.max(128, Math.min(1024, Number(size) || 256));
      await mod.toCanvas(canvas, payload, { width: px, margin: 2, errorCorrectionLevel: "M" });
      if (download) {
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = "toolora-qr.png";
        a.click();
      }
    } catch {
      setError("QR rendering failed in this browser — try shorter content.");
    }
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render on mount and whenever the payload changes (debounced by React batching).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!payload.trim()) return;
    if (payload.length > 2000) return;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("qrcode");
        if (cancelled || !canvasRef.current) return;
        const px = Math.max(128, Math.min(1024, Number(size) || 256));
        await mod.toCanvas(canvasRef.current, payload, { width: px, margin: 2, errorCorrectionLevel: "M" });
      } catch {
        if (!cancelled) setError("QR rendering failed in this browser — try shorter content.");
      }
    })();
    return () => { cancelled = true; };
  }, [payload, size]);

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="QR content type">
        {[["url", "Link / URL"], ["text", "Plain text"], ["wifi", "Wi-Fi"]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setMode(v as typeof mode)} aria-pressed={mode === v}
            className={`min-h-[40px] rounded-full border px-4 text-sm font-semibold ${mode === v ? "border-brand-600 bg-brand-600 text-white" : "border-(--border) text-(--muted)"}`}>{l}</button>
        ))}
      </div>
      {mode === "wifi" ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><FieldLabel htmlFor="qr-ssid">Network name (SSID)</FieldLabel><Input id="qr-ssid" value={ssid} onChange={(e) => setSsid(e.target.value)} placeholder="HomeWiFi" /></div>
          <div><FieldLabel htmlFor="qr-pass">Password</FieldLabel><Input id="qr-pass" value={wifiPass} onChange={(e) => setWifiPass(e.target.value)} placeholder="••••••••" /></div>
        </div>
      ) : (
        <div className="mt-4">
          <FieldLabel htmlFor="qr-text">{mode === "url" ? "URL" : "Text"}</FieldLabel>
          <Textarea id="qr-text" value={text} onChange={(e) => setText(e.target.value)} rows={3} className="font-mono text-sm" placeholder={mode === "url" ? "https://example.com" : "Hello!"} />
        </div>
      )}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="qr-size">Size (px)</FieldLabel>
          <select id="qr-size" value={size} onChange={(e) => setSize(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px]">
            <option value="256">256 — chat & docs</option>
            <option value="512">512 — print</option>
            <option value="128">128 — compact</option>
          </select>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-danger-600">{error}</p>}
      <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-(--surface-2) p-6">
        <canvas ref={canvasRef} aria-label="QR code preview" role="img" className="max-w-full rounded-xl bg-white" />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={() => draw(canvasRef.current)}>Render QR</Button>
          <Button type="button" variant="secondary" onClick={() => draw(canvasRef.current, true)}>Download PNG</Button>
          <Button type="button" variant="ghost" onClick={() => copy(payload)}>{copied ? "Copied ✓" : "Copy content"}</Button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat value={String(payload.length)} label="Characters" />
        <Stat value={payload.length <= 2000 ? "OK" : "Too long"} label="Encodability" />
      </div>
    </div>
  );
}

/* ---------- Strong password (passphrase + random) ---------- */

const PASSPHRASE_WORDS = ["amber", "bridge", "canyon", "drift", "ember", "forest", "glacier", "harbor", "island", "jungle", "karma", "lantern", "meadow", "north", "ocean", "prairie", "quill", "ridge", "sable", "thunder", "umbra", "valley", "willow", "xenon", "yonder", "zephyr"];

export function StrongPasswordGeneratorTool() {
  const [mode, setMode] = useState<"random" | "phrase">("phrase");
  const [words, setWords] = useState("5");
  const [pw, setPw] = useState("harbor-ridge-amber-drift-meadow-42");
  const [copied, copy] = useCopy();

  const regen = () => {
    if (mode === "phrase") {
      const n = Math.max(3, Math.min(10, Number(words) || 5));
      const picked = Array.from({ length: n }, () => PASSPHRASE_WORDS[randomInt(0, PASSPHRASE_WORDS.length - 1).value]);
      setPw(`${picked.join("-")}-${randomInt(10, 99).value}`);
    } else {
      setPw(pickChars("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+", 24));
    }
  };

  return (
    <div>
      <div className="flex gap-2" role="group" aria-label="Password style">
        <Button type="button" variant={mode === "phrase" ? "primary" : "secondary"} onClick={() => setMode("phrase")}>Memorable phrase</Button>
        <Button type="button" variant={mode === "random" ? "primary" : "secondary"} onClick={() => setMode("random")}>Random 24-char</Button>
      </div>
      {mode === "phrase" && (
        <div className="mt-3 max-w-xs">
          <FieldLabel htmlFor="spw-words">Words (3–10)</FieldLabel>
          <Input id="spw-words" type="number" min={3} max={10} value={words} onChange={(e) => setWords(e.target.value)} className="font-mono" />
        </div>
      )}
      <div className="mt-3">
        <FieldLabel htmlFor="spw-output">Strong password</FieldLabel>
        <Textarea id="spw-output" value={pw} readOnly rows={3} className="font-mono text-base break-all" aria-live="polite" />
      </div>
      <CopyBar onCopy={() => copy(pw)} copied={copied} disabled={!pw} onRegen={regen} />
      <p className="mt-2 text-xs text-(--muted)">Passphrases are easier to type and remember; random strings maximise entropy. Generated on-device with crypto randomness.</p>
    </div>
  );
}

/* ---------- Username generator ---------- */

const NAME_A = ["swift", "bright", "silent", "clever", "brave", "calm", "eager", "bold", "cosmic", "daring", "ember", "frost"];
const NAME_B = ["fox", "panda", "tiger", "coder", "maker", "rider", "pixel", "comet", "falcon", "otter", "raven", "wolf"];

export function UsernameGeneratorTool() {
  const [style, setStyle] = useState<"word" | "name">("word");
  const [seed, setSeed] = useState("");
  const [names, setNames] = useState<string[]>(["swiftfox42", "brightcoder17", "silentmaker09"]);
  const [copied, setCopied] = useState("");

  const regen = () => {
    const clean = seed.trim().toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16);
    const out: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const num = randomInt(1, 99).value;
      if (style === "name" && clean) {
        const cands = [`${clean}${num}`, `${clean}_${NAME_B[randomInt(0, NAME_B.length - 1).value]}`, `${NAME_A[randomInt(0, NAME_A.length - 1).value]}${clean}`, `${clean}${NAME_A[randomInt(0, NAME_A.length - 1).value]}${num}`, `the${clean}${num}`, `${clean}.dev${num}`];
        out.push(cands[i % cands.length]!);
      } else {
        out.push(`${NAME_A[randomInt(0, NAME_A.length - 1).value]}${NAME_B[randomInt(0, NAME_B.length - 1).value]}${num}`);
      }
    }
    setNames(out);
  };

  const copy = async (n: string) => {
    if (await copyText(n)) {
      setCopied(n);
      window.setTimeout(() => setCopied(""), 2000);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="un-seed">Your name or word (optional)</FieldLabel>
          <Input id="un-seed" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="e.g. asha" maxLength={16} />
        </div>
        <div>
          <FieldLabel htmlFor="un-style">Style</FieldLabel>
          <select id="un-style" value={style} onChange={(e) => setStyle(e.target.value as typeof style)}
            className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px]">
            <option value="word">Random words</option>
            <option value="name">Based on my word</option>
          </select>
        </div>
      </div>
      <div className="mt-3"><Button type="button" onClick={regen}>Generate usernames</Button></div>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-live="polite">
        {names.map((n) => (
          <li key={n}>
            <button
              type="button"
              onClick={() => void copy(n)}
              className="w-full cursor-pointer rounded-xl border border-(--border) bg-(--surface) px-4 py-3 text-left font-mono font-bold hover:bg-(--surface-2)"
              title="Click to copy"
            >
              {copied === n ? "Copied ✓" : n}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-(--muted)">Always check availability on the platform you want — taken names are common.</p>
    </div>
  );
}
