"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/Button";
import { Stat } from "../../ui/Card";
import { FieldLabel, Input } from "../../ui/Input";
import { Calc, Err, Field, TextOp, Timer, asTool, req, useCopied } from "../kits/kits";
import { downloadTextFile } from "@/lib/engine/formatters";

export const datetimeRegistry: Record<string, React.ComponentType> = {
  "date-add-subtract": asTool(<DateAddSubtractTool />),
  "business-days-calculator": asTool(<BusinessDaysTool />),
  "week-number-calculator": asTool(<WeekNumberTool />),
  "day-of-week-calculator": asTool(<DayOfWeekTool />),
  "days-until-date": asTool(<DaysUntilTool />),
  "time-zone-converter": asTool(<TimeZoneConverterTool />),
  "world-clock": asTool(<WorldClockTool />),
  "pomodoro-timer": asTool(<PomodoroTool />),
  "unix-timestamp-generator": asTool(<UnixGeneratorTool />),
  "unix-timestamp-reader": asTool(<UnixReaderTool />),
  "leap-year-checker": asTool(<LeapYearTool />),
  "calendar-generator": asTool(<CalendarGeneratorTool />),
  "monthly-calendar": asTool(<MonthlyCalendarTool />),
  "year-calendar": asTool(<YearCalendarTool />),
  "date-format-converter": asTool(<DateFormatTool />),
  "iso-date-converter": asTool(<IsoDateTool />),
  "relative-date-calculator": asTool(<RelativeDateTool />),
  "birthday-countdown": asTool(<BirthdayCountdownTool />),
};

/* ---------- date helpers (calendar-correct, timezone-safe) ---------- */

const DAY = 86400000;

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
  return d;
}

