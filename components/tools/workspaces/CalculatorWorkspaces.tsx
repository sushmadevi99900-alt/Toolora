"use client";

import { useMemo, useState } from "react";
import { Stat } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { FieldLabel, Input } from "../../ui/Input";
import { copyText, formatInteger, formatResult } from "@/lib/engine/formatters";
import { requireFiniteNumber, parseNumberList } from "@/lib/engine/validation";

function ErrorNote({ error }: { error?: string }) {
  if (!error) return null;
  return <p role="alert" className="mt-2 text-sm font-medium text-danger-600">{error}</p>;
}

function useCopyFlag(): [boolean, (t: string) => void] {
  const [copied, setCopied] = useState(false);
  return [copied, async (t: string) => {
    if (t && (await copyText(t))) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }];
}

function NumField({ id, label, value, onChange, placeholder }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

/* ---------- Percentage ---------- */

export function PercentageCalculatorTool() {
  const [mode, setMode] = useState("of");
  const [a, setA] = useState("20");
  const [b, setB] = useState("150");
  const res = useMemo(() => {
    const pa = requireFiniteNumber(a, "first number");
    const pb = requireFiniteNumber(b, "second number");
    if (!pa.ok) return { error: pa.error };
    if (!pb.ok) return { error: pb.error };
    const x = pa.value as number, y = pb.value as number;
    if (mode === "of") return { value: (x / 100) * y, label: `${x}% of ${formatResult(y)}`, steps: `${x} ÷ 100 × ${y}` };
    if (mode === "change") {
      if (x === 0) return { error: "The starting value cannot be zero for percentage change." };
      const change = ((y - x) / Math.abs(x)) * 100;
      return { value: change, suffix: "%", label: `Change from ${formatResult(x)} to ${formatResult(y)}`, steps: `(${y} − ${x}) ÷ ${x} × 100` };
    }
    if (y === 0) return { error: "The total cannot be zero." };
    return { value: (x / y) * 100, suffix: "%", label: `${formatResult(x)} as % of ${formatResult(y)}`, steps: `${x} ÷ ${y} × 100` };
  }, [a, b, mode]);
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Calculation type">
        {[["of", "X% of Y"], ["change", "% change"], ["what", "X is what % of Y"]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setMode(v)} aria-pressed={mode === v}
            className={`min-h-[40px] rounded-full border px-4 text-sm font-semibold ${mode === v ? "border-brand-600 bg-brand-600 text-white" : "border-(--border) text-(--muted) hover:text-(--foreground)"}`}>{l}</button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumField id="pct-a" label={mode === "of" ? "Percentage (X)" : mode === "change" ? "From" : "Part (X)"} value={a} onChange={setA} />
        <NumField id="pct-b" label={mode === "of" ? "Value (Y)" : mode === "change" ? "To" : "Total (Y)"} value={b} onChange={setB} />
      </div>
      <ErrorNote error={res.error} />
      {!res.error && "value" in res && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) p-5 text-center">
          <p className="text-sm font-medium text-(--muted)">{res.label}</p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums">{formatResult(res.value as number)}{"suffix" in res ? (res.suffix as string) : ""}</p>
          {"steps" in res && <p className="mt-1 font-mono text-xs text-(--muted)">{res.steps as string}</p>}
        </div>
      )}
    </div>
  );
}

/* ---------- Age ---------- */

function diffYMD(from: Date, to: Date) {
  let y = to.getFullYear() - from.getFullYear();
  let m = to.getMonth() - from.getMonth();
  let d = to.getDate() - from.getDate();
  if (d < 0) { m -= 1; d += new Date(to.getFullYear(), to.getMonth(), 0).getDate(); }
  if (m < 0) { y -= 1; m += 12; }
  return { y, m, d };
}

