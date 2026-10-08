"use client";

import { useState } from "react";
import { Button } from "../../ui/Button";
import { Stat } from "../../ui/Card";
import { FieldLabel, Input, Textarea } from "../../ui/Input";
import { Calc, Err, FilePick, Gen, Note, RefTable, TextOp, asTool, req, useCopied } from "../kits/kits";
import { randomBytes } from "@/lib/engine/crypto";

export const secnetRegistry: Record<string, React.ComponentType> = {
  "password-strength-checker": asTool(<PasswordStrengthTool />),
  "hmac-generator": asTool(<HmacTool />),
  "random-token-generator": asTool(<TokenTool />),
  "url-safety-parser": asTool(<UrlSafetyTool />),
  "jwt-inspector": asTool(<JwtInspectorTool />),
  "tls-guide": asTool(<TlsGuideTool />),
  "http-security-header-builder": asTool(<SecHeadersTool />),
  "csp-generator": asTool(<CspTool />),
  "cors-header-generator": asTool(<CorsTool />),
  "sri-generator": asTool(<SriTool />),
  "secret-redaction-tool": asTool(<RedactTool />),
  "url-inspector": asTool(<UrlInspectorTool />),
  "domain-parser": asTool(<DomainParserTool />),
  "ip-parser": asTool(<IpParserTool />),
  "ipv4-converter": asTool(<Ipv4Tool />),
  "ipv6-converter": asTool(<Ipv6Tool />),
  "cidr-calculator": asTool(<CidrTool />),
  "subnet-calculator": asTool(<SubnetTool />),
  "port-lookup": asTool(<PortLookupTool />),
  "http-status-lookup": asTool(<HttpStatusTool />),
  "mime-type-lookup": asTool(<MimeLookupTool />),
  "user-agent-parser": asTool(<UaParserTool />),
  "query-string-parser": asTool(<QueryParserTool />),
  "http-header-viewer": asTool(<HeaderViewerTool />),
  "dns-record-formatter": asTool(<DnsFormatterTool />),
};

/* ---------- security ---------- */

function passwordScore(pw: string): { score: number; label: string; entropy: number; tips: string[] } {
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/\d/.test(pw)) pool += 10;
  if (/[^a-zA-Z\d]/.test(pw)) pool += 32;
  const entropy = pw.length * Math.log2(Math.max(2, pool));
  const tips: string[] = [];
  if (pw.length < 12) tips.push("Use at least 12 characters.");
  if (!/[^a-zA-Z\d]/.test(pw)) tips.push("Add a symbol or two.");
  if (/(.)\1{2,}/.test(pw)) tips.push("Avoid repeated characters.");
  if (/^(password|123456|qwerty|letmein|admin|welcome)/i.test(pw)) tips.push("Avoid common passwords.");
  if (/^[a-z]+$/i.test(pw) && pw.length < 16) tips.push("Single-case letters need extra length.");
  let score = 0;
  if (entropy >= 80) score = 4;
  else if (entropy >= 60) score = 3;
  else if (entropy >= 40) score = 2;
  else if (entropy >= 25) score = 1;
  if (tips.length >= 3 && score > 1) score -= 1;
  const labels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];
  return { score, label: labels[score] as string, entropy, tips };
}

