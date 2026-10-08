"use client";

import { useMemo, useState } from "react";
import { Stat } from "../../ui/Card";
import { FieldLabel, Input } from "../../ui/Input";
import { formatResult } from "@/lib/engine/formatters";
import { requireFiniteNumber } from "@/lib/engine/validation";

interface Unit { value: string; label: string; toBase: number; offset?: number }

const LENGTH: Unit[] = [
  { value: "mm", label: "Millimetres (mm)", toBase: 0.001 },
  { value: "cm", label: "Centimetres (cm)", toBase: 0.01 },
  { value: "m", label: "Metres (m)", toBase: 1 },
  { value: "km", label: "Kilometres (km)", toBase: 1000 },
  { value: "in", label: "Inches (in)", toBase: 0.0254 },
  { value: "ft", label: "Feet (ft)", toBase: 0.3048 },
  { value: "yd", label: "Yards (yd)", toBase: 0.9144 },
  { value: "mi", label: "Miles (mi)", toBase: 1609.344 },
];

const WEIGHT: Unit[] = [
  { value: "mg", label: "Milligrams (mg)", toBase: 0.000001 },
  { value: "g", label: "Grams (g)", toBase: 0.001 },
  { value: "kg", label: "Kilograms (kg)", toBase: 1 },
  { value: "t", label: "Tonnes (t)", toBase: 1000 },
  { value: "oz", label: "Ounces (oz)", toBase: 0.0283495 },
  { value: "lb", label: "Pounds (lb)", toBase: 0.453592 },
  { value: "st", label: "Stone (st)", toBase: 6.35029 },
];

const AREA: Unit[] = [
  { value: "sqm", label: "Sq metres (m²)", toBase: 1 },
  { value: "sqkm", label: "Sq kilometres (km²)", toBase: 1_000_000 },
  { value: "sqft", label: "Sq feet (ft²)", toBase: 0.092903 },
  { value: "sqyd", label: "Sq yards (yd²)", toBase: 0.836127 },
  { value: "acre", label: "Acres", toBase: 4046.86 },
  { value: "ha", label: "Hectares (ha)", toBase: 10_000 },
];

const VOLUME: Unit[] = [
  { value: "ml", label: "Millilitres (ml)", toBase: 0.001 },
  { value: "l", label: "Litres (L)", toBase: 1 },
  { value: "m3", label: "Cubic metres (m³)", toBase: 1000 },
  { value: "cup", label: "Cups (US)", toBase: 0.236588 },
  { value: "pt", label: "Pints (US)", toBase: 0.473176 },
  { value: "qt", label: "Quarts (US)", toBase: 0.946353 },
  { value: "galus", label: "Gallons (US)", toBase: 3.78541 },
  { value: "galuk", label: "Gallons (UK)", toBase: 4.54609 },
];

const SPEED: Unit[] = [
  { value: "ms", label: "m/s", toBase: 1 },
  { value: "kmh", label: "km/h", toBase: 1 / 3.6 },
  { value: "mph", label: "mph", toBase: 0.44704 },
  { value: "fts", label: "ft/s", toBase: 0.3048 },
  { value: "kn", label: "Knots (kn)", toBase: 0.514444 },
];

const TIME: Unit[] = [
  { value: "ms", label: "Milliseconds", toBase: 0.001 },
  { value: "s", label: "Seconds", toBase: 1 },
  { value: "min", label: "Minutes", toBase: 60 },
  { value: "h", label: "Hours", toBase: 3600 },
  { value: "d", label: "Days", toBase: 86_400 },
  { value: "wk", label: "Weeks", toBase: 604_800 },
];

const DATA: Unit[] = [
  { value: "b", label: "Bits", toBase: 1 },
  { value: "B", label: "Bytes", toBase: 8 },
  { value: "KB", label: "Kilobytes (1000)", toBase: 8000 },
  { value: "MB", label: "Megabytes (1000)", toBase: 8_000_000 },
  { value: "GB", label: "Gigabytes (1000)", toBase: 8_000_000_000 },
  { value: "TB", label: "Terabytes (1000)", toBase: 8_000_000_000_000 },
  { value: "KiB", label: "Kibibytes (1024)", toBase: 8192 },
  { value: "MiB", label: "Mebibytes (1024)", toBase: 8388608 },
  { value: "GiB", label: "Gibibytes (1024)", toBase: 8589934592 },
];