export function AgeCalculatorTool() {
  const [dob, setDob] = useState("2000-01-01");
  const [at, setAt] = useState("");
  const res = useMemo(() => {
    if (!dob) return { error: "Enter a birth date." };
    const birth = new Date(`${dob}T00:00:00`);
    const end = at ? new Date(`${at}T00:00:00`) : new Date();
    if (Number.isNaN(+birth) || Number.isNaN(+end)) return { error: "Enter valid dates." };
    if (end < birth) return { error: "The end date is before the birth date." };
    const { y, m, d } = diffYMD(birth, end);
    const totalDays = Math.floor((+end - +birth) / 86_400_000);
    const next = new Date(end.getFullYear(), birth.getMonth(), birth.getDate());
    if (next <= end) next.setFullYear(next.getFullYear() + 1);
    const toNext = Math.ceil((+next - +end) / 86_400_000);
    return { y, m, d, totalDays, weeks: Math.floor(totalDays / 7), toNext, weekday: birth.toLocaleDateString("en-US", { weekday: "long" }) };
  }, [dob, at]);
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="age-dob">Birth date</FieldLabel>
          <Input id="age-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="age-at">Age at (optional, default today)</FieldLabel>
          <Input id="age-at" type="date" value={at} onChange={(e) => setAt(e.target.value)} />
        </div>
      </div>
      <ErrorNote error={res.error} />
      {!res.error && "y" in res && (
        <div aria-live="polite" className="mt-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat value={formatInteger(res.y as number)} label="Years" />
            <Stat value={formatInteger(res.m as number)} label="Months" />
            <Stat value={formatInteger(res.d as number)} label="Days" />
          </div>
          <p className="mt-3 text-center text-sm text-(--muted)">
            {formatInteger(res.totalDays as number)} days · {formatInteger(res.weeks as number)} weeks · born on a {res.weekday as string} · next birthday in {res.toNext as number} day{(res.toNext as number) === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------- Date difference ---------- */

export function DateDifferenceTool() {
  const [from, setFrom] = useState("2025-01-01");
  const [to, setTo] = useState("2026-01-01");
  const [inclusive, setInclusive] = useState(false);
  const res = useMemo(() => {
    if (!from || !to) return { error: "Pick both dates." };
    const s = new Date(`${from}T00:00:00`), e = new Date(`${to}T00:00:00`);
    if (Number.isNaN(+s) || Number.isNaN(+e)) return { error: "Enter valid dates." };
    const [start, end] = s <= e ? [s, e] : [e, s];
    let days = Math.round((+end - +start) / 86_400_000);
    if (inclusive) days += 1;
    const { y, m, d } = diffYMD(start, end);
    return { days, weeks: Math.floor(days / 7), months: y * 12 + m, label: `${y}y ${m}m ${d}d` };
  }, [from, to, inclusive]);
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="dd-from">Start date</FieldLabel>
          <Input id="dd-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="dd-to">End date</FieldLabel>
          <Input id="dd-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <label className="mt-3 flex min-h-[44px] items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={inclusive} onChange={(e) => setInclusive(e.target.checked)} className="h-5 w-5 accent-brand-600" />
        Count the end date too (inclusive)
      </label>
      <ErrorNote error={res.error} />
      {!res.error && "days" in res && (
        <div aria-live="polite" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={formatInteger(res.days as number)} label="Days" />
          <Stat value={formatInteger(res.weeks as number)} label="Weeks" />
          <Stat value={formatInteger(res.months as number)} label="Months" />
          <Stat value={res.label as string} label="Y / M / D" />
        </div>
      )}
    </div>
  );
}

/* ---------- BMI ---------- */

export function BmiCalculatorTool() {
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [h, setH] = useState("170");
  const [w, setW] = useState("65");
  const res = useMemo(() => {
    const ph = requireFiniteNumber(h, "height");
    const pw = requireFiniteNumber(w, "weight");
    if (!ph.ok) return { error: ph.error };
    if (!pw.ok) return { error: pw.error };
    const heightM = unit === "metric" ? (ph.value as number) / 100 : (ph.value as number) * 0.0254;
    const weightKg = unit === "metric" ? (pw.value as number) : (pw.value as number) * 0.453592;
    if (heightM <= 0 || weightKg <= 0) return { error: "Height and weight must be positive." };
    const bmi = weightKg / (heightM * heightM);
    const band = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy range" : bmi < 30 ? "Overweight" : "Obesity range";
    return { bmi, band };
  }, [h, w, unit]);
  return (
    <div>
      <div className="flex gap-2" role="group" aria-label="Units">
        {(["metric", "imperial"] as const).map((u) => (
          <button key={u} type="button" onClick={() => setUnit(u)} aria-pressed={unit === u}
            className={`min-h-[40px] rounded-full border px-4 text-sm font-semibold ${unit === u ? "border-brand-600 bg-brand-600 text-white" : "border-(--border) text-(--muted)"}`}>{u === "metric" ? "cm / kg" : "in / lb"}</button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumField id="bmi-h" label={unit === "metric" ? "Height (cm)" : "Height (in)"} value={h} onChange={setH} />
        <NumField id="bmi-w" label={unit === "metric" ? "Weight (kg)" : "Weight (lb)"} value={w} onChange={setW} />
      </div>
      <ErrorNote error={res.error} />
      {!res.error && "bmi" in res && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) p-5 text-center">
          <p className="text-4xl font-extrabold tabular-nums">{formatResult(res.bmi as number, 1)}</p>
          <p className="mt-1 text-sm font-semibold">{res.band as string} <span className="font-normal text-(--muted)">(screening aid, not a diagnosis)</span></p>
        </div>
      )}
    </div>
  );
}

/* ---------- Discount ---------- */

export function DiscountCalculatorTool() {
  const [price, setPrice] = useState("1000");
  const [pct, setPct] = useState("20");
  const [extra, setExtra] = useState("0");
  const res = useMemo(() => {
    const p = requireFiniteNumber(price, "price");
    const d = requireFiniteNumber(pct, "discount");
    const e = requireFiniteNumber(extra || "0", "extra discount");
    if (!p.ok) return { error: p.error };
    if (!d.ok) return { error: d.error };
    if (!e.ok) return { error: e.error };
    const afterFirst = (p.value as number) * (1 - (d.value as number) / 100);
    const final = afterFirst * (1 - (e.value as number) / 100);
    return { final: Math.max(final, 0), saved: (p.value as number) - Math.max(final, 0), effective: p.value ? (((p.value as number) - Math.max(final, 0)) / (p.value as number)) * 100 : 0 };
  }, [price, pct, extra]);
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <NumField id="disc-price" label="Original price" value={price} onChange={setPrice} />
        <NumField id="disc-pct" label="Discount %" value={pct} onChange={setPct} />
        <NumField id="disc-extra" label="Extra % (optional)" value={extra} onChange={setExtra} />
      </div>
      <ErrorNote error={res.error} />
      {!res.error && "final" in res && (
        <div aria-live="polite" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat value={formatResult(res.final as number, 2)} label="Sale price" />
          <Stat value={formatResult(res.saved as number, 2)} label="You save" />
          <Stat value={`${formatResult(res.effective as number, 1)}%`} label="Effective off" />
        </div>
      )}
    </div>
  );
}

/* ---------- Tip ---------- */

export function TipCalculatorTool() {
  const [bill, setBill] = useState("500");
  const [pct, setPct] = useState("10");
  const [people, setPeople] = useState("2");
  const res = useMemo(() => {
    const b = requireFiniteNumber(bill, "bill");
    const t = requireFiniteNumber(pct, "tip");
    const n = requireFiniteNumber(people, "people");
    if (!b.ok) return { error: b.error };
    if (!t.ok) return { error: t.error };
    if (!n.ok) return { error: n.error };
    if ((n.value as number) < 1) return { error: "Split between at least 1 person." };
    const tip = (b.value as number) * ((t.value as number) / 100);
    const total = (b.value as number) + tip;
    return { tip, total, each: total / Math.floor(n.value as number) };
  }, [bill, pct, people]);
  const presets = ["5", "10", "15", "20"];
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <NumField id="tip-bill" label="Bill amount" value={bill} onChange={setBill} />
        <NumField id="tip-pct" label="Tip %" value={pct} onChange={setPct} />
        <NumField id="tip-people" label="People" value={people} onChange={setPeople} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Tip presets">
        {presets.map((p) => (
          <button key={p} type="button" onClick={() => setPct(p)} aria-pressed={pct === p}
            className={`min-h-[40px] rounded-full border px-4 text-sm font-semibold ${pct === p ? "border-brand-600 bg-brand-600 text-white" : "border-(--border) text-(--muted)"}`}>{p}%</button>
        ))}
      </div>
      <ErrorNote error={res.error} />
      {!res.error && "tip" in res && (
        <div aria-live="polite" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat value={formatResult(res.tip as number, 2)} label="Tip" />
          <Stat value={formatResult(res.total as number, 2)} label="Total" />
          <Stat value={formatResult(res.each as number, 2)} label="Each pays" />
        </div>
      )}
    </div>
  );
}

/* ---------- Average / Ratio / Fraction ---------- */

export function AverageCalculatorTool() {
  const [raw, setRaw] = useState("85, 90, 78, 92");
  const [copied, copy] = useCopyFlag();
  const res = useMemo(() => {
    const { values, skipped } = parseNumberList(raw);
    if (!values.length) return { error: "Enter at least one number (separate with commas, spaces or lines)." };
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const freq = new Map<number, number>();
    for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
    const best = Math.max(...freq.values());
    const modes = best > 1 ? [...freq.entries()].filter(([, c]) => c === best).map(([v]) => v) : [];
    return { mean, median, modes, range: sorted[sorted.length - 1] - sorted[0], count: values.length, skipped };
  }, [raw]);
  return (
    <div>
      <FieldLabel htmlFor="avg-input">Numbers (comma, space or line separated)</FieldLabel>
      <textarea id="avg-input" value={raw} onChange={(e) => setRaw(e.target.value)} rows={4}
        className="min-h-[110px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 py-3 text-[15px]" />
      <ErrorNote error={res.error} />
      {!res.error && "mean" in res && (
        <div aria-live="polite" className="mt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat value={formatResult(res.mean as number, 2)} label="Mean" />
            <Stat value={formatResult(res.median as number, 2)} label="Median" />
            <Stat value={(res.modes as number[]).length ? (res.modes as number[]).join(", ") : "—"} label="Mode" />
            <Stat value={formatResult(res.range as number, 2)} label="Range" />
          </div>
          <p className="mt-2 text-sm text-(--muted)">Count: {res.count as number}{(res.skipped as number) ? ` · skipped ${res.skipped as number} non-number(s)` : ""}</p>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => copy(`Mean: ${res.mean}, Median: ${res.median}, Range: ${res.range}`)}>{copied ? "Copied ✓" : "Copy summary"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b));
  while (b) { [a, b] = [b, a % b]; }
  return a || 1;
}

export function RatioCalculatorTool() {
  const [mode, setMode] = useState("simplify");
  const [r1, setR1] = useState("12");
  const [r2, setR2] = useState("18");
  const [scale, setScale] = useState("2");
  const res = useMemo(() => {
    const p1 = requireFiniteNumber(r1, "first part");
    const p2 = requireFiniteNumber(r2, "second part");
    if (!p1.ok) return { error: p1.error };
    if (!p2.ok) return { error: p2.error };
    const x = p1.value as number, y = p2.value as number;
    if (mode === "simplify") {
      const g = gcd(x, y);
      return { text: `${formatResult(x / g, 2)} : ${formatResult(y / g, 2)}`, hint: `Divided by GCD ${g}` };
    }
    const s = requireFiniteNumber(scale, "scale");
    if (!s.ok) return { error: s.error };
    return { text: `${formatResult(x * (s.value as number), 2)} : ${formatResult(y * (s.value as number), 2)}`, hint: `Scaled × ${s.value}` };
  }, [r1, r2, scale, mode]);
  return (
    <div>
      <div className="flex gap-2" role="group" aria-label="Ratio mode">
        {[["simplify", "Simplify"], ["scale", "Scale"]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setMode(v)} aria-pressed={mode === v}
            className={`min-h-[40px] rounded-full border px-4 text-sm font-semibold ${mode === v ? "border-brand-600 bg-brand-600 text-white" : "border-(--border) text-(--muted)"}`}>{l}</button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <NumField id="ratio-1" label="Part A" value={r1} onChange={setR1} />
        <NumField id="ratio-2" label="Part B" value={r2} onChange={setR2} />
        {mode === "scale" && <NumField id="ratio-s" label="Scale ×" value={scale} onChange={setScale} />}
      </div>
      <ErrorNote error={res.error} />
      {!res.error && "text" in res && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) p-5 text-center">
          <p className="text-3xl font-extrabold tabular-nums">{res.text as string}</p>
          <p className="mt-1 text-sm text-(--muted)">{res.hint as string}</p>
        </div>
      )}
    </div>
  );
}

export function FractionCalculatorTool() {
  const [n1, setN1] = useState("1"); const [d1, setD1] = useState("2");
  const [n2, setN2] = useState("1"); const [d2, setD2] = useState("4");
  const [op, setOp] = useState("+");
  // Computed directly (no useMemo): trivial arithmetic that the
  // React compiler cannot preserve as manual memoization.
  const res = (() => {
    const parts = [
      requireFiniteNumber(n1, "numerator"),
      requireFiniteNumber(d1, "denominator"),
      requireFiniteNumber(n2, "numerator"),
      requireFiniteNumber(d2, "denominator"),
    ];
    for (const p of parts) if (!p.ok) return { error: p.error };
    const [a, b, c, d] = parts.map((p) => (p as { value: number }).value);
    if (b === 0 || d === 0) return { error: "Denominators cannot be zero." };
    let n = 0, den = 1;
    if (op === "+") { n = a * d + c * b; den = b * d; }
    if (op === "−") { n = a * d - c * b; den = b * d; }
    if (op === "×") { n = a * c; den = b * d; }
    if (op === "÷") {
      if (c === 0) return { error: "Cannot divide by zero." };
      n = a * d; den = b * c;
    }
    if (den < 0) { n = -n; den = -den; }
    const g = gcd(n, den);
    const sn = n / g, sd = den / g;
    return { text: sd === 1 ? `${sn}` : `${sn}/${sd}`, decimal: formatResult(n / den, 4) };
  })();
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:items-end">
        <NumField id="fr-n1" label="Num A" value={n1} onChange={setN1} />
        <NumField id="fr-d1" label="Den A" value={d1} onChange={setD1} />
        <div>
          <FieldLabel htmlFor="fr-op">Op</FieldLabel>
          <select id="fr-op" value={op} onChange={(e) => setOp(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px]">
            {["+", "−", "×", "÷"].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <NumField id="fr-n2" label="Num B" value={n2} onChange={setN2} />
        <NumField id="fr-d2" label="Den B" value={d2} onChange={setD2} />
      </div>
      <ErrorNote error={res.error} />
      {!res.error && "text" in res && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) p-5 text-center">
          <p className="text-3xl font-extrabold tabular-nums">{res.text as string}</p>
          <p className="mt-1 text-sm text-(--muted)">= {res.decimal as string} (simplified)</p>
        </div>
      )}
    </div>
  );
}

/* ---------- shared loan math ---------- */

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  );