function PasswordStrengthTool() {
  const [pw, setPw] = useState("");
  const r = pw ? passwordScore(pw) : null;
  return (
    <div>
      <FieldLabel htmlFor="pw-in">Password to check (never leaves your device)</FieldLabel>
      <Input id="pw-in" type="password" value={pw} autoComplete="off" placeholder="Type a password…" onChange={(e) => setPw(e.target.value)} />
      {r && (
        <div aria-live="polite" className="mt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Strength" value={r.label} />
            <Stat label="Entropy" value={`${r.entropy.toFixed(0)} bits`} />
            <Stat label="Length" value={String(pw.length)} />
            <Stat label="Score" value={`${r.score}/4`} />
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-(--surface-2)" role="progressbar" aria-valuenow={r.score} aria-valuemin={0} aria-valuemax={4}>
            <div
              className={r.score >= 3 ? "h-full bg-emerald-600" : r.score === 2 ? "h-full bg-amber-500" : "h-full bg-danger-600"}
              style={{ width: `${(r.score / 4) * 100}%` }}
            />
          </div>
          {r.tips.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-(--muted)">
              {r.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
          <Note>Checked locally with entropy math. Never type a password you actually reuse — test similar ones instead.</Note>
        </div>
      )}
    </div>
  );
}

async function hmacHex(key: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function HmacTool() {
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState("");
  const [out, setOut] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [copied, copy] = useCopied();

  const run = async () => {
    setError("");
    if (!key || !msg) {
      setError("Enter both a key and a message.");
      return;
    }
    setWorking(true);
    try {
      setOut(await hmacHex(key, msg));
    } catch {
      setOut("");
      setError("HMAC failed — WebCrypto may be unavailable.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <FieldLabel htmlFor="hmac-k">Secret key</FieldLabel>
          <Input id="hmac-k" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="hmac-m">Message</FieldLabel>
          <Textarea id="hmac-m" value={msg} onChange={(e) => setMsg(e.target.value)} />
        </div>
      </div>
      <div className="mt-3">
        <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Computing…" : "Compute HMAC-SHA256"}</Button>
      </div>
      <Err message={error} />
      {out && (
        <>
          <div className="mt-3">
            <FieldLabel htmlFor="hmac-o">Signature (hex)</FieldLabel>
            <Textarea id="hmac-o" value={out} readOnly className="font-mono text-[13px]" />
          </div>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => copy(out)}>{copied ? "Copied!" : "Copy"}</Button>
          </div>
        </>
      )}
    </div>
  );
}

function TokenTool() {
  return (
    <Calc
      button="Generate token"
      fields={[
        { key: "len", label: "Bytes of entropy", type: "number", def: "32", required: true, hint: "16–128 recommended." },
        {
          key: "fmt", label: "Encoding", type: "select",
          options: [
            { value: "hex", label: "Hex" },
            { value: "b64", label: "Base64URL" },
          ],
        },
      ]}
      compute={(v) => {
        const n = req(v, "len", "Bytes");
        if (typeof n !== "number") return n;
        if (!Number.isInteger(n) || n < 8 || n > 256) return { error: "Use 8–256 bytes." };
        const { bytes } = randomBytes(n);
        const hex = [...bytes].map((b) => (b as number).toString(16).padStart(2, "0")).join("");
        const b64 = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        const token = v.fmt === "b64" ? b64 : hex;
        return { rows: [["Token", token.length > 80 ? token.slice(0, 80) + "…" : token], ["Bits", String(n * 8)], ["Full token (copies whole value)", token]] };
      }}
    />
  );
}

function UrlSafetyTool() {
  return (
    <TextOp
      placeholder="Paste a URL to inspect, e.g. https://example.com/login…"
      button="Inspect URL"
      process={(t) => {
        let u: URL;
        try {
          u = new URL(t.trim());
        } catch {
          return { error: "That is not a valid absolute URL (include https://)." };
        }
        const flags: string[] = [];
        if (u.protocol !== "https:") flags.push(`Not HTTPS (${u.protocol}) — credentials on this page are exposed.`);
        if (/^xn--/.test(u.hostname)) flags.push("Punycode/IDN hostname — could visually impersonate a known brand.");
        if (u.username || u.password) flags.push("URL contains embedded credentials — classic phishing shape.");
        if (/@/.test(u.pathname + u.search)) flags.push("Contains “@” outside credentials — double-check the real host.");
        if (/-|\d{1,3}\.\d{1,3}/.test(u.hostname) && /\d+\.\d+\.\d+\.\d+/.test(u.hostname)) flags.push("Bare IP address instead of a domain — often suspicious.");
        if (u.hostname.split(".").length > 4) flags.push("Unusually deep subdomain chain — verify the registrable domain.");
        const lines = [
          `Protocol: ${u.protocol}`,
          `Host: ${u.hostname}${u.port ? ` (port ${u.port})` : ""}`,
          `Path: ${u.pathname || "/"}`,
          u.search ? `Query: ${u.search}` : "Query: none",
          "",
          flags.length === 0 ? "No common tricks detected. Still verify the sender before signing in." : `WARNINGS (${flags.length}):`,
          ...flags.map((f) => `• ${f}`),
        ];
        return { output: lines.join("\n"), stats: [["Protocol", u.protocol.replace(":", "").toUpperCase()], ["Warnings", String(flags.length)]] };
      }}
    />
  );
}

function b64urlDecode(s: string): unknown {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function JwtInspectorTool() {
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [out, setOut] = useState<{ header: string; payload: string; sig: string; exp: string } | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);

  const inspect = () => {
    setError("");
    setVerified(null);
    try {
      const parts = token.trim().split(".");
      if (parts.length !== 3) throw new Error("A JWT has three dot-separated parts.");
      const header = JSON.stringify(b64urlDecode(parts[0] as string), null, 2);
      const payload = JSON.stringify(b64urlDecode(parts[1] as string), null, 2);
      const pv = b64urlDecode(parts[1] as string) as Record<string, unknown>;
      let exp = "no exp claim";
      if (typeof pv.exp === "number") {
        const d = new Date(pv.exp * 1000);
        exp = d < new Date() ? `EXPIRED (${d.toISOString()})` : `valid until ${d.toISOString()}`;
      }
      setOut({ header, payload, sig: `${(parts[2] as string).slice(0, 24)}… (${(parts[2] as string).length} chars)`, exp });
    } catch (e) {
      setOut(null);
      setError(e instanceof Error ? e.message : "Could not decode that token.");
    }
  };

  const verify = async () => {
    if (!out || !secret) {
      setError("Inspect a token and enter the HMAC secret first.");
      return;
    }
    try {
      const parts = token.trim().split(".");
      const data = `${parts[0]}.${parts[1]}`;
      const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
      const calc = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      setVerified(calc === (parts[2] as string));
    } catch {
      setError("Verification failed — WebCrypto may be unavailable.");
    }
  };

  return (
    <div>
      <FieldLabel htmlFor="jwt-t">JWT (paste test tokens only — never a live credential)</FieldLabel>
      <Textarea id="jwt-t" value={token} placeholder="eyJhbGciOi…" onChange={(e) => setToken(e.target.value)} className="font-mono text-[13px]" />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={inspect}>Decode</Button>
      </div>
      <Err message={error} />
      {out && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="jwt-h">Header</FieldLabel>
              <Textarea id="jwt-h" value={out.header} readOnly className="font-mono text-[13px]" />
            </div>
            <div>
              <FieldLabel htmlFor="jwt-p">Payload</FieldLabel>
              <Textarea id="jwt-p" value={out.payload} readOnly className="font-mono text-[13px]" />
            </div>
          </div>
          <p className="mt-2 text-sm text-(--muted)">Signature: <span className="font-mono">{out.sig}</span> · Expiry: <strong>{out.exp}</strong></p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
            <div>
              <FieldLabel htmlFor="jwt-s">HMAC secret (optional, HS256 verify)</FieldLabel>
              <Input id="jwt-s" type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} />
            </div>
            <div>
              <Button type="button" variant="secondary" onClick={() => void verify()}>Verify signature</Button>
            </div>
          </div>
          {verified !== null && (
            <p role="status" className={verified ? "mt-2 font-bold text-emerald-600" : "mt-2 font-bold text-danger-600"}>
              {verified ? "Signature VALID for this secret." : "Signature INVALID for this secret."}
            </p>
          )}
        </>
      )}
    </div>
  );
}

const TLS_ROWS: string[][] = [
  ["TLS 1.3", "Current", "Mandatory — modern AEAD ciphers only"],
  ["TLS 1.2", "Transitional", "Use with strong ciphers; disable old ones"],
  ["TLS 1.1 / 1.0", "Deprecated", "Disabled everywhere — POODLE/BEAST era"],
  ["SSL 2.0 / 3.0", "Broken", "Never use"],
  ["TLS_AES_128_GCM_SHA256", "TLS 1.3", "Recommended"],
  ["TLS_AES_256_GCM_SHA384", "TLS 1.3", "Recommended"],
  ["TLS_CHACHA20_POLY1305_SHA256", "TLS 1.3", "Good for mobile CPUs"],
  ["ECDHE-RSA-AES128-GCM-SHA256", "TLS 1.2", "Acceptable with TLS 1.2"],
  ["RC4 / DES / 3DES / MD5", "Any", "Forbidden — broken primitives"],
];

function TlsGuideTool() {
  return (
    <div>
      <RefTable columns={["Name", "Status", "Guidance"]} rows={TLS_ROWS} searchPlaceholder="Search versions or ciphers…" />
      <Note>Educational reference. Browsers cannot read a site's certificate or negotiated cipher — live checks are Coming Soon.</Note>
    </div>
  );
}

function SecHeadersTool() {
  return (
    <Gen
      fields={[
        { key: "hsts", label: "HSTS max-age (seconds)", type: "number", def: "31536000", required: true },
        { key: "sub", label: "HSTS includeSubDomains", type: "checkbox", def: "1" },
        { key: "frame", label: "X-Frame-Options", type: "select", options: [{ value: "DENY", label: "DENY" }, { value: "SAMEORIGIN", label: "SAMEORIGIN" }] },
        { key: "ctype", label: "X-Content-Type-Options", type: "select", options: [{ value: "nosniff", label: "nosniff" }, { value: "none", label: "Omit" }], def: "nosniff" },
        { key: "ref", label: "Referrer-Policy", type: "select", options: [{ value: "strict-origin-when-cross-origin", label: "strict-origin-when-cross-origin" }, { value: "no-referrer", label: "no-referrer" }, { value: "same-origin", label: "same-origin" }] },
      ]}
      generate={(v) => {
        const n = Number(v.hsts);
        if (!Number.isFinite(n) || n < 0) return { error: "HSTS max-age must be a positive number." };
        const lines = [
          `Strict-Transport-Security: max-age=${Math.floor(n)}${v.sub === "1" ? "; includeSubDomains" : ""}`,
          `X-Frame-Options: ${v.frame}`,
        ];
        if (v.ctype === "nosniff") lines.push("X-Content-Type-Options: nosniff");
        lines.push(`Referrer-Policy: ${v.ref}`);
        return lines.join("\n");
      }}
      fileName="security-headers.txt"
      button="Build headers"
    />
  );
}

function CspTool() {
  return (
    <Gen
      fields={[
        { key: "def", label: "default-src", type: "text", def: "'self'", required: true },
        { key: "script", label: "script-src (extra)", type: "text", placeholder: "e.g. https: 'unsafe-inline'" },
        { key: "style", label: "style-src (extra)", type: "text", placeholder: "e.g. 'self' https:" },
        { key: "img", label: "img-src (extra)", type: "text", def: "'self' data: https:" },
        { key: "upgrade", label: "upgrade-insecure-requests", type: "checkbox", def: "1" },
      ]}
      generate={(v) => {
        const parts = [`default-src ${v.def}`];
        if (v.script?.trim()) parts.push(`script-src ${v.script.trim()}`);
        if (v.style?.trim()) parts.push(`style-src ${v.style.trim()}`);
        if (v.img?.trim()) parts.push(`img-src ${v.img.trim()}`);
        parts.push("object-src 'none'", "base-uri 'self'");
        if (v.upgrade === "1") parts.push("upgrade-insecure-requests");
        return `Content-Security-Policy: ${parts.join("; ")}`;
      }}
      fileName="csp.txt"
      button="Build CSP"
    />
  );
}

function CorsTool() {
  return (
    <Gen
      fields={[
        { key: "origin", label: "Allowed origin", type: "text", def: "https://example.com", required: true },
        { key: "methods", label: "Methods", type: "text", def: "GET, POST, OPTIONS" },
        { key: "headers", label: "Allowed headers", type: "text", def: "Content-Type, Authorization" },
        { key: "cred", label: "Allow credentials", type: "checkbox", def: "0" },
        { key: "max", label: "Max age (seconds)", type: "number", def: "86400" },
      ]}
      generate={(v) => {
        if (!/^https?:\/\//.test(v.origin?.trim() ?? "")) return { error: "Origin must start with http(s)://." };
        const cred = v.cred === "1";
        return [
          `Access-Control-Allow-Origin: ${cred ? v.origin.trim() : v.origin.trim()}`,
          `Access-Control-Allow-Methods: ${v.methods}`,
          `Access-Control-Allow-Headers: ${v.headers}`,
          ...(cred ? ["Access-Control-Allow-Credentials: true", "Vary: Origin"] : ["Vary: Origin"]),
          `Access-Control-Max-Age: ${Math.max(0, Math.floor(Number(v.max) || 0))}`,
        ].join("\n");
      }}
      fileName="cors-headers.txt"
      button="Build CORS headers"
    />
  );
}

function SriTool() {
  const [text, setText] = useState("");
  const [out, setOut] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [copied, copy] = useCopied();

  const fromText = async () => {
    setError("");
    if (!text) {
      setError("Paste script/style content, or choose a file.");
      return;
    }
    setWorking(true);
    try {
      const ab = await crypto.subtle.digest("SHA-384", new TextEncoder().encode(text));
      const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
      setOut(`integrity="sha384-${b64}"`);
    } catch {
      setError("Hashing failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <FieldLabel htmlFor="sri-in">File content</FieldLabel>
      <Textarea id="sri-in" value={text} placeholder="Paste the exact .js/.css bytes…" onChange={(e) => setText(e.target.value)} className="font-mono text-[13px]" />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={() => void fromText()} disabled={working}>{working ? "Hashing…" : "Generate SRI"}</Button>
      </div>
      <div className="mt-3">
        <FilePick accept="*/*" maxMB={20} onFiles={async (f) => {
          const t = await (f[0] as File).text();
          setText(t.slice(0, 500000));
        }} label="Or load from file" />
      </div>
      <Err message={error} />
      {out && (
        <>
          <div className="mt-3">
            <FieldLabel htmlFor="sri-out">Integrity attribute</FieldLabel>
            <Textarea id="sri-out" value={out} readOnly className="font-mono text-[13px]" />
          </div>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => copy(out)}>{copied ? "Copied!" : "Copy"}</Button>
          </div>
        </>
      )}
    </div>
  );
}

const SECRET_RES = [
  [/sk-live-[A-Za-z0-9_-]{8,}/g, "Stripe-style live key"],
  [/sk-test-[A-Za-z0-9_-]{8,}/g, "Stripe-style test key"],
  [/ghp_[A-Za-z0-9]{20,}/g, "GitHub token"],
  [/xox[bap]-[A-Za-z0-9-]{8,}/g, "Slack token"],
  [/AKIA[0-9A-Z]{16}/g, "AWS access key"],
  [/AIza[0-9A-Za-z_-]{20,}/g, "Google API key"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "Email address"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "Private key block"],
];

function RedactTool() {
  return (
    <TextOp
      placeholder="Paste text that may contain secrets…"
      button="Redact secrets"
      process={(t) => {
        let out = t;
        const hits: string[] = [];
        for (const [re, label] of SECRET_RES) {
          const m = out.match(re);
          if (m) {
            hits.push(`${label}: ${m.length}`);
            out = out.replace(re, "[REDACTED]");
          }
        }
        return {
          output: out,
          stats: [["Patterns found", String(hits.length)], ...hits.slice(0, 3).map((h) => ["Hit", h] as [string, string])],
        };
      }}
    />
  );
}

/* ---------- network ---------- */

function UrlInspectorTool() {
  return (
    <TextOp
      placeholder="Paste an absolute URL…"
      button="Split URL"
      process={(t) => {
        let u: URL;
        try {
          u = new URL(t.trim());
        } catch {
          return { error: "Enter a valid absolute URL starting with http(s)://." };
        }
        const params = [...u.searchParams.entries()];
        const lines = [
          `Protocol: ${u.protocol}`,
          `Username: ${u.username || "—"}`,
          `Hostname: ${u.hostname}`,
          `Port: ${u.port || "(default)"}`,
          `Path: ${u.pathname || "/"}`,
          `Query: ${u.search || "none"} (${params.length} param${params.length === 1 ? "" : "s"})`,
          `Hash: ${u.hash || "none"}`,
          `Origin: ${u.origin}`,
        ];
        return { output: lines.join("\n"), stats: [["Params", String(params.length)], ["Host length", String(u.hostname.length)]] };
      }}
    />
  );
}

function DomainParserTool() {
  return (
    <TextOp
      placeholder="e.g. blog.shop.example.co.uk…"
      button="Parse domain"
      process={(t) => {
        const host = t.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0] ?? "";
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return { error: "Enter a valid hostname like blog.example.com." };
        const parts = host.split(".");
        const tld = parts.length > 2 && parts[parts.length - 2] && (parts[parts.length - 2] as string).length <= 3
          ? parts.slice(-2).join(".")
          : parts[parts.length - 1];
        const tldParts = (tld as string).split(".").length;
        const domain = parts.slice(-(tldParts + 1)).join(".");
        const sub = parts.slice(0, -(tldParts + 1)).join(".");
        return {
          output: [`Hostname: ${host}`, `Subdomain: ${sub || "(none)"}`, `Domain: ${domain}`, `Public suffix: ${tld}`].join("\n"),
          stats: [["Labels", String(parts.length)]],
        };
      }}
    />
  );
}

function ipv4Parts(s: string): number[] | null {
  const m = s.trim().split(".");
  if (m.length !== 4) return null;
  const octs = m.map((x) => (x.trim() === "" ? NaN : Number(x)));
  if (octs.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return null;
  return octs as number[];
}

function IpParserTool() {
  return (
    <TextOp
      placeholder="e.g. 192.168.1.20…"
      button="Parse IP"
      process={(t) => {
        const o = ipv4Parts(t);
        if (!o) return { error: "Enter a valid IPv4 address (four octets 0–255)." };
        const [a, b] = o;
        const cls = a < 128 ? "A" : a < 192 ? "B" : a < 224 ? "C" : a < 240 ? "D (multicast)" : "E (reserved)";
        const priv = a === 10 || (a === 172 && (b as number) >= 16 && (b as number) <= 31) || (a === 192 && b === 168) || (a === 127);
        const bin = o.map((x) => (x as number).toString(2).padStart(8, "0")).join(".");
        return {
          output: [`Address: ${o.join(".")}`, `Class: ${cls}`, `Private/loopback: ${priv ? "yes" : "no"}`, `Binary: ${bin}`, `Integer: ${((o[0] as number) * 16777216 + (o[1] as number) * 65536 + (o[2] as number) * 256 + (o[3] as number)) >>> 0}`].join("\n"),
          stats: [["Class", cls.split(" ")[0] as string]],
        };
      }}
    />
  );
}

function Ipv4Tool() {
  return (
    <Calc
      button="Convert"
      fields={[{ key: "ip", label: "IPv4, integer or hex", type: "text", placeholder: "192.168.0.1 or 3232235521 or 0xC0A80001", required: true }]}
      compute={(v) => {
        const s = (v.ip ?? "").trim();
        let n: number | null = null;
        const o = ipv4Parts(s);
        if (o) n = ((o[0] as number) * 16777216 + (o[1] as number) * 65536 + (o[2] as number) * 256 + (o[3] as number)) >>> 0;
        else if (/^0x[0-9a-f]+$/i.test(s)) n = parseInt(s, 16) >>> 0;
        else if (/^\d+$/.test(s)) {
          const x = Number(s);
          if (x >= 0 && x <= 4294967295) n = x >>> 0;
        }
        if (n === null) return { error: "Enter dotted IPv4, a 0–4294967295 integer, or 0x hex." };
        const dotted = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
        return { rows: [["Dotted", dotted], ["Integer", String(n)], ["Hex", "0x" + n.toString(16).toUpperCase().padStart(8, "0")]] };
      }}
    />
  );
}

function expandIpv6(s: string): string[] | null {
  const t = s.trim().toLowerCase();
  if (!/^[0-9a-f:.]+$/.test(t) || (t.match(/::/g) ?? []).length > 1) return null;
  const [head, tail] = t.split("::");
  const parse = (p: string): string[] => {
    if (!p) return [];
    return p.split(":").flatMap((g) => {
      if (g.includes(".")) {
        const o = ipv4Parts(g);
        if (!o) return ["ZZZ"];
        const n = ((o[0] as number) << 24) | ((o[1] as number) << 16) | ((o[2] as number) << 8) | (o[3] as number);
        return [(n >>> 16).toString(16), (n & 0xffff).toString(16)];
      }
      if (!/^[0-9a-f]{1,4}$/.test(g)) return ["ZZZ"];
      return [g];
    });
  };
  const h = parse(head ?? "");
  const tl = tail !== undefined ? parse(tail) : [];
  if (h.includes("ZZZ") || tl.includes("ZZZ")) return null;
  const missing = 8 - h.length - tl.length;
  if (tail === undefined) {
    if (h.length !== 8) return null;
    return h.map((g) => g.padStart(4, "0"));
  }
  if (missing < 0) return null;
  return [...h.map((g) => g.padStart(4, "0")), ...Array(missing).fill("0000"), ...tl.map((g) => g.padStart(4, "0"))];
}

function compressIpv6(groups: string[]): string {
  const short = groups.map((g) => parseInt(g, 16).toString(16));
  let best = -1;
  let bestLen = 0;
  let cur = -1;
  let curLen = 0;
  short.forEach((g, i) => {
    if (g === "0") {
      if (cur < 0) {
        cur = i;
        curLen = 1;
      } else curLen++;
      if (curLen > bestLen) {
        bestLen = curLen;
        best = cur;
      }
    } else {
      cur = -1;
      curLen = 0;
    }
  });
  if (bestLen < 2) return short.join(":");
  return [...short.slice(0, best), "", ...short.slice(best + bestLen)].join(":").replace(/^:|:$/g, m => m + ":");
}

function Ipv6Tool() {
  return (
    <TextOp
      placeholder="e.g. 2001:db8::1 …"
      button="Expand / compress"
      process={(t) => {
        const g = expandIpv6(t);
        if (!g) return { error: "Not a valid IPv6 address." };
        return {
          output: [`Expanded: ${g.join(":")}`, `Compressed: ${compressIpv6(g)}`, `Bits: 128`].join("\n"),
          stats: [["Groups", "8"]],
        };
      }}
    />
  );
}

function cidrMath(ip: string, prefix: number): [string, string][] | { error: string } {
  const o = ipv4Parts(ip);
  if (!o) return { error: "Enter a valid IPv4 address." };
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return { error: "Prefix must be 0–32." };
  const n = ((o[0] as number) << 24) | ((o[1] as number) << 16) | ((o[2] as number) << 8) | (o[3] as number);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const net = (n & mask) >>> 0;
  const bc = (net | (~mask >>> 0)) >>> 0;
  const d = (x: number) => [(x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255].join(".");
  const hosts = prefix >= 31 ? (prefix === 32 ? 1 : 2) : Math.pow(2, 32 - prefix) - 2;
  return [
    ["Network", d(net)],
    ["Broadcast", d(bc)],
    ["Netmask", d(mask)],
    ["Usable hosts", hosts.toLocaleString()],
    ["First host", prefix >= 31 ? d(net) : d(net + 1)],
    ["Last host", prefix >= 31 ? d(bc) : d(bc - 1)],
  ];
}

function CidrTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "ip", label: "IPv4 address", type: "text", def: "192.168.1.0", required: true },
        { key: "p", label: "Prefix (0–32)", type: "number", def: "24", required: true },
      ]}
      compute={(v) => {
        const r = cidrMath(v.ip ?? "", Number(v.p));
        return Array.isArray(r) ? { rows: r } : r;
      }}
    />
  );
}