function todayYmd(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

function fmtLong(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

const DATE_F: Field = { key: "date", label: "Date", type: "date", required: true };

function withDefaultDate(fields: Field[]): Field[] {
  return fields.map((f) => (f.key === "date" && !f.def ? { ...f, def: todayYmd() } : f));
}

/* ---------- 1. add / subtract ---------- */

function DateAddSubtractTool() {
  return (
    <Calc
      button="Compute date"
      fields={withDefaultDate([
        DATE_F,
        {
          key: "op", label: "Operation", type: "select",
          options: [
            { value: "add", label: "Add (+)" },
            { value: "sub", label: "Subtract (−)" },
          ],
        },
        { key: "n", label: "Amount", type: "number", def: "7", required: true },
        {
          key: "unit", label: "Unit", type: "select",
          options: [
            { value: "days", label: "Days" },
            { value: "weeks", label: "Weeks" },
            { value: "months", label: "Months" },
            { value: "years", label: "Years" },
          ],
        },
      ])}
      compute={(v) => {
        const d = parseYmd(v.date ?? "");
        if (!d) return { error: "Enter a valid date." };
        const n = req(v, "n", "Amount");
        if (typeof n !== "number") return n;
        if (!Number.isInteger(n) || Math.abs(n) > 100000) return { error: "Amount must be a whole number under 100,000." };
        const k = (v.op === "sub" ? -1 : 1) * n;
        const out = new Date(d);
        if (v.unit === "days") out.setDate(out.getDate() + k);
        else if (v.unit === "weeks") out.setDate(out.getDate() + k * 7);
        else if (v.unit === "months") out.setMonth(out.getMonth() + k);
        else out.setFullYear(out.getFullYear() + k);
        return {
          rows: [
            ["Result", fmtLong(out)],
            ["ISO", `${out.getFullYear()}-${String(out.getMonth() + 1).padStart(2, "0")}-${String(out.getDate()).padStart(2, "0")}`],
            ["Weekday", out.toLocaleDateString(undefined, { weekday: "long" })],
          ],
        };
      }}
    />
  );
}

/* ---------- 2. business days ---------- */

function BusinessDaysTool() {
  return (
    <Calc
      button="Count business days"
      fields={withDefaultDate([
        { ...DATE_F, key: "from", label: "Start date" },
        { ...DATE_F, key: "to", label: "End date" },
        { key: "hol", label: "Holidays to exclude (one YYYY-MM-DD per line, optional)", type: "textarea" },
      ])}
      compute={(v) => {
        const a = parseYmd(v.from ?? "");
        const b = parseYmd(v.to ?? "");
        if (!a || !b) return { error: "Enter two valid dates." };
        const [s, e] = a <= b ? [a, b] : [b, a];
        const hols = new Set(
          (v.hol ?? "").split("\n").map((x) => x.trim()).filter((x) => parseYmd(x)).map((x) => x),
        );
        let biz = 0;
        let total = 0;
        const cur = new Date(s);
        while (cur <= e) {
          total++;
          const wd = cur.getDay();
          const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
          if (wd !== 0 && wd !== 6 && !hols.has(key)) biz++;
          cur.setDate(cur.getDate() + 1);
          if (total > 366 * 30) return { error: "Range is too large (max ~30 years)." };
        }
        return {
          rows: [
            ["Business days", String(biz)],
            ["Calendar days", String(total)],
            ["Excluded (weekends + holidays)", String(total - biz)],
          ],
          note: "Monday–Friday minus listed holidays, inclusive of both dates.",
        };
      }}
    />
  );
}

/* ---------- 3. ISO week ---------- */

function isoWeek(d: Date): { week: number; year: number } {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  const first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const fday = (first.getUTCDay() + 6) % 7;
  first.setUTCDate(first.getUTCDate() - fday + 3);
  const week = 1 + Math.round((t.getTime() - first.getTime()) / (7 * DAY));
  return { week, year: t.getUTCFullYear() };
}

function WeekNumberTool() {
  return (
    <Calc
      button="Get week number"
      fields={withDefaultDate([DATE_F])}
      compute={(v) => {
        const d = parseYmd(v.date ?? "");
        if (!d) return { error: "Enter a valid date." };
        const { week, year } = isoWeek(d);
        return { rows: [["ISO week", `W${String(week).padStart(2, "0")}`], ["Week-year", String(year)], ["Date", fmtLong(d)]] };
      }}
    />
  );
}

/* ---------- 4. day of week ---------- */

function DayOfWeekTool() {
  return (
    <Calc
      button="Find weekday"
      fields={withDefaultDate([DATE_F])}
      compute={(v) => {
        const d = parseYmd(v.date ?? "");
        if (!d) return { error: "Enter a valid date." };
        const wd = d.toLocaleDateString(undefined, { weekday: "long" });
        const { week } = isoWeek(d);
        const leap = (d.getFullYear() % 4 === 0 && d.getFullYear() % 100 !== 0) || d.getFullYear() % 400 === 0;
        return {
          rows: [
            ["Weekday", wd],
            ["Full date", fmtLong(d)],
            ["ISO week", `W${week}`],
            ["Leap year", leap ? "Yes" : "No"],
          ],
        };
      }}
    />
  );
}

/* ---------- 5. days until ---------- */

function DaysUntilTool() {
  return (
    <Calc
      button="Count down"
      fields={withDefaultDate([
        { ...DATE_F, key: "target", label: "Target date" },
        { ...DATE_F, key: "start", label: "Count from (default today)" },
      ])}
      compute={(v) => {
        const t = parseYmd(v.target ?? "");
        if (!t) return { error: "Enter a valid target date." };
        const s = parseYmd(v.start ?? "") ?? new Date(new Date().setHours(0, 0, 0, 0));
        const diff = Math.round((t.getTime() - s.getTime()) / DAY);
        if (diff < 0) return { rows: [["Status", `${Math.abs(diff)} days ago`], ["Date", fmtLong(t)]] };
        return {
          rows: [
            ["Days left", String(diff)],
            ["Weeks left", (diff / 7).toFixed(1)],
            ["Months left (avg)", (diff / 30.44).toFixed(1)],
            ["Falls on", t.toLocaleDateString(undefined, { weekday: "long" })],
          ],
        };
      }}
    />
  );
}

/* ---------- 6. time zone converter ---------- */

const ZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Toronto", "America/Sao_Paulo", "Europe/London", "Europe/Berlin", "Europe/Paris",
  "Europe/Moscow", "Africa/Cairo", "Asia/Dubai", "Asia/Karachi", "Asia/Dhaka",
  "Asia/Bangkok", "Asia/Singapore", "Asia/Tokyo", "Asia/Seoul", "Australia/Sydney",
  "Pacific/Auckland", "Asia/Kolkata",
];

function zonedString(d: Date, tz: string): string {
  return d.toLocaleString(undefined, { timeZone: tz, dateStyle: "medium", timeStyle: "short" });
}

function TimeZoneConverterTool() {
  const [date, setDate] = useState(todayYmd());
  const [time, setTime] = useState("12:00");
  const [from, setFrom] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC");
  const [to, setTo] = useState("UTC");
  const [error, setError] = useState("");
  const [copied, copy] = useCopied();

  const zones = useMemo(() => {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const all = local && !ZONES.includes(local) ? [local, ...ZONES] : ZONES;
    return [...new Set(all)];
  }, []);

  const result = useMemo(() => {
    const d = parseYmd(date);
    const m = /^(\d{2}):(\d{2})$/.exec(time);
    if (!d || !m) return null;
    try {
      // Interpret wall time in `from` zone: format a guess in that zone and correct the offset.
      const guess = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Number(m[1]), Number(m[2]));
      const inFrom = new Date(guess.toLocaleString("en-US", { timeZone: from }));
      const inLocal = new Date(guess.toLocaleString("en-US"));
      const utc = new Date(guess.getTime() + (inLocal.getTime() - inFrom.getTime()));
      return { utc, label: `${zonedString(utc, to)} (${to})` };
    } catch {
      return null;
    }
  }, [date, time, from, to]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="tz-date">Date</FieldLabel>
          <Input id="tz-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="tz-time">Time</FieldLabel>
          <Input id="tz-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="tz-from">From zone</FieldLabel>
          <select id="tz-from" value={from} onChange={(e) => setFrom(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px]">
            {zones.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="tz-to">To zone</FieldLabel>
          <select id="tz-to" value={to} onChange={(e) => setTo(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px]">
            {zones.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4">
        <Button
          type="button"
          onClick={() => {
            if (!result) {
              setError("Enter a valid date and time.");
              return;
            }
            setError("");
            void copy(result.label);
          }}
        >
          {copied ? "Copied!" : "Copy result"}
        </Button>
      </div>
      <Err message={error} />
      {result ? (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
          <p className="text-sm text-(--muted)">{date} {time} in {from}</p>
          <p className="mt-1 text-2xl font-extrabold text-(--foreground)">{result.label}</p>
        </div>
      ) : (
        <Err message="" />
      )}
    </div>
  );
}

/* ---------- 7. world clock ---------- */

const WORLD_CITIES = [
  { city: "New York", tz: "America/New_York" },
  { city: "London", tz: "Europe/London" },
  { city: "Berlin", tz: "Europe/Berlin" },
  { city: "Dubai", tz: "Asia/Dubai" },
  { city: "Mumbai", tz: "Asia/Kolkata" },
  { city: "Singapore", tz: "Asia/Singapore" },
  { city: "Tokyo", tz: "Asia/Tokyo" },
  { city: "Sydney", tz: "Australia/Sydney" },
  { city: "Los Angeles", tz: "America/Los_Angeles" },
];

function WorldClockTool() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div aria-live="off">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {WORLD_CITIES.map(({ city, tz }) => (
          <div key={tz} className="rounded-xl bg-(--surface-2) px-4 py-3 text-center">
            <p className="text-sm font-bold text-(--foreground)">{city}</p>
            <p className="text-2xl font-extrabold tabular-nums text-(--foreground)">
              {now.toLocaleTimeString(undefined, { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
            <p className="text-xs text-(--muted)">
              {now.toLocaleDateString(undefined, { timeZone: tz, weekday: "short", month: "short", day: "numeric" })}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-(--muted)">Live times from your device clock with real IANA time-zone data.</p>
    </div>
  );
}

/* ---------- 8. pomodoro ---------- */

function PomodoroTool() {
  const [sessions, setSessions] = useState(0);
  return (
    <div>
      <div className="mb-3 flex items-center gap-3" role="status">
        <Stat label="Sessions done" value={String(sessions)} />
        <p className="text-sm text-(--muted)">Take a long break after every 4 sessions.</p>
      </div>
      <Timer mode="countdown" presets={[1500, 300, 900]} />
      <div className="mt-3 flex gap-2">
        <Button type="button" variant="secondary" onClick={() => setSessions((s) => s + 1)}>
          Log finished session
        </Button>
        <Button type="button" variant="ghost" onClick={() => setSessions(0)}>
          Reset sessions
        </Button>
      </div>
    </div>
  );
}

/* ---------- 9-10. unix ---------- */

function UnixGeneratorTool() {
  const [now, setNow] = useState(() => Date.now());
  const [copied, copy] = useCopied();
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Now (seconds)" value={String(Math.floor(now / 1000))} />
        <Stat label="Now (milliseconds)" value={String(now)} />
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="secondary" onClick={() => copy(String(Math.floor(now / 1000)))}>
          {copied ? "Copied!" : "Copy seconds"}
        </Button>
      </div>
      <div className="mt-6">
        <Calc
          button="Date → timestamp"
          fields={withDefaultDate([DATE_F, { key: "time", label: "Time", type: "time", def: "12:00" }])}
          compute={(v) => {
            const d = parseYmd(v.date ?? "");
            const m = /^(\d{2}):(\d{2})$/.exec(v.time ?? "");
            if (!d || !m) return { error: "Enter a valid date and time." };
            const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Number(m[1]), Number(m[2]));
            return {
              rows: [
                ["Seconds", String(Math.floor(dt.getTime() / 1000))],
                ["Milliseconds", String(dt.getTime())],
                ["UTC", dt.toISOString()],
              ],
            };
          }}
        />
      </div>
    </div>
  );
}

function UnixReaderTool() {
  return (
    <Calc
      button="Convert"
      fields={[{ key: "ts", label: "Unix timestamp (seconds or ms)", type: "text", placeholder: "e.g. 1700000000", required: true }]}
      compute={(v) => {
        const raw = (v.ts ?? "").trim().replace(/,/g, "");
        if (!/^\d{9,13}$/.test(raw)) return { error: "Enter 9–13 digits (seconds or milliseconds)." };
        const ms = raw.length <= 10 ? Number(raw) * 1000 : Number(raw);
        const d = new Date(ms);
        if (!Number.isFinite(d.getTime())) return { error: "That timestamp is out of range." };
        return {
          rows: [
            ["Local", d.toLocaleString(undefined, { dateStyle: "full", timeStyle: "long" })],
            ["UTC", d.toISOString().replace("T", " ").slice(0, 19) + " UTC"],
            ["Seconds", String(Math.floor(ms / 1000))],
            ["Milliseconds", String(ms)],
          ],
        };
      }}
    />
  );
}

/* ---------- 11. leap year ---------- */

function LeapYearTool() {
  return (
    <Calc
      button="Check year"
      fields={[{ key: "y", label: "Year", type: "number", def: String(new Date().getFullYear()), required: true }]}
      compute={(v) => {
        const y = req(v, "y", "Year");
        if (typeof y !== "number") return y;
        if (!Number.isInteger(y) || y < 1 || y > 9999) return { error: "Enter a whole year 1–9999." };
        const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
        return {
          rows: [
            [String(y), leap ? "Leap year (366 days)" : "Common year (365 days)"],
            ["February", leap ? "29 days" : "28 days"],
          ],
          note: "Gregorian rule: divisible by 4, except centuries unless divisible by 400.",
        };
      }}
    />
  );
}

/* ---------- 12-14. calendars ---------- */

function monthGrid(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // Monday-first
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startDay).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const WD = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function MonthTable({ year, month, highlight }: { year: number; month: number; highlight?: number }) {
  return (
    <table className="w-full text-center text-sm">
      <caption className="py-2 font-bold text-(--foreground)">{MONTHS[month]} {year}</caption>
      <thead>
        <tr>
          {WD.map((d) => (
            <th key={d} scope="col" className="py-1 text-xs font-bold text-(--muted)">{d}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {monthGrid(year, month).map((w, i) => (
          <tr key={i}>
            {w.map((d, j) => (
              <td
                key={j}
                className={
                  d === highlight
                    ? "rounded-full bg-brand-600 font-bold text-white"
                    : d === null
                      ? ""
                      : "py-0.5 text-(--foreground) tabular-nums"
                }
              >
                {d ?? ""}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CalendarGeneratorTool() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth()));
  const [year, setYear] = useState(String(now.getFullYear()));
  const m = Math.min(11, Math.max(0, Number(month) || 0));
  const y = Math.min(9999, Math.max(1, Number(year) || now.getFullYear()));
  const [copied, copy] = useCopied();
  const text = useMemo(() => {
    const lines = [`${MONTHS[m]} ${y}`, WD.join(" ")];
    for (const w of monthGrid(y, m)) lines.push(w.map((d) => (d === null ? "  " : String(d).padStart(2, " "))).join(" "));
    return lines.join("\n");
  }, [m, y]);
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="cal-m">Month</FieldLabel>
          <select id="cal-m" value={month} onChange={(e) => setMonth(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px]">
            {MONTHS.map((label, i) => (
              <option key={label} value={i}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="cal-y">Year</FieldLabel>
          <Input id="cal-y" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
      </div>
      <div className="mx-auto mt-4 max-w-sm">
        <MonthTable year={y} month={m} />
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="secondary" onClick={() => copy(text)}>{copied ? "Copied!" : "Copy as text"}</Button>
        <Button type="button" variant="secondary" onClick={() => downloadTextFile(`calendar-${y}-${m + 1}.txt`, text, "text/plain")}>
          Download
        </Button>
      </div>
    </div>
  );
}

function MonthlyCalendarTool() {
  const now = new Date();
  const [off, setOff] = useState(0);
  const base = new Date(now.getFullYear(), now.getMonth() + off, 1);
  const isCurrent = off === 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Button type="button" variant="secondary" onClick={() => setOff((o) => o - 1)}>← Prev</Button>
        <Button type="button" variant="ghost" onClick={() => setOff(0)}>Today</Button>
        <Button type="button" variant="secondary" onClick={() => setOff((o) => o + 1)}>Next →</Button>
      </div>
      <div className="mx-auto max-w-sm">
        <MonthTable year={base.getFullYear()} month={base.getMonth()} highlight={isCurrent ? now.getDate() : undefined} />
      </div>
    </div>
  );
}

function YearCalendarTool() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const y = Math.min(9999, Math.max(1, Number(year) || new Date().getFullYear()));
  return (
    <div>
      <div className="max-w-[200px]">
        <FieldLabel htmlFor="ycal-y">Year</FieldLabel>
        <Input id="ycal-y" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MONTHS.map((label, m) => (
          <div key={label} className="rounded-xl border border-(--border) p-2">
            <MonthTable year={y} month={m} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 15-16. formats ---------- */

function DateFormatTool() {
  return (
    <Calc
      button="Show formats"
      fields={withDefaultDate([DATE_F])}
      compute={(v) => {
        const d = parseYmd(v.date ?? "");
        if (!d) return { error: "Enter a valid date." };
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const [yy, mm, dd] = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")];
        return {
          rows: [
            ["ISO (YYYY-MM-DD)", iso],
            ["US (MM/DD/YYYY)", `${mm}/${dd}/${yy}`],
            ["EU (DD.MM.YYYY)", `${dd}.${mm}.${yy}`],
            ["Long", fmtLong(d)],
            ["Short", d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })],
            ["Unix (midnight)", String(Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000))],
          ],
        };
      }}
    />
  );
}

function IsoDateTool() {
  return (
    <TextOp
      placeholder="Paste an ISO string (2024-05-01T12:30:00Z) or a date (2024-05-01 12:30)…"
      button="Convert"
      fileName="iso-date.txt"
      process={(text) => {
        const t = text.trim();
        if (/^\d{4}-\d{2}-\d{2}T/.test(t)) {
          const d = new Date(t);
          if (Number.isNaN(d.getTime())) return { error: "That ISO string could not be parsed." };
          return {
            output: `Local: ${d.toLocaleString(undefined, { dateStyle: "full", timeStyle: "long" })}\nUTC: ${d.toISOString()}\nUnix: ${Math.floor(d.getTime() / 1000)}`,
          };
        }
        const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(t);
        if (!m) return { error: "Enter YYYY-MM-DD [HH:MM] or a full ISO-8601 string." };
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0));
        if (Number.isNaN(d.getTime())) return { error: "That date is not valid." };
        return { output: `ISO-8601: ${d.toISOString()}\nUnix: ${Math.floor(d.getTime() / 1000)}` };
      }}
    />
  );
}

/* ---------- 17-18. relative + birthday ---------- */

function relativeParts(fromMs: number, toMs: number): string {
  const diff = Math.round((toMs - fromMs) / DAY);
  const abs = Math.abs(diff);
  const dir = diff < 0 ? "ago" : "from now";
  if (abs === 0) return "today";
  if (abs === 1) return diff < 0 ? "yesterday" : "tomorrow";
  if (abs < 7) return `${abs} days ${dir}`;
  if (abs < 30) {
    const w = Math.round(abs / 7);
    return `${w} week${w === 1 ? "" : "s"} ${dir}`;
  }
  if (abs < 365) {
    const mo = Math.round(abs / 30.44);
    return `${mo} month${mo === 1 ? "" : "s"} ${dir}`;
  }
  const y = Math.floor(abs / 365.25);
  const rem = Math.round(abs - y * 365.25);
  return `${y} year${y === 1 ? "" : "s"}${rem > 30 ? ` and ${Math.round(rem / 30.44)} months` : ""} ${dir}`;
}

function RelativeDateTool() {
  return (
    <Calc
      button="Humanize"
      fields={withDefaultDate([DATE_F, { ...DATE_F, key: "from", label: "Relative to (default today)" }])}
      compute={(v) => {
        const d = parseYmd(v.date ?? "");
        if (!d) return { error: "Enter a valid date." };
        const f = parseYmd(v.from ?? "") ?? new Date(new Date().setHours(0, 0, 0, 0));
        const diff = Math.round((d.getTime() - f.getTime()) / DAY);
        return {
          rows: [
            ["Relative", relativeParts(f.getTime(), d.getTime())],
            ["Exact days", diff === 0 ? "same day" : `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} ${diff < 0 ? "before" : "after"}`],
            ["Date", fmtLong(d)],
          ],
        };
      }}
    />
  );
}

function BirthdayCountdownTool() {
  return (
    <Calc
      button="Count down"
      fields={[{ key: "dob", label: "Birth date", type: "date", required: true }]}
      compute={(v) => {
        const dob = parseYmd(v.dob ?? "");
        if (!dob) return { error: "Enter a valid birth date." };
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (dob > today) return { error: "Birth date cannot be in the future." };
        const isFeb29 = dob.getMonth() === 1 && dob.getDate() === 29;
        let year = today.getFullYear();
        const occurs = (y: number) => (isFeb29 ? new Date(y, 1, isLeap(y) ? 29 : 28) : new Date(y, dob.getMonth(), dob.getDate()));
        let next = occurs(year);
        if (next < today) next = occurs(++year);
        const days = Math.round((next.getTime() - today.getTime()) / DAY);
        const turning = next.getFullYear() - dob.getFullYear();
        return {
          rows: [
            ["Days left", days === 0 ? "Today! 🎉" : String(days)],
            ["Next birthday", fmtLong(next)],
            ["Turning", String(turning)],
            ["Falls on", next.toLocaleDateString(undefined, { weekday: "long" })],
          ],
        };
      }}
    />
  );
}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