function emiOf(principal: number, annualRate: number, months: number): number {
  if (months <= 0 || principal <= 0) return NaN;
  if (annualRate <= 0) return principal / months;
  const r = annualRate / 1200;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

function FinanceNote() {
  return <p className="mt-3 text-xs text-(--muted)">Estimate only — not financial advice. Confirm with your bank before borrowing or investing.</p>;
}

/* ---------- EMI ---------- */

export function EmiCalculatorTool() {
  const [p, setP] = useState("500000");
  const [rate, setRate] = useState("9");
  const [years, setYears] = useState("5");
  const res = useMemo(() => {
    const pp = requireFiniteNumber(p, "loan amount");
    const rr = requireFiniteNumber(rate, "interest rate");
    const yy = requireFiniteNumber(years, "tenure");
    if (!pp.ok) return { error: pp.error };
    if (!rr.ok) return { error: rr.error };
    if (!yy.ok) return { error: yy.error };
    const principal = pp.value as number;
    const months = Math.round((yy.value as number) * 12);
    if (principal <= 0) return { error: "Loan amount must be positive." };
    if ((rr.value as number) < 0) return { error: "Interest rate cannot be negative." };
    if (months <= 0 || months > 600) return { error: "Tenure must be between 1 month and 50 years." };
    const emi = emiOf(principal, rr.value as number, months);
    const total = emi * months;
    return { emi, total, interest: total - principal, months };
  }, [p, rate, years]);
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <NumField id="emi-p" label="Loan amount (₹)" value={p} onChange={setP} />
        <NumField id="emi-r" label="Interest % p.a." value={rate} onChange={setRate} />
        <NumField id="emi-y" label="Tenure (years)" value={years} onChange={setYears} />
      </div>
      <ErrorNote error={res.error} />
      {!res.error && "emi" in res && (
        <div aria-live="polite" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat value={inr(res.emi as number)} label="Monthly EMI" />
          <Stat value={inr(res.interest as number)} label="Total interest" />
          <Stat value={inr(res.total as number)} label={`Payable (${res.months} mo)`} />
        </div>
      )}
      <FinanceNote />
    </div>
  );
}