function SubnetTool() {
  return (
    <Calc
      button="Calculate subnet"
      fields={[
        { key: "ip", label: "IP address", type: "text", def: "192.168.1.10", required: true },
        { key: "mask", label: "Mask (dotted or /prefix)", type: "text", def: "255.255.255.0", required: true },
      ]}
      compute={(v) => {
        const m = (v.mask ?? "").trim();
        let prefix: number | null = null;
        if (/^\/\d{1,2}$/.test(m)) prefix = Number(m.slice(1));
        else {
          const o = ipv4Parts(m);
          if (o) {
            const n = ((o[0] as number) << 24) | ((o[1] as number) << 16) | ((o[2] as number) << 8) | (o[3] as number);
            const bin = (n >>> 0).toString(2).padStart(32, "0");
            if (/^1*0*$/.test(bin)) prefix = (bin.match(/1/g) ?? []).length;
          }
        }
        if (prefix === null) return { error: "Mask must be dotted (255.255.255.0) or /prefix." };
        const r = cidrMath(v.ip ?? "", prefix);
        return Array.isArray(r) ? { rows: [["Prefix", `/${prefix}`], ...r] } : r;
      }}
    />
  );
}

const PORT_ROWS: string[][] = [
  ["20–21", "FTP", "File transfer (data/control)"],
  ["22", "SSH", "Secure shell / SFTP / SCP"],
  ["25", "SMTP", "Outgoing email"],
  ["53", "DNS", "Domain name resolution"],
  ["67–68", "DHCP", "Automatic IP assignment"],
  ["80", "HTTP", "Web traffic"],
  ["110", "POP3", "Email retrieval"],
  ["143", "IMAP", "Email retrieval"],
  ["389", "LDAP", "Directory services"],
  ["443", "HTTPS", "Secure web traffic"],
  ["445", "SMB", "Windows file sharing"],
  ["465", "SMTPS", "SMTP over TLS"],
  ["587", "SMTP", "Email submission"],
  ["993", "IMAPS", "IMAP over TLS"],
  ["995", "POP3S", "POP3 over TLS"],
  ["1433", "MSSQL", "SQL Server database"],
  ["1521", "Oracle DB", "Oracle database"],
  ["3306", "MySQL", "MySQL database"],
  ["3389", "RDP", "Remote desktop"],
  ["5432", "PostgreSQL", "Postgres database"],
  ["5900", "VNC", "Remote screen sharing"],
  ["6379", "Redis", "Redis cache"],
  ["8080", "HTTP alt", "Alternative web / proxies"],
  ["8443", "HTTPS alt", "Alternative secure web"],
  ["27017", "MongoDB", "Mongo database"],
];