function GenericConverter({ id, units, defaultFrom, defaultTo, hint }: {
  id: string; units: Unit[]; defaultFrom: string; defaultTo: string; hint?: string;
}) {
  const [value, setValue] = useState("1");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const res = useMemo(() => {
    const p = requireFiniteNumber(value, "value");
    if (!p.ok) return { error: p.error };
    const f = units.find((u) => u.value === from);
    const t = units.find((u) => u.value === to);
    if (!f || !t) return { error: "Choose units." };
    const base = (p.value as number) * f.toBase;
    return { out: base / t.toBase };
  }, [value, from, to, units]);
  const swap = () => { setFrom(to); setTo(from); };
  const selectCls = "min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px]";
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div>
          <FieldLabel htmlFor={`${id}-val`}>Value</FieldLabel>
          <Input id={`${id}-val`} type="number" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <button type="button" onClick={swap} aria-label="Swap units"
          className="grid h-11 w-11 place-items-center self-end rounded-xl border border-(--border) text-lg">⇄</button>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:col-span-2 lg:col-span-1 lg:grid-cols-2">
          <div>
            <FieldLabel htmlFor={`${id}-from`}>From</FieldLabel>
            <select id={`${id}-from`} value={from} onChange={(e) => setFrom(e.target.value)} className={selectCls}>
              {units.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor={`${id}-to`}>To</FieldLabel>
            <select id={`${id}-to`} value={to} onChange={(e) => setTo(e.target.value)} className={selectCls}>
              {units.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        </div>
      </div>
      {res.error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-danger-600">{res.error}</p>
      ) : (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) p-5 text-center">
          <p className="text-3xl font-extrabold tabular-nums">{formatResult(res.out as number)}</p>
          <p className="mt-1 text-sm text-(--muted)">{value} {units.find((u) => u.value === from)?.label} = {formatResult(res.out as number)} {units.find((u) => u.value === to)?.label}</p>
          {hint && <p className="mt-1 text-xs text-(--muted)">{hint}</p>}
        </div>
      )}
    </div>
  );
}

export function UnitConverterTool() {
  const [family, setFamily] = useState("length");
  const families: Record<string, { units: Unit[]; from: string; to: string; hint?: string }> = {
    length: { units: LENGTH, from: "m", to: "ft" },
    weight: { units: WEIGHT, from: "kg", to: "lb" },
    temperature: { units: [], from: "", to: "" },
    volume: { units: VOLUME, from: "l", to: "galus" },
    speed: { units: SPEED, from: "kmh", to: "mph" },
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Unit family">
        {["length", "weight", "temperature", "volume", "speed"].map((f) => (
          <button key={f} type="button" onClick={() => setFamily(f)} aria-pressed={family === f}
            className={`min-h-[40px] rounded-full border px-4 text-sm font-semibold capitalize ${family === f ? "border-brand-600 bg-brand-600 text-white" : "border-(--border) text-(--muted) hover:text-(--foreground)"}`}>{f}</button>
        ))}
      </div>
      <div className="mt-4">
        {family === "temperature" ? <TemperatureConverterTool /> : (
          <GenericConverter key={family} id={`unit-${family}`} units={families[family].units} defaultFrom={families[family].from} defaultTo={families[family].to} />
        )}
      </div>
    </div>
  );
}

export function LengthConverterTool() { return <GenericConverter id="length" units={LENGTH} defaultFrom="m" defaultTo="ft" />; }
export function WeightConverterTool() { return <GenericConverter id="weight" units={WEIGHT} defaultFrom="kg" defaultTo="lb" />; }
export function AreaConverterTool() { return <GenericConverter id="area" units={AREA} defaultFrom="sqm" defaultTo="sqft" hint="Property tip: divide sq ft by 10.764 to get sq m." />; }
export function VolumeConverterTool() { return <GenericConverter id="volume" units={VOLUME} defaultFrom="l" defaultTo="galus" />; }
export function SpeedConverterTool() { return <GenericConverter id="speed" units={SPEED} defaultFrom="kmh" defaultTo="mph" hint="10 km/h ≈ 6.2 mph — a solid jogging pace." />; }
export function TimeConverterTool() { return <GenericConverter id="time" units={TIME} defaultFrom="min" defaultTo="h" hint="Payroll uses decimal hours: 90 min = 1.5 h." />; }
export function DataStorageConverterTool() { return <GenericConverter id="data" units={DATA} defaultFrom="MB" defaultTo="MiB" hint="Drives use decimal (1000); RAM/OS use binary (1024)." />; }