/* ---------- GST (India) ---------- */

const GST_RATES = ["0", "0.1", "0.25", "3", "5", "12", "18", "28"];

export function GstCalculatorTool() {
  const [amount, setAmount] = useState("1000");
  const [rate, setRate] = useState("18");
  const [mode, setMode] = useState<"exclusive" | "inclusive">("exclusive");
  const res = useMemo(() => {
    const pa = requireFiniteNumber(amount, "amount");
    if (!pa.ok) return { error: pa.error };
    const r = Number(rate);
    if (!Number.isFinite(r) || r < 0 || r > 100) return { error: "GST rate must be between 0 and 100." };
    const a = pa.value as number;
    if (a < 0) return { error: "Amount cannot be negative." };
    if (mode === "exclusive") {
      const tax = (a * r) / 100;
      return { net: a, tax, gross: a + tax, rate: r };
    }
    const net = (a * 100) / (100 + r);
    return { net, tax: a - net, gross: a, rate: r };
  }, [amount, rate, mode]);
  return (
    <div>
      <div className="flex gap-2" role="group" aria-label="GST mode">
        <Button type="button" variant={mode === "exclusive" ? "primary" : "secondary"} onClick={() => setMode("exclusive")}>Add GST</Button>
        <Button type="button" variant={mode === "inclusive" ? "primary" : "secondary"} onClick={() => setMode("inclusive")}>Remove GST</Button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumField id="gst-a" label={mode === "exclusive" ? "Amount before GST (₹)" : "Amount including GST (₹)"} value={amount} onChange={setAmount} />
        <div>
          <FieldLabel htmlFor="gst-r">GST rate %</FieldLabel>
          <select id="gst-r" value={rate} onChange={(e) => setRate(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px]">
            {GST_RATES.map((g) => (
              <option key={g} value={g}>{g}%</option>
            ))}
          </select>
        </div>
      </div>
      <ErrorNote error={res.error} />
      {!res.error && "tax" in res && (
        <div aria-live="polite" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat value={inr(res.net as number)} label="Net amount" />
          <Stat value={inr(res.tax as number)} label={`GST (${res.rate}%)`} />
          <Stat value={inr(res.gross as number)} label="Total" />
        </div>
      )}
      <FinanceNote />
    </div>
  );
}

/* ---------- Loan (amortisation summary) ---------- */

export function LoanCalculatorTool() {
  const [p, setP] = useState("1000000");
  const [rate, setRate] = useState("8.5");
  const [years, setYears] = useState("10");
  const res = useMemo(() => {
    const pp = requireFiniteNumber(p, "loan amount");
    const rr = requireFiniteNumber(rate, "interest rate");
    const yy = requireFiniteNumber(years, "tenure");
    if (!pp.ok) return { error: pp.error };
    if (!rr.ok) return { error: rr.error };
    if (!yy.ok) return { error: yy.error };
    const principal = pp.value as number;
    const months = Math.round((yy.value as number) * 12);
    if (principal <= 0) return { error: "Loan amount must be positive." };
    if ((rr.value as number) < 0) return { error: "Interest rate cannot be negative." };
    if (months <= 0 || months > 600) return { error: "Tenure must be between 1 month and 50 years." };
    const emi = emiOf(principal, rr.value as number, months);
    const total = emi * months;
    // Year-wise principal/interest split.
    const r = (rr.value as number) / 1200;
    let balance = principal;
    const schedule: { year: number; principal: number; interest: number; balance: number }[] = [];
    const totalYears = Math.ceil(months / 12);
    for (let y = 1; y <= totalYears; y += 1) {
      let yp = 0;
      let yi = 0;
      for (let m = 0; m < 12 && (y - 1) * 12 + m < months; m += 1) {
        const interest = balance * r;
        const princ = Math.min(emi - interest, balance);
        yi += interest;
        yp += princ;
        balance -= princ;
      }
      schedule.push({ year: y, principal: yp, interest: yi, balance: Math.max(0, balance) });
    }
    return { emi, total, interest: total - principal, schedule };
  }, [p, rate, years]);
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <NumField id="loan-p" label="Loan amount (₹)" value={p} onChange={setP} />
        <NumField id="loan-r" label="Interest % p.a." value={rate} onChange={setRate} />
        <NumField id="loan-y" label="Tenure (years)" value={years} onChange={setYears} />
      </div>
      <ErrorNote error={res.error} />
      {!res.error && "emi" in res && (
        <>
          <div aria-live="polite" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat value={inr(res.emi as number)} label="Monthly EMI" />
            <Stat value={inr(res.interest as number)} label="Total interest" />
            <Stat value={inr(res.total as number)} label="Total payable" />
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-(--border)">
            <table className="w-full min-w-[480px] text-sm">
              <caption className="px-4 py-2 text-left font-bold">Year-wise breakup</caption>
              <thead>
                <tr className="bg-(--surface-2) text-left">
                  <th scope="col" className="px-4 py-2">Year</th>
                  <th scope="col" className="px-4 py-2 text-right">Principal</th>
                  <th scope="col" className="px-4 py-2 text-right">Interest</th>
                  <th scope="col" className="px-4 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {(res.schedule as { year: number; principal: number; interest: number; balance: number }[]).map((s) => (
                  <tr key={s.year} className="border-t border-(--border) tabular-nums">
                    <td className="px-4 py-2">{s.year}</td>
                    <td className="px-4 py-2 text-right">{inr(s.principal)}</td>
                    <td className="px-4 py-2 text-right">{inr(s.interest)}</td>
                    <td className="px-4 py-2 text-right">{inr(s.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <FinanceNote />
    </div>
  );
}

/* ---------- Compound + Simple interest ---------- */

const COMPOUND_FREQS = [
  { label: "Yearly", n: 1 },
  { label: "Half-yearly", n: 2 },
  { label: "Quarterly", n: 4 },
  { label: "Monthly", n: 12 },
];

export function CompoundInterestTool() {
  const [p, setP] = useState("100000");
  const [rate, setRate] = useState("7");
  const [years, setYears] = useState("5");
  const [freq, setFreq] = useState(1);
  const res = useMemo(() => {
    const pp = requireFiniteNumber(p, "principal");
    const rr = requireFiniteNumber(rate, "rate");
    const yy = requireFiniteNumber(years, "years");
    if (!pp.ok) return { error: pp.error };
    if (!rr.ok) return { error: rr.error };
    if (!yy.ok) return { error: yy.error };
    const principal = pp.value as number;
    const r = rr.value as number;
    const t = yy.value as number;
    if (principal < 0) return { error: "Principal cannot be negative." };
    if (r < 0) return { error: "Rate cannot be negative." };
    if (t <= 0 || t > 100) return { error: "Years must be between 0 and 100." };
    const amount = principal * Math.pow(1 + r / 100 / freq, freq * t);
    return { amount, interest: amount - principal };
  }, [p, rate, years, freq]);
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumField id="ci-p" label="Principal (₹)" value={p} onChange={setP} />
        <NumField id="ci-r" label="Rate % p.a." value={rate} onChange={setRate} />
        <NumField id="ci-y" label="Years" value={years} onChange={setYears} />
        <div>
          <FieldLabel htmlFor="ci-f">Compounding</FieldLabel>
          <select id="ci-f" value={freq} onChange={(e) => setFreq(Number(e.target.value))}
            className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px]">
            {COMPOUND_FREQS.map((f) => (
              <option key={f.n} value={f.n}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>
      <ErrorNote error={res.error} />
      {!res.error && "amount" in res && (
        <div aria-live="polite" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Stat value={inr(res.amount as number)} label="Maturity amount" />
          <Stat value={inr(res.interest as number)} label="Interest earned" />
        </div>
      )}
      <FinanceNote />
    </div>
  );
}

export function SimpleInterestTool() {
  const [p, setP] = useState("100000");
  const [rate, setRate] = useState("7");
  const [years, setYears] = useState("5");
  const res = useMemo(() => {
    const pp = requireFiniteNumber(p, "principal");
    const rr = requireFiniteNumber(rate, "rate");
    const yy = requireFiniteNumber(years, "years");
    if (!pp.ok) return { error: pp.error };
    if (!rr.ok) return { error: rr.error };
    if (!yy.ok) return { error: yy.error };
    const principal = pp.value as number;
    const r = rr.value as number;
    const t = yy.value as number;
    if (principal < 0) return { error: "Principal cannot be negative." };
    if (r < 0) return { error: "Rate cannot be negative." };
    if (t < 0 || t > 100) return { error: "Years must be between 0 and 100." };
    const interest = (principal * r * t) / 100;
    return { interest, total: principal + interest };
  }, [p, rate, years]);
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <NumField id="si-p" label="Principal (₹)" value={p} onChange={setP} />
        <NumField id="si-r" label="Rate % p.a." value={rate} onChange={setRate} />
        <NumField id="si-y" label="Years" value={years} onChange={setYears} />
      </div>
      <ErrorNote error={res.error} />
      {!res.error && "interest" in res && (
        <div aria-live="polite" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Stat value={inr(res.interest as number)} label="Simple interest" />
          <Stat value={inr(res.total as number)} label="Total amount" />
        </div>
      )}
      <FinanceNote />
    </div>
  );
}

/* ---------- Time duration ---------- */

export function TimeDurationTool() {
  const [from, setFrom] = useState("2026-01-01T09:00");
  const [to, setTo] = useState("2026-01-02T17:30");
  const res = useMemo(() => {
    const a = new Date(from);
    const b = new Date(to);
    if (Number.isNaN(+a) || Number.isNaN(+b)) return { error: "Enter two valid date-times." };
    let ms = +b - +a;
    const negative = ms < 0;
    ms = Math.abs(ms);
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return { negative, days, hours, minutes, seconds, totalHours: totalSec / 3600, totalMinutes: totalSec / 60, totalSeconds: totalSec };
  }, [from, to]);
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="td-from">From</FieldLabel>
          <Input id="td-from" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="td-to">To</FieldLabel>
          <Input id="td-to" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <ErrorNote error={res.error} />
      {!res.error && "days" in res && (
        <div aria-live="polite" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={String(res.days)} label="Days" />
          <Stat value={String(res.hours)} label="Hours" />
          <Stat value={String(res.minutes)} label="Minutes" />
          <Stat value={String(res.seconds)} label="Seconds" />
        </div>
      )}
      {!res.error && "totalHours" in res && (
        <p className="mt-2 text-sm text-(--muted)" aria-live="polite">
          Total: {(res.totalHours as number).toLocaleString("en-IN", { maximumFractionDigits: 2 })} hours
          {(res.negative as boolean) && " (end is before start)"}
        </p>
      )}
    </div>
  );
}
