"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../../ui/Button";
import { FieldLabel, Input, Textarea } from "../../ui/Input";
import { Calc, Err, Gen, Note, TextOp, asTool, useCopied } from "../kits/kits";
import { canvasToPng, drawBarcode, ean13Checksum, encodeCode128, encodeCode39, encodeEan13, validateIsbn } from "@/lib/media/barcode";
import { randomBytes, randomInt } from "@/lib/engine/crypto";

export const qrgenRegistry: Record<string, React.ComponentType> = {
  "wifi-qr-generator": asTool(<WifiQrTool />),
  "url-qr-generator": asTool(<UrlQrTool />),
  "email-qr-generator": asTool(<EmailQrTool />),
  "phone-qr-generator": asTool(<PhoneQrTool />),
  "sms-qr-generator": asTool(<SmsQrTool />),
  "vcard-qr-generator": asTool(<VcardQrTool />),
  "location-qr-generator": asTool(<LocationQrTool />),
  "calendar-qr-generator": asTool(<CalendarQrTool />),
  "barcode-generator": asTool(<BarcodeTool />),
  "code128-generator": asTool(<Code128Tool />),
  "code39-generator": asTool(<Code39Tool />),
  "ean-generator": asTool(<EanTool />),
  "upc-generator": asTool(<UpcTool />),
  "isbn-generator": asTool(<IsbnGenTool />),
  "isbn-validator": asTool(<IsbnCheckTool />),
  "nanoid-generator": asTool(<NanoTool />),
  "slug-generator": asTool(<SlugGenTool />),
  "placeholder-text-generator": asTool(<PlaceholderTool />),
  "fake-data-generator": asTool(<FakeDataTool />),
  "random-json-generator": asTool(<RandomJsonTool />),
  "random-csv-generator": asTool(<RandomCsvTool />),
  "random-address-generator": asTool(<RandomAddressTool />),
  "random-email-generator": asTool(<RandomEmailTool />),
  "random-phone-generator": asTool(<RandomPhoneTool />),
  "random-company-generator": asTool(<RandomCompanyTool />),
  "random-hex-generator": asTool(<RandomHexTool />),
};

/* ---------- QR shell ---------- */