export function TemperatureConverterTool() {
  const [value, setValue] = useState("25");
  const [from, setFrom] = useState("C");
  const res = useMemo(() => {
    const p = requireFiniteNumber(value, "temperature");
    if (!p.ok) return { error: p.error };
    const v = p.value as number;
    let c: number;
    if (from === "C") c = v;
    else if (from === "F") c = ((v - 32) * 5) / 9;
    else c = v - 273.15;
    if (c < -273.15) return { error: "Below absolute zero (−273.15 °C) — check your input." };
    return { c, f: (c * 9) / 5 + 32, k: c + 273.15 };
  }, [value, from]);
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="temp-val">Temperature</FieldLabel>
          <Input id="temp-val" type="number" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="temp-from">Scale</FieldLabel>
          <select id="temp-from" value={from} onChange={(e) => setFrom(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px]">
            <option value="C">Celsius (°C)</option>
            <option value="F">Fahrenheit (°F)</option>
            <option value="K">Kelvin (K)</option>
          </select>
        </div>
      </div>
      {res.error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-danger-600">{res.error}</p>
      ) : (
        "c" in res && (
          <div aria-live="polite" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat value={`${formatResult(res.c as number, 2)} °C`} label="Celsius" />
            <Stat value={`${formatResult(res.f as number, 2)} °F`} label="Fahrenheit" />
            <Stat value={`${formatResult(res.k as number, 2)} K`} label="Kelvin" />
          </div>
        )
      )}
    </div>
  );
}

const BASES = [
  { value: "bin", label: "Binary (base 2)", radix: 2, pattern: /^[01\s]+$/ },
  { value: "oct", label: "Octal (base 8)", radix: 8, pattern: /^[0-7\s]+$/ },
  { value: "dec", label: "Decimal (base 10)", radix: 10, pattern: /^[+-]?[0-9\s]+$/ },
  { value: "hex", label: "Hexadecimal (base 16)", radix: 16, pattern: /^[0-9a-fA-F\sxX#]+$/ },
];

export function NumberBaseConverterTool() {
  const [value, setValue] = useState("255");
  const [from, setFrom] = useState("dec");
  const res = useMemo(() => {
    const raw = value.trim().replace(/^0x/i, "").replace(/^#/, "").replace(/\s+/g, "");
    if (!raw) return { error: "Enter a number." };
    const base = BASES.find((b) => b.value === from);
    if (!base) return { error: "Choose a base." };
    const cleaned = from === "hex" ? raw : raw;
    if (!base.pattern.test(from === "hex" ? `0x${cleaned}` : cleaned) && !base.pattern.test(cleaned))
      return { error: `"${value.trim()}" is not valid ${base.label.toLowerCase()}.` };
    const n = parseInt(from === "dec" ? raw : raw, base.radix);
    if (!Number.isFinite(n)) return { error: `"${value.trim()}" is not valid ${base.label.toLowerCase()}.` };
    const ascii = n >= 32 && n <= 126 ? String.fromCharCode(n) : null;
    return { n, bin: n.toString(2), oct: n.toString(8), dec: String(n), hex: n.toString(16).toUpperCase(), ascii };
  }, [value, from]);
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="base-val">Number</FieldLabel>
          <Input id="base-val" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 255 or FF" className="font-mono" />
        </div>
        <div>
          <FieldLabel htmlFor="base-from">Input base</FieldLabel>
          <select id="base-from" value={from} onChange={(e) => setFrom(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px]">
            {BASES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
      </div>
      {res.error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-danger-600">{res.error}</p>
      ) : (
        "n" in res && (
          <div aria-live="polite" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Stat value={String(res.bin)} label="Binary" />
            <Stat value={String(res.oct)} label="Octal" />
            <Stat value={String(res.dec)} label="Decimal" />
            <Stat value={String(res.hex)} label="Hexadecimal" />
            {res.ascii ? <p className="text-sm text-(--muted) sm:col-span-2">ASCII: <span className="font-mono font-bold text-(--foreground)">“{res.ascii as string}”</span></p> : null}
          </div>
        )
      )}
    </div>
  );
}