function PortLookupTool() {
  return <RefTable columns={["Port", "Service", "Used for"]} rows={PORT_ROWS} searchPlaceholder="Search port or service…" />;
}

const HTTP_ROWS: string[][] = [
  ["200", "OK", "Request succeeded"],
  ["201", "Created", "New resource created"],
  ["204", "No Content", "Success, empty body"],
  ["301", "Moved Permanently", "Redirect, update bookmarks"],
  ["302", "Found", "Temporary redirect"],
  ["304", "Not Modified", "Use cached copy"],
  ["400", "Bad Request", "Malformed request"],
  ["401", "Unauthorized", "Login required"],
  ["403", "Forbidden", "No permission"],
  ["404", "Not Found", "Missing resource"],
  ["408", "Request Timeout", "Client too slow"],
  ["409", "Conflict", "State conflict"],
  ["410", "Gone", "Permanently removed"],
  ["422", "Unprocessable", "Valid syntax, bad semantics"],
  ["429", "Too Many Requests", "Rate limited"],
  ["500", "Server Error", "Unhandled failure"],
  ["502", "Bad Gateway", "Upstream failed"],
  ["503", "Unavailable", "Overloaded/maintenance"],
  ["504", "Gateway Timeout", "Upstream too slow"],
];

function HttpStatusTool() {
  return <RefTable columns={["Code", "Name", "Meaning"]} rows={HTTP_ROWS} searchPlaceholder="Search code or name…" />;
}