function QrShell({ payload, fileName = "toolora-qr.png" }: { payload: string; fileName?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState("256");
  const [error, setError] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !payload.trim() || payload.length > 2000) return;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("qrcode");
        if (cancelled || !canvasRef.current) return;
        const px = Math.max(128, Math.min(1024, Number(size) || 256));
        await mod.toCanvas(canvasRef.current, payload, { width: px, margin: 2, errorCorrectionLevel: "M" });
        setError("");
      } catch {
        if (!cancelled) setError("QR rendering failed — try shorter content.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payload, size]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || !payload.trim()) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = fileName;
    a.click();
  };

  if (!payload.trim()) return <Note>Fill in the fields above to preview the QR code.</Note>;
  if (payload.length > 2000) return <Err message="Content is too long for a reliable QR code (keep it under ~2000 characters)." />;

  return (
    <div className="mt-4">
      <canvas ref={canvasRef} className="mx-auto rounded-xl border border-(--border)" aria-label="QR code preview" />
      <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <label className="flex items-center gap-2 text-sm font-medium">
          Size
          <select value={size} onChange={(e) => setSize(e.target.value)} className="min-h-[44px] rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px]">
            {["128", "256", "512", "1024"].map((s) => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={download}>Download PNG</Button>
      </div>
      <Err message={error} />
    </div>
  );
}

function escWifi(s: string): string {
  return s.replace(/([\\;,":])/g, "\\$1");
}

function WifiQrTool() {
  const [ssid, setSsid] = useState("");
  const [pass, setPass] = useState("");
  const [sec, setSec] = useState("WPA");
  const payload = ssid.trim() ? `WIFI:T:${sec};S:${escWifi(ssid.trim())};P:${escWifi(pass)};;` : "";
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="wq-ssid">Network name (SSID)</FieldLabel>
          <Input id="wq-ssid" value={ssid} onChange={(e) => setSsid(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="wq-pass">Password</FieldLabel>
          <Input id="wq-pass" type="password" autoComplete="off" value={pass} onChange={(e) => setPass(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="wq-sec">Security</FieldLabel>
          <select id="wq-sec" value={sec} onChange={(e) => setSec(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px]">
            {["WPA", "WEP", "nopass"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <QrShell payload={payload} fileName="wifi-qr.png" />
    </div>
  );
}

function UrlQrTool() {
  const [url, setUrl] = useState("");
  return (
    <div>
      <FieldLabel htmlFor="uq-url">URL (https://…)</FieldLabel>
      <Input id="uq-url" value={url} inputMode="url" placeholder="https://example.com" onChange={(e) => setUrl(e.target.value)} />
      <QrShell payload={/^https?:\/\//.test(url.trim()) ? url.trim() : ""} fileName="url-qr.png" />
      {url.trim() && !/^https?:\/\//.test(url.trim()) && <Err message="URL must start with http:// or https://." />}
    </div>
  );
}

function EmailQrTool() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const valid = /.+@.+\..+/.test(to.trim());
  const payload = valid
    ? `mailto:${to.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : "";
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="eq-to">Recipient email</FieldLabel>
          <Input id="eq-to" type="email" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="eq-sub">Subject</FieldLabel>
          <Input id="eq-sub" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
      </div>
      <div className="mt-4">
        <FieldLabel htmlFor="eq-body">Body</FieldLabel>
        <Textarea id="eq-body" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <QrShell payload={payload} fileName="email-qr.png" />
    </div>
  );
}

function PhoneQrTool() {
  const [phone, setPhone] = useState("");
  const clean = phone.replace(/[^+\d]/g, "");
  return (
    <div>
      <FieldLabel htmlFor="pq-p">Phone number</FieldLabel>
      <Input id="pq-p" type="tel" value={phone} placeholder="+1 555 123 4567" onChange={(e) => setPhone(e.target.value)} />
      <QrShell payload={clean.length >= 7 ? `tel:${clean}` : ""} fileName="phone-qr.png" />
    </div>
  );
}

function SmsQrTool() {
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const clean = phone.replace(/[^+\d]/g, "");
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="sq-p">Phone number</FieldLabel>
          <Input id="sq-p" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="sq-m">Message</FieldLabel>
          <Input id="sq-m" value={msg} onChange={(e) => setMsg(e.target.value)} />
        </div>
      </div>
      <QrShell payload={clean.length >= 7 ? `SMSTO:${clean}:${msg}` : ""} fileName="sms-qr.png" />
    </div>
  );
}

function VcardQrTool() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const payload = name.trim()
    ? `BEGIN:VCARD\nVERSION:3.0\nFN:${name.trim()}\n${org.trim() ? `ORG:${org.trim()}\n` : ""}${phone.trim() ? `TEL:${phone.trim()}\n` : ""}${email.trim() ? `EMAIL:${email.trim()}\n` : ""}END:VCARD`
    : "";
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="vq-n">Full name</FieldLabel>
          <Input id="vq-n" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="vq-o">Company (optional)</FieldLabel>
          <Input id="vq-o" value={org} onChange={(e) => setOrg(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="vq-p">Phone (optional)</FieldLabel>
          <Input id="vq-p" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="vq-e">Email (optional)</FieldLabel>
          <Input id="vq-e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <QrShell payload={payload} fileName="vcard-qr.png" />
    </div>
  );
}

function LocationQrTool() {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const la = Number(lat);
  const lo = Number(lon);
  const ok = Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180 && lat.trim() !== "" && lon.trim() !== "";
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="lq-lat">Latitude (−90…90)</FieldLabel>
          <Input id="lq-lat" inputMode="decimal" value={lat} placeholder="e.g. 40.7128" onChange={(e) => setLat(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="lq-lon">Longitude (−180…180)</FieldLabel>
          <Input id="lq-lon" inputMode="decimal" value={lon} placeholder="e.g. -74.006" onChange={(e) => setLon(e.target.value)} />
        </div>
      </div>
      <QrShell payload={ok ? `geo:${la},${lo}` : ""} fileName="location-qr.png" />
    </div>
  );
}

function CalendarQrTool() {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loc, setLoc] = useState("");
  const fmt = (s: string) => s.replace(/[-:]/g, "").replace("T", "T");
  const ok = title.trim() && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(end);
  const payload = ok
    ? `BEGIN:VEVENT\nSUMMARY:${title.trim()}\nDTSTART:${fmt(start)}00\nDTEND:${fmt(end)}00\n${loc.trim() ? `LOCATION:${loc.trim()}\n` : ""}END:VEVENT`
    : "";
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="cq-t">Event title</FieldLabel>
          <Input id="cq-t" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="cq-l">Location (optional)</FieldLabel>
          <Input id="cq-l" value={loc} onChange={(e) => setLoc(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="cq-s">Start</FieldLabel>
          <Input id="cq-s" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="cq-e">End</FieldLabel>
          <Input id="cq-e" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <QrShell payload={payload} fileName="event-qr.png" />
    </div>
  );
}

/* ---------- barcodes ---------- */

function BarcodeCanvas({ bits, label, fileName }: { bits: string; label: string; fileName: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ref.current) return;
    try {
      drawBarcode(ref.current, bits, label);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Render failed.");
    }
  }, [bits, label]);

  const download = async () => {
    if (!ref.current) return;
    try {
      const blob = await canvasToPng(ref.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      setError("Download failed.");
    }
  };

  return (
    <div className="mt-4">
      <canvas ref={ref} className="mx-auto max-w-full rounded-xl border border-(--border) bg-white" aria-label={`Barcode for ${label}`} />
      <div className="mt-3 text-center">
        <Button type="button" variant="secondary" onClick={() => void download()}>Download PNG</Button>
      </div>
      <Err message={error} />
    </div>
  );
}

function BarcodeTool() {
  const [text, setText] = useState("");
  const [kind, setKind] = useState("code128");
  const [error, setError] = useState("");
  const [code, setCode] = useState<{ bits: string; label: string } | null>(null);

  const run = () => {
    setError("");
    try {
      setCode(kind === "code39" ? encodeCode39(text) : encodeCode128(text));
    } catch (e) {
      setCode(null);
      setError(e instanceof Error ? e.message : "Encoding failed.");
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="bc-t">Text to encode</FieldLabel>
          <Input id="bc-t" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="bc-k">Symbology</FieldLabel>
          <select id="bc-k" value={kind} onChange={(e) => setKind(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px]">
            <option value="code128">Code128 (compact, any ASCII)</option>
            <option value="code39">Code39 (A–Z, 0–9, few symbols)</option>
          </select>
        </div>
      </div>
      <div className="mt-3">
        <Button type="button" onClick={run}>Generate barcode</Button>
      </div>
      <Err message={error} />
      {code && <BarcodeCanvas bits={code.bits} label={code.label} fileName="barcode.png" />}
    </div>
  );
}

function SymbologyTool({ fixed, placeholder, hint }: { fixed: "code128" | "code39"; placeholder: string; hint: string }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [code, setCode] = useState<{ bits: string; label: string } | null>(null);

  const run = () => {
    setError("");
    try {
      setCode(fixed === "code39" ? encodeCode39(text) : encodeCode128(text));
    } catch (e) {
      setCode(null);
      setError(e instanceof Error ? e.message : "Encoding failed.");
    }
  };

  return (
    <div>
      <FieldLabel htmlFor="sym-t">Text</FieldLabel>
      <Input id="sym-t" value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} />
      <div className="mt-3">
        <Button type="button" onClick={run}>Generate {fixed === "code39" ? "Code39" : "Code128"}</Button>
      </div>
      <Err message={error} />
      {code && <BarcodeCanvas bits={code.bits} label={code.label} fileName={`${fixed}.png`} />}
      <Note>{hint}</Note>
    </div>
  );
}

function Code128Tool() {
  return <SymbologyTool fixed="code128" placeholder="e.g. SKU-88231-A" hint="Code128-B encodes any printable ASCII with an automatic mod-103 check digit." />;
}

function Code39Tool() {
  return <SymbologyTool fixed="code39" placeholder="e.g. ASSET-042" hint="Code39 supports A–Z, 0–9 and - . space $ / + %." />;
}

function EanTool() {
  const [digits, setDigits] = useState("");
  const [error, setError] = useState("");
  const [code, setCode] = useState<{ bits: string; label: string } | null>(null);

  const run = () => {
    setError("");
    try {
      setCode(encodeEan13(digits));
    } catch (e) {
      setCode(null);
      setError(e instanceof Error ? e.message : "Encoding failed.");
    }
  };

  return (
    <div>
      <FieldLabel htmlFor="ean-d">First 12 digits</FieldLabel>
      <Input id="ean-d" inputMode="numeric" value={digits} placeholder="e.g. 590123412345" onChange={(e) => setDigits(e.target.value)} />
      <div className="mt-3">
        <Button type="button" onClick={run}>Generate EAN-13</Button>
      </div>
      <Err message={error} />
      {code && <BarcodeCanvas bits={code.bits} label={code.label} fileName="ean13.png" />}
      <Note>Check digit computed with mod-10 weights — scan-verified pattern layout.</Note>
    </div>
  );
}

function UpcTool() {
  const [digits, setDigits] = useState("");
  const [error, setError] = useState("");
  const [code, setCode] = useState<{ bits: string; label: string } | null>(null);

  const run = () => {
    setError("");
    const d = digits.replace(/\D/g, "");
    if (d.length !== 11) {
      setCode(null);
      setError("Enter exactly the first 11 digits.");
      return;
    }
    try {
      setCode(encodeEan13(`0${d}`));
    } catch (e) {
      setCode(null);
      setError(e instanceof Error ? e.message : "Encoding failed.");
    }
  };

  return (
    <div>
      <FieldLabel htmlFor="upc-d">First 11 digits</FieldLabel>
      <Input id="upc-d" inputMode="numeric" value={digits} placeholder="e.g. 03600029145" onChange={(e) => setDigits(e.target.value)} />
      <div className="mt-3">
        <Button type="button" onClick={run}>Generate UPC-A</Button>
      </div>
      <Err message={error} />
      {code && <BarcodeCanvas bits={code.bits} label={code.label} fileName="upc.png" />}
    </div>
  );
}

function IsbnGenTool() {
  const [digits, setDigits] = useState("");
  const [error, setError] = useState("");
  const [code, setCode] = useState<{ bits: string; label: string } | null>(null);

  const run = () => {
    setError("");
    const d = digits.replace(/[^0-9]/g, "");
    const body = d.startsWith("978") || d.startsWith("979") ? d.slice(0, 12) : `978${d}`.slice(0, 12);
    if (body.length !== 12) {
      setCode(null);
      setError("Enter 9–12 digits (978/979 prefix added automatically).");
      return;
    }
    try {
      const check = ean13Checksum(body);
      setCode(encodeEan13(body + check));
    } catch (e) {
      setCode(null);
      setError(e instanceof Error ? e.message : "Encoding failed.");
    }
  };

  return (
    <div>
      <FieldLabel htmlFor="isbn-d">Digits (prefix + publisher + title)</FieldLabel>
      <Input id="isbn-d" inputMode="numeric" value={digits} placeholder="e.g. 978014300723" onChange={(e) => setDigits(e.target.value)} />
      <div className="mt-3">
        <Button type="button" onClick={run}>Generate ISBN barcode</Button>
      </div>
      <Err message={error} />
      {code && <BarcodeCanvas bits={code.bits} label={code.label} fileName="isbn.png" />}
    </div>
  );
}

function IsbnCheckTool() {
  return (
    <TextOp
      placeholder="Paste an ISBN-10 or ISBN-13…"
      button="Validate ISBN"
      process={(t) => {
        const r = validateIsbn(t);
        return { output: r.message, stats: [["Type", r.kind], ["Valid", r.valid ? "Yes" : "No"]] };
      }}
    />
  );
}

/* ---------- id generators ---------- */

const NANO_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";

function NanoTool() {
  return (
    <Calc
      button="Generate IDs"
      fields={[
        { key: "n", label: "How many", type: "number", def: "5", required: true },
        { key: "len", label: "Length", type: "number", def: "21", required: true },
      ]}
      compute={(v) => {
        const n = Number(v.n);
        const len = Number(v.len);
        if (!Number.isInteger(n) || n < 1 || n > 100) return { error: "Count must be 1–100." };
        if (!Number.isInteger(len) || len < 4 || len > 128) return { error: "Length must be 4–128." };
        const ids: string[] = [];
        for (let i = 0; i < n; i++) {
          const { bytes } = randomBytes(len);
          ids.push([...bytes].map((b) => NANO_ALPHA[(b as number) % 64]).join(""));
        }
        return { rows: [[`${n} ID(s)`, ids[0] as string], ...(ids.slice(1).map((id, i) => [`#${i + 2}`, id] as [string, string])), ["Alphabet", "A–Z a–z 0–9 _ -"], ["Source", "crypto.getRandomValues"]] };
      }}
    />
  );
}

function SlugGenTool() {
  return (
    <TextOp
      placeholder="Paste a headline…"
      button="Make slug"
      process={(t) => {
        const slug = t.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
        if (!slug) return { error: "Nothing slug-safe in that text." };
        return { output: slug, stats: [["Length", `${slug.length} chars`]] };
      }}
    />
  );
}

const GREEK = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
];

function PlaceholderTool() {
  return (
    <Gen
      fields={[
        {
          key: "theme", label: "Theme", type: "select",
          options: [{ value: "latin", label: "Classic Latin" }, { value: "tech", label: "Tech" }, { value: "food", label: "Food" }, { value: "travel", label: "Travel" }],
        },
        { key: "n", label: "Paragraphs", type: "number", def: "3", required: true },
      ]}
      generate={(v) => {
        const n = Math.min(20, Math.max(1, Math.floor(Number(v.n) || 3)));
        const banks: Record<string, string[]> = {
          latin: GREEK,
          tech: [
            "The dashboard syncs metrics across every deploy. Developers ship features behind flags while monitors watch error budgets.",
            "Our API returns paginated JSON with cursor tokens. Clients cache aggressively and retry with exponential backoff.",
            "Containers scale horizontally on CPU and queue depth. Rollbacks are one command and take seconds, not hours.",
          ],
          food: [
            "Fold the warm dough gently and rest it under a cloth. The crust crackles while the crumb stays soft and open.",
            "Simmer tomatoes with garlic until the oil glistens. Finish with basil, salt, and a thread of olive oil.",
            "Whisk eggs over low heat for a slow, creamy curd. Serve on toast with cracked pepper and herbs.",
          ],
          travel: [
            "Morning trains leave before the crowds wake. Grab a window seat and watch the coastline slide past.",
            "Pack light, walk far, and eat where the locals queue. The best views are rarely on the postcards.",
            "Ferries hop between islands on the hour. Salt air, slow decks, and harbors full of fishing boats.",
          ],
        };
        const bank = banks[v.theme ?? ""] ?? GREEK;
        const out: string[] = [];
        for (let i = 0; i < n; i++) out.push(bank[i % bank.length] as string);
        return `${out.join("\n\n")}\n\n(Sample filler text for mockups — clearly not real content.)`;
      }}
      fileName="placeholder.txt"
      button="Generate text"
    />
  );
}

const FIRST = ["Ava", "Liam", "Mia", "Noah", "Zoe", "Ethan", "Ruby", "Felix", "Ivy", "Omar", "Nina", "Kai", "Lena", "Ravi", "Tara", "Yuki"];
const LAST = ["Patel", "Garcia", "Kim", "Novak", "Silva", "Haddad", "Muller", "Rossi", "Dubois", "Tanaka", "Ali", "Smith", "Khan", "Roy", "Costa", "Weber"];
const CITIES = ["Springfield", "Riverton", "Lakeside", "Maple Grove", "Cedar Falls", "Brookfield", "Hillcrest", "Fairview"];
const STREETS = ["Oak Ave", "Main St", "Cedar Ln", "Park Rd", "Elm St", "River Dr"];
const COMPANIES_A = ["Bright", "Swift", "Clear", "North", "Blue", "Green", "Prime", "Nova", "True", "Bold"];
const COMPANIES_B = ["Peak", "Labs", "Works", "Line", "Forge", "Base", "Loop", "Stack", "Craft", "Shift"];

function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1).value] as T;
}

function FakeDataTool() {
  return (
    <Gen
      fields={[{ key: "n", label: "Rows", type: "number", def: "10", required: true }]}
      generate={(v) => {
        const n = Math.min(200, Math.max(1, Math.floor(Number(v.n) || 10)));
        const header = "name,email,phone,city";
        const rows = [header];
        for (let i = 0; i < n; i++) {
          const fn = pick(FIRST).toLowerCase();
          const ln = pick(LAST).toLowerCase();
          rows.push(`${pick(FIRST)} ${pick(LAST)},${fn}.${ln}@example.com,+1-555-${String(100 + randomInt(0, 899).value)}-${String(1000 + randomInt(0, 8999).value)},${pick(CITIES)}`);
        }
        return `SYNTHETIC TEST DATA — fictional people, safe for testing.\n\n${rows.join("\n")}`;
      }}
      fileName="test-data.csv"
      button="Generate rows"
    />
  );
}

function RandomJsonTool() {
  return (
    <Gen
      fields={[
        { key: "n", label: "Objects", type: "number", def: "5", required: true },
        {
          key: "shape", label: "Shape", type: "select",
          options: [{ value: "user", label: "Users" }, { value: "product", label: "Products" }, { value: "event", label: "Events" }],
        },
      ]}
      generate={(v) => {
        const n = Math.min(100, Math.max(1, Math.floor(Number(v.n) || 5)));
        const makers: Record<string, () => Record<string, unknown>> = {
          user: () => ({ id: randomInt(1, 99999).value, name: `${pick(FIRST)} ${pick(LAST)}`, email: `${pick(FIRST).toLowerCase()}@example.com`, active: randomInt(0, 1).value === 1 }),
          product: () => ({ sku: `SKU-${randomInt(1000, 9999).value}`, name: `${pick(COMPANIES_A)} ${pick(COMPANIES_B)}`, price: Number((randomInt(100, 9999).value / 100).toFixed(2)), inStock: randomInt(0, 1).value === 1 }),
          event: () => ({ id: `evt_${randomInt(1000, 9999).value}`, title: `${pick(COMPANIES_A)} meetup`, day: randomInt(1, 28).value, seats: randomInt(10, 200).value }),
        };
        const make = makers[v.shape ?? ""] ?? makers.user;
        if (!make) return { error: "Choose a shape." };
        return JSON.stringify(Array.from({ length: n }, () => (make as () => Record<string, unknown>)()), null, 2);
      }}
      fileName="sample.json"
      mime="application/json"
      button="Generate JSON"
    />
  );
}

function RandomCsvTool() {
  return (
    <Gen
      fields={[{ key: "n", label: "Rows", type: "number", def: "20", required: true }]}
      generate={(v) => {
        const n = Math.min(1000, Math.max(1, Math.floor(Number(v.n) || 20)));
        const rows = ["id,name,email,score"];
        for (let i = 1; i <= n; i++) {
          rows.push(`${i},${pick(FIRST)} ${pick(LAST)},user${i}@example.com,${randomInt(0, 100).value}`);
        }
        return rows.join("\n");
      }}
      fileName="sample.csv"
      button="Generate CSV"
    />
  );
}

function RandomAddressTool() {
  return (
    <Gen
      fields={[{ key: "n", label: "How many", type: "number", def: "5", required: true }]}
      generate={(v) => {
        const n = Math.min(100, Math.max(1, Math.floor(Number(v.n) || 5)));
        const out: string[] = [];
        for (let i = 0; i < n; i++) {
          out.push(`${randomInt(1, 9999).value} ${pick(STREETS)}, ${pick(CITIES)}, ST ${String(randomInt(10000, 99999).value)}`);
        }
        return `FICTIONAL ADDRESSES — for testing only.\n\n${out.join("\n")}`;
      }}
      fileName="addresses.txt"
      button="Generate addresses"
    />
  );
}

function RandomEmailTool() {
  return (
    <Gen
      fields={[{ key: "n", label: "How many", type: "number", def: "5", required: true }]}
      generate={(v) => {
        const n = Math.min(100, Math.max(1, Math.floor(Number(v.n) || 5)));
        const out: string[] = [];
        for (let i = 0; i < n; i++) {
          out.push(`${pick(FIRST).toLowerCase()}.${pick(LAST).toLowerCase()}${randomInt(1, 99).value}@example.com`);
        }
        return `EXAMPLE ADDRESSES — safe for tests, never real inboxes.\n\n${out.join("\n")}`;
      }}
      fileName="emails.txt"
      button="Generate emails"
    />
  );
}

function RandomPhoneTool() {
  return (
    <Gen
      fields={[{ key: "n", label: "How many", type: "number", def: "5", required: true }]}
      generate={(v) => {
        const n = Math.min(100, Math.max(1, Math.floor(Number(v.n) || 5)));
        const out: string[] = [];
        for (let i = 0; i < n; i++) {
          out.push(`+1-555-${String(100 + randomInt(0, 899).value)}-${String(1000 + randomInt(0, 8999).value)}`);
        }
        return `FICTIONAL 555 NUMBERS — for testing only, not dialable.\n\n${out.join("\n")}`;
      }}
      fileName="phones.txt"
      button="Generate numbers"
    />
  );
}

function RandomCompanyTool() {
  return (
    <Gen
      fields={[{ key: "n", label: "How many", type: "number", def: "10", required: true }]}
      generate={(v) => {
        const n = Math.min(100, Math.max(1, Math.floor(Number(v.n) || 10)));
        const out = new Set<string>();
        let guard = 0;
        while (out.size < n && guard++ < 1000) out.add(`${pick(COMPANIES_A)}${pick(COMPANIES_B)}`);
        return `FICTIONAL COMPANY NAMES — for mockups only.\n\n${[...out].join("\n")}`;
      }}
      fileName="companies.txt"
      button="Generate names"
    />
  );
}

function RandomHexTool() {
  return (
    <Calc
      button="Generate hex"
      fields={[{ key: "len", label: "Characters", type: "number", def: "32", required: true }]}
      compute={(v) => {
        const len = Number(v.len);
        if (!Number.isInteger(len) || len < 4 || len > 512) return { error: "Use 4–512 characters." };
        const { bytes } = randomBytes(Math.ceil(len / 2));
        const hex = [...bytes].map((b) => (b as number).toString(16).padStart(2, "0")).join("").slice(0, len);
        return { rows: [["Hex", hex.length > 80 ? hex.slice(0, 80) + "…" : hex], ["Full value (copies whole)", hex]] };
      }}
    />
  );
}