const MIME_ROWS: string[][] = [
  ["html", "text/html"], ["css", "text/css"], ["js", "text/javascript"], ["json", "application/json"],
  ["xml", "application/xml"], ["csv", "text/csv"], ["txt", "text/plain"], ["md", "text/markdown"],
  ["png", "image/png"], ["jpg", "image/jpeg"], ["gif", "image/gif"], ["svg", "image/svg+xml"],
  ["webp", "image/webp"], ["ico", "image/x-icon"], ["avif", "image/avif"], ["bmp", "image/bmp"],
  ["mp3", "audio/mpeg"], ["wav", "audio/wav"], ["ogg", "audio/ogg"], ["flac", "audio/flac"],
  ["mp4", "video/mp4"], ["webm", "video/webm"], ["pdf", "application/pdf"], ["zip", "application/zip"],
  ["gz", "application/gzip"], ["7z", "application/x-7z-compressed"], ["rar", "application/vnd.rar"],
  ["doc", "application/msword"], ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["xls", "application/vnd.ms-excel"], ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ["ppt", "application/vnd.ms-powerpoint"], ["woff", "font/woff"], ["woff2", "font/woff2"],
  ["ttf", "font/ttf"], ["otf", "font/otf"], ["wasm", "application/wasm"], ["yaml", "application/yaml"],
  ["form", "multipart/form-data"], ["urlencoded", "application/x-www-form-urlencoded"],
];

function MimeLookupTool() {
  return <RefTable columns={["Extension", "MIME type"]} rows={MIME_ROWS} searchPlaceholder="Search extension…" />;
}

function UaParserTool() {
  return (
    <TextOp
      placeholder="Paste a User-Agent string…"
      button="Parse"
      process={(t) => {
        const ua = t.trim();
        if (!ua) return { error: "Paste a User-Agent string." };
        let browser = "Unknown";
        let os = "Unknown";
        let device = "Desktop";
        const b: [RegExp, string][] = [
          [/Edg\/([\d.]+)/, "Edge"], [/Chrome\/([\d.]+)/, "Chrome"], [/Firefox\/([\d.]+)/, "Firefox"],
          [/Version\/([\d.]+).*Safari/, "Safari"], [/OPR\/([\d.]+)/, "Opera"],
        ];
        for (const [re, name] of b) {
          const m = re.exec(ua);
          if (m && !(name === "Chrome" && /Edg|OPR/.test(ua)) && !(name === "Safari" && /Chrome/.test(ua))) {
            browser = `${name} ${m[1]}`;
            break;
          }
        }
        if (/Windows NT 10/.test(ua)) os = "Windows 10/11";
        else if (/Windows/.test(ua)) os = "Windows";
        else if (/Android ([\d.]+)/.test(ua)) os = `Android ${/Android ([\d.]+)/.exec(ua)?.[1]}`;
        else if (/iPhone|iPad/.test(ua)) {
          os = "iOS";
          device = /iPad/.test(ua) ? "Tablet" : "Mobile";
        } else if (/Mac OS X/.test(ua)) os = "macOS";
        else if (/Linux/.test(ua)) os = "Linux";
        if (/Mobile|Android|iPhone/.test(ua)) device = "Mobile";
        const bot = /bot|crawl|spider|slurp|mediapartners/i.test(ua);
        return {
          output: [`Browser: ${browser}`, `OS: ${os}`, `Device: ${bot ? "Bot/crawler" : device}`, `Length: ${ua.length} chars`].join("\n"),
          stats: [["Browser", browser.split(" ")[0] as string], ["OS", os.split(" ")[0] as string]],
        };
      }}
    />
  );
}

function QueryParserTool() {
  return (
    <TextOp
      placeholder="Paste a full URL or just ?a=1&b=2…"
      button="Parse query"
      process={(t) => {
        const s = t.trim();
        const q = s.includes("?") ? s.split("?").slice(1).join("?") : s.replace(/^[^=]*\?/, "");
        if (!q) return { error: "No query string found." };
        const params = new URLSearchParams(q.startsWith("?") ? q : `?${q}`);
        const entries = [...params.entries()];
        if (entries.length === 0) return { error: "No parameters found." };
        const lines = entries.map(([k, v]) => `${k} = ${v}`);
        const dups = entries.map(([k]) => k).filter((k, i, a) => a.indexOf(k) !== i);
        return {
          output: [...lines, ...(dups.length ? [`(repeated: ${[...new Set(dups)].join(", ")})`] : [])].join("\n"),
          stats: [["Params", String(entries.length)]],
        };
      }}
    />
  );
}

function HeaderViewerTool() {
  return (
    <TextOp
      placeholder="Paste raw HTTP headers…"
      button="Parse headers"
      process={(t) => {
        const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) return { error: "Paste at least one header line." };
        const out: string[] = [];
        for (const l of lines.slice(0, 100)) {
          const i = l.indexOf(":");
          if (i < 0) return { error: `Line is not a header: “${l.slice(0, 60)}”.` };
          out.push(`${l.slice(0, i).trim()} → ${(l.slice(i + 1).trim() || "(empty)").slice(0, 200)}`);
        }
        return { output: out.join("\n"), stats: [["Headers", String(out.length)]] };
      }}
    />
  );
}

function DnsFormatterTool() {
  return (
    <Gen
      fields={[
        { key: "zone", label: "Zone (apex)", type: "text", def: "example.com", required: true },
        { key: "ip4", label: "A record IPv4", type: "text", def: "192.0.2.1" },
        { key: "ip6", label: "AAAA IPv6 (optional)", type: "text" },
        { key: "www", label: "CNAME www →", type: "text", def: "example.com." },
        { key: "mx", label: "MX host", type: "text", def: "mail.example.com." },
        { key: "txt", label: "TXT (SPF etc.)", type: "text", def: "v=spf1 -all" },
        { key: "ttl", label: "TTL seconds", type: "number", def: "3600" },
      ]}
      generate={(v) => {
        const zone = (v.zone ?? "").trim().replace(/\.$/, "");
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(zone)) return { error: "Enter a valid zone name." };
        const ttl = Math.max(60, Math.floor(Number(v.ttl) || 3600));
        const lines = [
          `$ORIGIN ${zone}.`,
          `$TTL ${ttl}`,
          `@ IN SOA ns1.${zone}. admin.${zone}. ( 1 7200 3600 1209600 3600 )`,
          `  IN NS ns1.${zone}.`,
          `  IN NS ns2.${zone}.`,
        ];
        if (ipv4PartsSafe(v.ip4 ?? "")) lines.push(`@ IN A ${(v.ip4 ?? "").trim()}`);
        if ((v.ip6 ?? "").trim()) lines.push(`@ IN AAAA ${(v.ip6 ?? "").trim()}`);
        if ((v.www ?? "").trim()) lines.push(`www IN CNAME ${(v.www ?? "").trim()}`);
        if ((v.mx ?? "").trim()) lines.push(`@ IN MX 10 ${(v.mx ?? "").trim()}`);
        if ((v.txt ?? "").trim()) lines.push(`@ IN TXT "${(v.txt ?? "").trim()}"`);
        return lines.join("\n");
      }}
      fileName="zone.txt"
      button="Format zone"
    />
  );
}

function ipv4PartsSafe(s: string): boolean {
  const m = s.trim().split(".");
  return m.length === 4 && m.every((x) => x !== "" && Number.isInteger(Number(x)) && Number(x) >= 0 && Number(x) <= 255);
}
