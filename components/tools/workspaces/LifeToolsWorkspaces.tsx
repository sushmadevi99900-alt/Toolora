"use client";

import { useState } from "react";
import { Button } from "../../ui/Button";
import { Stat } from "../../ui/Card";
import { FieldLabel, Input, Textarea } from "../../ui/Input";
import { Calc, Checklist, Gen, Timer, Units, Err, Note, num, req, useCopied } from "../kits/kits";
import { randomInt } from "@/lib/engine/crypto";
import { downloadTextFile } from "@/lib/engine/formatters";

export const lifetoolsRegistry: Record<string, React.ComponentType> = {
  "bmr-calculator": BmrTool,
  "calorie-calculator": CalorieTdeeTool,
  "water-intake-calculator": WaterIntakeTool,
  "sleep-calculator": SleepTool,
  "body-fat-calculator": BodyFatTool,
  "pace-calculator": PaceTool,
  "running-pace-calculator": RunningPaceTool,
  "walking-pace-calculator": WalkingPaceTool,
  "fuel-cost-calculator": FuelCostTool,
  "electricity-cost-calculator": ElectricityCostTool,
  "unit-price-calculator": UnitPriceTool,
  "age-difference-calculator": AgeDiffTool,
  "random-decision-maker": RandomDecisionTool,
  "number-picker": NumberPickerTool,
  "name-picker": NamePickerTool,
  "team-generator": TeamGeneratorTool,
  "yes-no-decider": YesNoTool,
  "grocery-budget-calculator": GroceryBudgetTool,
  "work-hours-calculator": WorkHoursTool,
  "sleep-cycle-calculator": SleepCycleTool,
  "recipe-scaler": RecipeScalerTool,
  "ingredient-converter": IngredientConverterTool,
  "cups-to-grams": CupsToGramsTool,
  "grams-to-cups": GramsToCupsTool,
  "cooking-temp-converter": CookingTempTool,
  "cooking-timer": CookingTimerTool,
  "kitchen-unit-converter": KitchenUnitsTool,
  "baking-percentage-calculator": BakersPctTool,
  "recipe-cost-calculator": RecipeCostTool,
  "serving-size-calculator": ServingSizeTool,
  "pizza-dough-calculator": PizzaDoughTool,
  "hydration-calculator": HydrationTool,
  "coffee-ratio-calculator": CoffeeRatioTool,
  "coffee-brew-calculator": CoffeeBrewTool,
  "cocktail-ratio-calculator": CocktailRatioTool,
  "nutrition-label-calculator": NutritionLabelTool,
  "food-calorie-calculator": FoodCalorieTool,
  "macro-calculator": MacroTool,
  "protein-calculator": ProteinTool,
  "meal-portion-calculator": MealPortionTool,
  "distance-calculator-travel": TravelDistanceTool,
  "travel-time-calculator": TravelTimeTool,
  "trip-fuel-cost": TripFuelTool,
  "trip-budget-calculator": TripBudgetTool,
  "currency-converter-travel": TravelCurrencyTool,
  "jet-lag-planner": JetLagTool,
  "packing-list-generator": PackingListTool,
  "travel-checklist-generator": TravelChecklistTool,
  "trip-countdown": TripCountdownTool,
  "road-trip-planner": RoadTripTool,
  "speed-distance-time": SpeedDistTimeTool,
  "gas-mileage-calculator": GasMileageTool,
  "odometer-distance-calculator": OdometerTool,
  "travel-expense-splitter": ExpenseSplitterTool,
  "random-integer-generator": RandomIntTool,
  "random-decimal-generator": RandomDecimalTool,
  "random-choice-picker": RandomChoiceTool,
  "random-name-picker": RandomNameTool,
  "random-date-generator": RandomDateTool,
  "random-time-generator": RandomTimeTool,
  "random-emoji-generator": RandomEmojiTool,
  "random-letter-generator": RandomLetterTool,
  "random-hex-string": RandomHexTool,
  "lottery-number-generator": LotteryTool,
  "random-quote-picker": RandomQuoteTool,
  "random-group-maker": RandomGroupTool,
  "random-card-picker": RandomCardTool,
  "random-country-picker": RandomCountryTool,
};

/* ---------- shared helpers ---------- */

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

function linesOf(s: string): string[] {
  return s.split("\n").map((x) => x.trim()).filter((x) => x.length > 0);
}

function parseHm(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

function fmtHm(totalMin: number): string {
  const t = ((Math.round(totalMin) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function fmtDur(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h <= 0) return `${m} min`;
  return `${h} h ${m} min`;
}

function fmtPace(minPerKm: number): string {
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

function fmtPaceMile(minPerKm: number): string {
  const v = minPerKm * 1.609344;
  const m = Math.floor(v);
  const s = Math.round((v - m) * 60);
  return `${m}:${String(s).padStart(2, "0")} /mi`;
}

function shuffle<T>(arr: T[]): { out: T[]; secure: boolean } {
  const a = [...arr];
  let secure = true;
  for (let i = a.length - 1; i > 0; i--) {
    const r = randomInt(0, i);
    if (!r.secure) secure = false;
    const j = r.value;
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return { out: a, secure };
}

function secureNote(secure: boolean): string {
  return secure
    ? "Drawn with cryptographic randomness (Web Crypto)."
    : "Web Crypto was unavailable, so this draw used a non-crypto fallback.";
}

const MEDICAL = "Informational only — not medical advice.";

function useHistory() {
  const [history, setHistory] = useState<string[]>([]);
  const [secure, setSecure] = useState(true);
  return {
    history,
    secure,
    push(item: string, sec: boolean) {
      setHistory((h) => [item, ...h].slice(0, 50));
      setSecure(sec);
    },
    clear() {
      setHistory([]);
    },
  };
}

function HistoryBlock({ history, secure, onClear, fileName }: { history: string[]; secure: boolean; onClear: () => void; fileName: string }) {
  const [copied, copy] = useCopied();
  if (history.length === 0) return <Note>{secureNote(secure)} No draws yet.</Note>;
  return (
    <div className="mt-4">
      <Note>{secureNote(secure)}</Note>
      <ul className="mt-2 divide-y divide-(--border) rounded-xl border border-(--border)" aria-live="polite">
        {history.map((h, i) => (
          <li key={i} className="px-4 py-2 text-sm font-medium text-(--foreground) tabular-nums">{h}</li>
        ))}
      </ul>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="secondary" onClick={() => copy(history.join("\n"))}>{copied ? "Copied!" : "Copy history"}</Button>
        <Button type="button" variant="secondary" onClick={() => downloadTextFile(fileName, history.join("\n"), "text/plain")}>Download</Button>
        <Button type="button" variant="ghost" onClick={onClear}>Clear</Button>
      </div>
    </div>
  );
}

/* ================= EVERYDAY (20) ================= */

function BmrTool() {
  return (
    <Calc
      fields={[
        { key: "sex", label: "Sex", type: "select", options: [{ value: "male", label: "Male" }, { value: "female", label: "Female" }], def: "male" },
        { key: "age", label: "Age (years)", type: "number", def: "30", required: true, min: 1, max: 120 },
        { key: "h", label: "Height (cm)", type: "number", def: "175", required: true, min: 50, max: 250 },
        { key: "w", label: "Weight (kg)", type: "number", def: "70", required: true, min: 20, max: 400 },
      ]}
      compute={(v) => {
        const age = req(v, "age", "Age (years)");
        if (typeof age !== "number") return age;
        const h = req(v, "h", "Height (cm)");
        if (typeof h !== "number") return h;
        const w = req(v, "w", "Weight (kg)");
        if (typeof w !== "number") return w;
        if (age < 1 || age > 120 || h < 50 || h > 250 || w < 20 || w > 400) return { error: "Check ranges: age 1–120, height 50–250 cm, weight 20–400 kg." };
        const bmr = 10 * w + 6.25 * h - 5 * age + (v.sex === "female" ? -161 : 5);
        return { rows: [["BMR", `${Math.round(bmr)} kcal/day`], ["Method", "Mifflin-St Jeor"]], note: MEDICAL };
      }}
    />
  );
}

const ACTIVITY = [
  { value: "1.2", label: "Sedentary (little exercise)" },
  { value: "1.375", label: "Light (1–3 days/week)" },
  { value: "1.55", label: "Moderate (3–5 days/week)" },
  { value: "1.725", label: "Active (6–7 days/week)" },
  { value: "1.9", label: "Very active (physical job + training)" },
];

function CalorieTdeeTool() {
  return (
    <Calc
      fields={[
        { key: "sex", label: "Sex", type: "select", options: [{ value: "male", label: "Male" }, { value: "female", label: "Female" }], def: "male" },
        { key: "age", label: "Age (years)", type: "number", def: "30", required: true },
        { key: "h", label: "Height (cm)", type: "number", def: "175", required: true },
        { key: "w", label: "Weight (kg)", type: "number", def: "70", required: true },
        { key: "act", label: "Activity level", type: "select", options: ACTIVITY, def: "1.55" },
      ]}
      compute={(v) => {
        const age = req(v, "age", "Age (years)");
        if (typeof age !== "number") return age;
        const h = req(v, "h", "Height (cm)");
        if (typeof h !== "number") return h;
        const w = req(v, "w", "Weight (kg)");
        if (typeof w !== "number") return w;
        if (age < 1 || age > 120 || h < 50 || h > 250 || w < 20 || w > 400) return { error: "Check ranges: age 1–120, height 50–250 cm, weight 20–400 kg." };
        const bmr = 10 * w + 6.25 * h - 5 * age + (v.sex === "female" ? -161 : 5);
        const tdee = bmr * Number(v.act || "1.55");
        return {
          rows: [
            ["TDEE (maintain)", `${Math.round(tdee)} kcal/day`],
            ["BMR", `${Math.round(bmr)} kcal/day`],
            ["Mild cut (−15%)", `${Math.round(tdee * 0.85)} kcal/day`],
            ["Gain (+10%)", `${Math.round(tdee * 1.1)} kcal/day`],
          ],
          note: `Mifflin-St Jeor BMR × activity factor ${v.act}. ${MEDICAL}`,
        };
      }}
    />
  );
}

function WaterIntakeTool() {
  return (
    <Calc
      fields={[
        { key: "w", label: "Weight (kg)", type: "number", def: "70", required: true },
        { key: "ex", label: "Exercise (minutes/day)", type: "number", def: "30" },
        { key: "hot", label: "Hot weather / sweating a lot", type: "checkbox", def: "0" },
      ]}
      compute={(v) => {
        const w = req(v, "w", "Weight (kg)");
        if (typeof w !== "number") return w;
        const ex = num(v, "ex") ?? 0;
        if (w < 20 || w > 400 || ex < 0 || ex > 600) return { error: "Check ranges: weight 20–400 kg, exercise 0–600 min." };
        let litres = w * 0.035 + ex * 0.012;
        if (v.hot === "1") litres += 0.5;
        return {
          rows: [
            ["Daily water", `${litres.toFixed(2)} L`],
            ["Glasses (250 ml)", `${(litres * 4).toFixed(1)}`],
            ["US cups", `${(litres * 4.22675).toFixed(1)}`],
          ],
          note: `Base 35 ml/kg plus 12 ml per exercise minute${v.hot === "1" ? " plus 0.5 L for heat" : ""}. ${MEDICAL}`,
        };
      }}
    />
  );
}

function SleepTool() {
  return (
    <Calc
      button="Find times"
      fields={[
        { key: "mode", label: "I know my…", type: "select", options: [{ value: "wake", label: "Wake-up time → bedtimes" }, { value: "bed", label: "Bedtime → wake times" }], def: "wake" },
        { key: "t", label: "Time (HH:MM)", type: "time", def: "07:00", required: true },
        { key: "fall", label: "Minutes to fall asleep", type: "number", def: "15" },
      ]}
      compute={(v) => {
        const t = parseHm(v.t ?? "");
        if (t === null) return { error: "Enter a valid time." };
        const fall = num(v, "fall") ?? 15;
        if (fall < 0 || fall > 120) return { error: "Fall-asleep time must be 0–120 minutes." };
        const rows: [string, string][] = [];
        if (v.mode === "bed") {
          for (const c of [4, 5, 6]) {
            const wake = t + fall + c * 90;
            rows.push([`${c} cycles (${(c * 1.5).toFixed(1)} h)`, fmtHm(wake)]);
          }
          return { rows, note: "90-minute sleep cycles plus your fall-asleep time." };
        }
        for (const c of [6, 5, 4]) {
          const bed = t - fall - c * 90;
          rows.push([`${c} cycles (${(c * 1.5).toFixed(1)} h)`, `Bed ${fmtHm(bed)}`]);
        }
        return { rows, note: "Count back 90-minute cycles plus fall-asleep time from your alarm." };
      }}
    />
  );
}

function BodyFatTool() {
  return (
    <Calc
      fields={[
        { key: "sex", label: "Sex", type: "select", options: [{ value: "male", label: "Male" }, { value: "female", label: "Female" }], def: "male" },
        { key: "h", label: "Height (cm)", type: "number", def: "175", required: true },
        { key: "neck", label: "Neck (cm)", type: "number", def: "38", required: true },
        { key: "waist", label: "Waist at navel (cm)", type: "number", def: "85", required: true },
        { key: "hip", label: "Hip (cm, women only)", type: "number", def: "95" },
      ]}
      compute={(v) => {
        const h = req(v, "h", "Height (cm)");
        if (typeof h !== "number") return h;
        const neck = req(v, "neck", "Neck (cm)");
        if (typeof neck !== "number") return neck;
        const waist = req(v, "waist", "Waist at navel (cm)");
        if (typeof waist !== "number") return waist;
        const hip = num(v, "hip") ?? 0;
        if (h <= 0 || neck <= 0 || waist <= 0) return { error: "Measurements must be positive." };
        const log10 = (x: number) => Math.log(x) / Math.LN10;
        let bf: number;
        if (v.sex === "female") {
          if (!hip || hip <= 0) return { error: "Hip measurement is required for women." };
          if (waist + hip - neck <= 0) return { error: "Waist + hip must exceed neck." };
          bf = 495 / (1.29579 - 0.35004 * log10(waist + hip - neck) + 0.221 * log10(h)) - 450;
        } else {
          if (waist - neck <= 0) return { error: "Waist must exceed neck." };
          bf = 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(h)) - 450;
        }
        if (!Number.isFinite(bf) || bf < 0 || bf > 70) return { error: "Those measurements give an implausible result — double-check them." };
        return { rows: [["Body fat", `${bf.toFixed(1)}%`], ["Method", "US Navy tape"]], note: MEDICAL };
      }}
    />
  );
}

function PaceTool() {
  return (
    <Calc
      fields={[
        { key: "d", label: "Distance", type: "number", def: "5", required: true },
        { key: "unit", label: "Distance unit", type: "select", options: [{ value: "km", label: "Kilometres" }, { value: "mi", label: "Miles" }], def: "km" },
        { key: "h", label: "Hours", type: "number", def: "0" },
        { key: "m", label: "Minutes", type: "number", def: "25", required: true },
        { key: "s", label: "Seconds", type: "number", def: "0" },
      ]}
      compute={(v) => {
        const d = req(v, "d", "Distance");
        if (typeof d !== "number") return d;
        const m = req(v, "m", "Minutes");
        if (typeof m !== "number") return m;
        const h = num(v, "h") ?? 0;
        const s = num(v, "s") ?? 0;
        if (d <= 0) return { error: "Distance must be positive." };
        const totalMin = h * 60 + m + s / 60;
        if (totalMin <= 0) return { error: "Time must be positive." };
        const km = v.unit === "mi" ? d * 1.609344 : d;
        const minPerKm = totalMin / km;
        return {
          rows: [
            ["Pace", fmtPace(minPerKm)],
            ["Pace (mile)", fmtPaceMile(minPerKm)],
            ["Speed", `${(60 / minPerKm).toFixed(2)} km/h`],
            ["Speed (mph)", `${(60 / minPerKm / 1.609344).toFixed(2)} mph`],
          ],
        };
      }}
    />
  );
}

const RACES: Record<string, number> = { "5K": 5, "10K": 10, "Half marathon": 21.0975, Marathon: 42.195 };

function RunningPaceTool() {
  return (
    <Calc
      button="Plan pace"
      fields={[
        { key: "race", label: "Race", type: "select", options: [...Object.keys(RACES).map((r) => ({ value: r, label: r })), { value: "custom", label: "Custom distance" }], def: "10K" },
        { key: "cd", label: "Custom distance (km, if Custom)", type: "number", def: "12" },
        { key: "h", label: "Goal hours", type: "number", def: "0" },
        { key: "m", label: "Goal minutes", type: "number", def: "50", required: true },
        { key: "s", label: "Goal seconds", type: "number", def: "0" },
      ]}
      compute={(v) => {
        const km = v.race === "custom" ? (num(v, "cd") ?? NaN) : (RACES[v.race ?? ""] ?? NaN);
        if (!Number.isFinite(km) || km <= 0 || km > 500) return { error: "Enter a valid race distance (0–500 km)." };
        const totalMin = (num(v, "h") ?? 0) * 60 + (num(v, "m") ?? 0) + (num(v, "s") ?? 0) / 60;
        if (!(totalMin > 0)) return { error: "Enter a positive goal time." };
        const minPerKm = totalMin / km;
        const splits: string[] = [];
        for (let k = 1; k <= Math.floor(km); k++) splits.push(`km ${k}: ${fmtHm(0).slice(0, 0)}${fmtDur(k * minPerKm).replace(/^0 min$/, "") || fmtPace(minPerKm)}`);
        void splits;
        const full = Math.floor(km);
        const splitText = Array.from({ length: full }, (_, i) => `km ${i + 1} ≈ ${fmtDur((i + 1) * minPerKm)} elapsed`).join("; ");
        return {
          rows: [
            ["Required pace", fmtPace(minPerKm)],
            ["Per mile", fmtPaceMile(minPerKm)],
            ["Avg speed", `${(60 / minPerKm).toFixed(2)} km/h`],
            ["Distance", `${km} km`],
            ["Even splits", full <= 8 ? Array.from({ length: full }, (_, i) => `k${i + 1} ${fmtDur((i + 1) * minPerKm)}`).join(" · ") : `${full} splits — even pace ${fmtPace(minPerKm)}`],
          ],
          note: full > 8 ? `Even splits: ${splitText}` : "Even-effort splits, one per kilometre.",
        };
      }}
    />
  );
}

function WalkingPaceTool() {
  return (
    <Calc
      fields={[
        { key: "d", label: "Distance (km)", type: "number", def: "3", required: true },
        { key: "m", label: "Minutes", type: "number", def: "30", required: true },
        { key: "stride", label: "Stride length (cm)", type: "number", def: "76" },
      ]}
      compute={(v) => {
        const d = req(v, "d", "Distance (km)");
        if (typeof d !== "number") return d;
        const m = req(v, "m", "Minutes");
        if (typeof m !== "number") return m;
        const stride = num(v, "stride") ?? 76;
        if (d <= 0 || m <= 0 || stride <= 20 || stride > 200) return { error: "Check ranges: distance and time positive, stride 20–200 cm." };
        const minPerKm = m / d;
        const steps = Math.round((d * 100000) / stride);
        return {
          rows: [
            ["Pace", fmtPace(minPerKm)],
            ["Per mile", fmtPaceMile(minPerKm)],
            ["Speed", `${((d / m) * 60).toFixed(2)} km/h`],
            ["Est. steps", steps.toLocaleString()],
          ],
          note: `Steps estimated from a ${stride} cm stride — individuals vary.`,
        };
      }}
    />
  );
}

function FuelCostTool() {
  return (
    <Calc
      fields={[
        { key: "d", label: "Distance (km)", type: "number", def: "100", required: true },
        { key: "c", label: "Consumption (L/100 km)", type: "number", def: "7.5", required: true },
        { key: "p", label: "Fuel price (per litre)", type: "number", def: "1.6", required: true },
      ]}
      compute={(v) => {
        const d = req(v, "d", "Distance (km)");
        if (typeof d !== "number") return d;
        const c = req(v, "c", "Consumption (L/100 km)");
        if (typeof c !== "number") return c;
        const p = req(v, "p", "Fuel price (per litre)");
        if (typeof p !== "number") return p;
        if (d < 0 || c <= 0 || p < 0) return { error: "Consumption must be positive; distance and price cannot be negative." };
        const litres = (d * c) / 100;
        return {
          rows: [
            ["Fuel needed", `${litres.toFixed(2)} L`],
            ["Total cost", p === 0 ? "— (no price given)" : `${(litres * p).toFixed(2)}`],
            ["Cost / 100 km", `${(c * p).toFixed(2)}`],
          ],
        };
      }}
    />
  );
}

function ElectricityCostTool() {
  return (
    <Calc
      fields={[
        { key: "w", label: "Wattage (W)", type: "number", def: "1000", required: true },
        { key: "h", label: "Hours per day", type: "number", def: "2", required: true },
        { key: "d", label: "Days", type: "number", def: "30", required: true },
        { key: "t", label: "Tariff (per kWh)", type: "number", def: "0.3", required: true },
      ]}
      compute={(v) => {
        const w = req(v, "w", "Wattage (W)");
        if (typeof w !== "number") return w;
        const h = req(v, "h", "Hours per day");
        if (typeof h !== "number") return h;
        const d = req(v, "d", "Days");
        if (typeof d !== "number") return d;
        const t = req(v, "t", "Tariff (per kWh)");
        if (typeof t !== "number") return t;
        if (w < 0 || h < 0 || h > 24 || d < 0 || t < 0) return { error: "Check ranges: hours 0–24, other values non-negative." };
        const kwh = (w * h * d) / 1000;
        return { rows: [["Energy", `${kwh.toFixed(3)} kWh`], ["Cost", `${(kwh * t).toFixed(2)}`], ["Per day", `${(((w * h) / 1000) * t).toFixed(3)} /day`]] };
      }}
    />
  );
}

function UnitPriceTool() {
  return (
    <Calc
      button="Compare"
      fields={[
        { key: "pa", label: "Pack A price", type: "number", def: "3.5", required: true },
        { key: "qa", label: "Pack A quantity", type: "number", def: "500", required: true },
        { key: "pb", label: "Pack B price", type: "number", def: "5", required: true },
        { key: "qb", label: "Pack B quantity", type: "number", def: "800", required: true },
      ]}
      compute={(v) => {
        const pa = req(v, "pa", "Pack A price");
        if (typeof pa !== "number") return pa;
        const qa = req(v, "qa", "Pack A quantity");
        if (typeof qa !== "number") return qa;
        const pb = req(v, "pb", "Pack B price");
        if (typeof pb !== "number") return pb;
        const qb = req(v, "qb", "Pack B quantity");
        if (typeof qb !== "number") return qb;
        if (qa <= 0 || qb <= 0 || pa < 0 || pb < 0) return { error: "Quantities must be positive; prices non-negative." };
        const ua = pa / qa;
        const ub = pb / qb;
        const better = ua <= ub ? "A" : "B";
        const saving = Math.abs(ua - ub) / Math.max(ua, ub);
        return {
          rows: [
            ["Pack A /unit", ua.toFixed(4)],
            ["Pack B /unit", ub.toFixed(4)],
            ["Better buy", `Pack ${better}`],
            ["Saving", `${(saving * 100).toFixed(1)}% per unit`],
          ],
        };
      }}
    />
  );
}

function AgeDiffTool() {
  return (
    <Calc
      button="Compare dates"
      fields={[
        { key: "a", label: "First date", type: "date", def: "2000-01-01", required: true },
        { key: "b", label: "Second date", type: "date", def: todayYmd(), required: true },
      ]}
      compute={(v) => {
        const a = parseYmd(v.a ?? "");
        const b = parseYmd(v.b ?? "");
        if (!a || !b) return { error: "Enter two valid dates." };
        const [s, e] = a <= b ? [a, b] : [b, a];
        let y = e.getFullYear() - s.getFullYear();
        let m = e.getMonth() - s.getMonth();
        let d = e.getDate() - s.getDate();
        if (d < 0) {
          m--;
          d += new Date(e.getFullYear(), e.getMonth(), 0).getDate();
        }
        if (m < 0) {
          y--;
          m += 12;
        }
        const totalDays = Math.round((e.getTime() - s.getTime()) / 86400000);
        return {
          rows: [
            ["Difference", `${y} y ${m} m ${d} d`],
            ["Total days", totalDays.toLocaleString()],
            ["Total months", (totalDays / 30.44).toFixed(1)],
            ["Total weeks", (totalDays / 7).toFixed(1)],
          ],
        };
      }}
    />
  );
}

function RandomDecisionTool() {
  const [opts, setOpts] = useState("Pizza\nSushi\nBurgers");
  const [error, setError] = useState("");
  const [pick, setPick] = useState<string | null>(null);
  const h = useHistory();
  return (
    <div>
      <FieldLabel htmlFor="rdm-opts">Options (one per line)</FieldLabel>
      <Textarea id="rdm-opts" value={opts} onChange={(e) => setOpts(e.target.value)} />
      <div className="mt-3">
        <Button type="button" onClick={() => {
          const list = linesOf(opts);
          if (list.length === 0) {
            setError("Enter at least one option.");
            return;
          }
          setError("");
          const r = randomInt(0, list.length - 1);
          const val = list[r.value] as string;
          setPick(val);
          h.push(val, r.secure);
        }}>Pick one</Button>
      </div>
      <Err message={error} />
      {pick !== null && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
          <p className="text-sm text-(--muted)">Decision</p>
          <p className="mt-1 text-2xl font-extrabold text-(--foreground)">{pick}</p>
        </div>
      )}
      <HistoryBlock history={h.history} secure={h.secure} onClear={h.clear} fileName="decisions.txt" />
    </div>
  );
}

function NumberPickerTool() {
  const [mn, setMn] = useState("1");
  const [mx, setMx] = useState("100");
  const [error, setError] = useState("");
  const [last, setLast] = useState<number | null>(null);
  const h = useHistory();
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="np-min">Minimum</FieldLabel>
          <Input id="np-min" inputMode="numeric" value={mn} onChange={(e) => setMn(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="np-max">Maximum</FieldLabel>
          <Input id="np-max" inputMode="numeric" value={mx} onChange={(e) => setMx(e.target.value)} />
        </div>
      </div>
      <div className="mt-3">
        <Button type="button" onClick={() => {
          const a = Number(mn);
          const b = Number(mx);
          if (!Number.isInteger(a) || !Number.isInteger(b)) {
            setError("Min and max must be whole numbers.");
            return;
          }
          if (Math.abs(b - a) > 1000000000) {
            setError("Range is too large.");
            return;
          }
          setError("");
          const r = randomInt(a, b);
          setLast(r.value);
          h.push(String(r.value), r.secure);
        }}>Draw number</Button>
      </div>
      <Err message={error} />
      {last !== null && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
          <p className="text-4xl font-extrabold text-(--foreground) tabular-nums">{last}</p>
        </div>
      )}
      <HistoryBlock history={h.history} secure={h.secure} onClear={h.clear} fileName="number-draws.txt" />
    </div>
  );
}

function NamePickerTool() {
  const [names, setNames] = useState("Ava\nLiam\nMia\nNoah\nEmma");
  const [error, setError] = useState("");
  const [winner, setWinner] = useState<string | null>(null);
  const h = useHistory();
  return (
    <div>
      <FieldLabel htmlFor="npk-names">Names (one per line)</FieldLabel>
      <Textarea id="npk-names" value={names} onChange={(e) => setNames(e.target.value)} />
      <div className="mt-3">
        <Button type="button" onClick={() => {
          const list = linesOf(names);
          if (list.length === 0) {
            setError("Enter at least one name.");
            return;
          }
          setError("");
          const r = randomInt(0, list.length - 1);
          const val = list[r.value] as string;
          setWinner(val);
          h.push(val, r.secure);
        }}>Draw winner</Button>
      </div>
      <Err message={error} />
      {winner !== null && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
          <p className="text-sm text-(--muted)">Winner</p>
          <p className="mt-1 text-2xl font-extrabold text-(--foreground)">{winner}</p>
        </div>
      )}
      <HistoryBlock history={h.history} secure={h.secure} onClear={h.clear} fileName="name-draws.txt" />
    </div>
  );
}

function TeamGeneratorTool() {
  const [names, setNames] = useState("Ava\nLiam\nMia\nNoah\nEmma\nLucas");
  const [count, setCount] = useState("2");
  const [error, setError] = useState("");
  const [teams, setTeams] = useState<string[][] | null>(null);
  const [copied, copy] = useCopied();
  return (
    <div>
      <FieldLabel htmlFor="tg-names">Names (one per line)</FieldLabel>
      <Textarea id="tg-names" value={names} onChange={(e) => setNames(e.target.value)} />
      <div className="mt-3 max-w-[200px]">
        <FieldLabel htmlFor="tg-n">Team count</FieldLabel>
        <Input id="tg-n" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
      </div>
      <div className="mt-3">
        <Button type="button" onClick={() => {
          const list = linesOf(names);
          const n = Number(count);
          if (list.length < 2) {
            setError("Enter at least two names.");
            return;
          }
          if (!Number.isInteger(n) || n < 2 || n > list.length) {
            setError("Team count must be 2 or more and no more than the name count.");
            return;
          }
          setError("");
          const { out } = shuffle(list);
          const t: string[][] = Array.from({ length: n }, () => []);
          out.forEach((name, i) => {
            (t[i % n] as string[]).push(name);
          });
          setTeams(t);
        }}>Split into teams</Button>
      </div>
      <Err message={error} />
      {teams && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-live="polite">
          {teams.map((t, i) => (
            <div key={i} className="rounded-xl border border-(--border) p-3">
              <p className="font-bold text-(--foreground)">Team {i + 1}</p>
              <ul className="mt-1 text-sm text-(--muted)">{t.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
      {teams && <div className="mt-3"><Button type="button" variant="secondary" onClick={() => copy(teams.map((t, i) => `Team ${i + 1}: ${t.join(", ")}`).join("\n"))}>{copied ? "Copied!" : "Copy teams"}</Button></div>}
      <Note>Shuffled with cryptographic randomness (Fisher-Yates).</Note>
    </div>
  );
}

function YesNoTool() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [yes, setYes] = useState(0);
  const [no, setNo] = useState(0);
  const h = useHistory();
  return (
    <div>
      <FieldLabel htmlFor="yn-q">Your question (optional)</FieldLabel>
      <Input id="yn-q" value={q} placeholder="Should I…?" onChange={(e) => setQ(e.target.value)} />
      <div className="mt-3">
        <Button type="button" onClick={() => {
          const r = randomInt(0, 1);
          const a = r.value === 1 ? "Yes" : "No";
          setAnswer(a);
          if (a === "Yes") setYes((y) => y + 1);
          else setNo((n) => n + 1);
          h.push(`${q.trim() ? q.trim() + " → " : ""}${a}`, r.secure);
        }}>Decide</Button>
      </div>
      {answer !== null && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
          <p className="text-4xl font-extrabold text-(--foreground)">{answer}</p>
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat label="Yes" value={String(yes)} />
        <Stat label="No" value={String(no)} />
      </div>
      <HistoryBlock history={h.history} secure={h.secure} onClear={h.clear} fileName="yes-no.txt" />
    </div>
  );
}

function GroceryBudgetTool() {
  return (
    <Calc
      fields={[
        { key: "w", label: "Weekly spend", type: "number", def: "150", required: true },
        { key: "hh", label: "Household size", type: "number", def: "2", required: true },
        { key: "save", label: "Saving target (%)", type: "number", def: "10" },
      ]}
      compute={(v) => {
        const w = req(v, "w", "Weekly spend");
        if (typeof w !== "number") return w;
        const hh = req(v, "hh", "Household size");
        if (typeof hh !== "number") return hh;
        const save = num(v, "save") ?? 0;
        if (w < 0 || hh <= 0 || save < 0 || save > 90) return { error: "Check ranges: spend non-negative, household ≥ 1, saving 0–90%." };
        const monthly = (w * 52) / 12;
        const yearly = w * 52;
        return {
          rows: [
            ["Monthly", monthly.toFixed(2)],
            ["Yearly", yearly.toFixed(2)],
            ["Per person / week", (w / hh).toFixed(2)],
            ["Target saving / month", (monthly * (save / 100)).toFixed(2)],
          ],
          note: "Estimate only — prices vary by store and season.",
        };
      }}
    />
  );
}

function WorkHoursTool() {
  return (
    <Calc
      button="Compute hours"
      fields={[
        { key: "start", label: "Clock-in (HH:MM)", type: "time", def: "09:00", required: true },
        { key: "end", label: "Clock-out (HH:MM)", type: "time", def: "17:30", required: true },
        { key: "brk", label: "Break (minutes)", type: "number", def: "30" },
      ]}
      compute={(v) => {
        const s = parseHm(v.start ?? "");
        const e = parseHm(v.end ?? "");
        if (s === null || e === null) return { error: "Enter valid start and end times." };
        const brk = num(v, "brk") ?? 0;
        if (brk < 0 || brk > 1440) return { error: "Break must be 0–1440 minutes." };
        let worked = e - s;
        if (worked < 0) worked += 1440;
        const net = worked - brk;
        if (net < 0) return { error: "Break is longer than the shift." };
        return {
          rows: [
            ["Net hours", fmtDur(net)],
            ["Decimal", `${(net / 60).toFixed(2)} h`],
            ["Weekly (×5)", `${((net / 60) * 5).toFixed(2)} h`],
          ],
        };
      }}
    />
  );
}

function SleepCycleTool() {
  return (
    <Calc
      button="Find wake time"
      fields={[
        { key: "bed", label: "Asleep at (HH:MM)", type: "time", def: "23:00", required: true },
        { key: "c", label: "Cycles (×90 min)", type: "select", options: [{ value: "4", label: "4 cycles (6 h)" }, { value: "5", label: "5 cycles (7.5 h)" }, { value: "6", label: "6 cycles (9 h)" }], def: "5" },
      ]}
      compute={(v) => {
        const bed = parseHm(v.bed ?? "");
        if (bed === null) return { error: "Enter a valid bedtime." };
        const c = Number(v.c || "5");
        const wake = bed + c * 90;
        return {
          rows: [
            ["Wake up", fmtHm(wake)],
            [`${c} full cycles`, `${(c * 1.5).toFixed(1)} h of sleep`],
            ["One fewer", fmtHm(wake - 90)],
            ["One more", fmtHm(wake + 90)],
          ],
          note: "90-minute cycles counted from when you fall asleep.",
        };
      }}
    />
  );
}

/* ================= FOOD (20) ================= */

function parseLeadingQty(line: string): { qty: number; rest: string } | null {
  const m = /^(\d+(?:\.\d+)?(?:\s+\d+\s*\/\s*\d+)?|\d+\s*\/\s*\d+)\s+(.*)$/.exec(line.trim());
  if (!m) return null;
  const raw = (m[1] as string).trim();
  let qty: number;
  const mixed = /^(\d+(?:\.\d+)?)\s+(\d+)\s*\/\s*(\d+)$/.exec(raw);
  const frac = /^(\d+)\s*\/\s*(\d+)$/.exec(raw);
  if (mixed) qty = Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  else if (frac) qty = Number(frac[1]) / Number(frac[2]);
  else qty = Number(raw);
  if (!Number.isFinite(qty)) return null;
  return { qty, rest: (m[2] as string).trim() };
}

function RecipeScalerTool() {
  return (
    <Calc
      button="Scale recipe"
      fields={[
        { key: "from", label: "Original servings", type: "number", def: "4", required: true },
        { key: "to", label: "Target servings", type: "number", def: "6", required: true },
        { key: "ing", label: "Ingredients (each line starts with a quantity)", type: "textarea", def: "2 cups flour\n1 tsp salt\n200 g chicken" },
      ]}
      compute={(v) => {
        const from = req(v, "from", "Original servings");
        if (typeof from !== "number") return from;
        const to = req(v, "to", "Target servings");
        if (typeof to !== "number") return to;
        if (from <= 0 || to <= 0) return { error: "Servings must be positive." };
        const f = to / from;
        const inLines = (v.ing ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
        if (inLines.length === 0) return { error: "Enter at least one ingredient line." };
        const scaled = inLines.map((ln) => {
          const p = parseLeadingQty(ln);
          if (!p) return `${ln}  (no quantity found — unchanged)`;
          const q = p.qty * f;
          const str = Number.isInteger(q) ? String(q) : String(Number(q.toPrecision(6)));
          return `${str} ${p.rest}`;
        });
        return {
          rows: [
            ["Factor", `×${Number(f.toPrecision(6))}`],
            ...scaled.slice(0, 3).map((s, i): [string, string] => [`Ingredient ${i + 1}`, s]),
          ],
          note: scaled.length > 3 ? `More: ${scaled.slice(3).join(" · ")}` : "All ingredient lines scaled.",
        };
      }}
    />
  );
}

function IngredientConverterTool() {
  return (
    <Units
      units={[
        { id: "g", label: "Grams (g)", factor: 1 },
        { id: "kg", label: "Kilograms (kg)", factor: 1000 },
        { id: "oz", label: "Ounces (oz)", factor: 28.349523125 },
        { id: "lb", label: "Pounds (lb)", factor: 453.59237 },
        { id: "ml", label: "Millilitres (ml)", factor: 1 },
        { id: "cup", label: "US cups", factor: 236.5882365 },
        { id: "tbsp", label: "Tablespoons", factor: 14.78676478125 },
        { id: "tsp", label: "Teaspoons", factor: 4.92892159375 },
      ]}
      defFrom="cup"
      defTo="g"
      hint="Volume ↔ weight uses water-equivalent density (1 ml = 1 g). For flour or sugar use the Cups to Grams tool with real densities."
    />
  );
}

const DENSITIES: { id: string; label: string; gPerCup: number }[] = [
  { id: "flour", label: "All-purpose flour", gPerCup: 125 },
  { id: "sugar", label: "Granulated sugar", gPerCup: 200 },
  { id: "butter", label: "Butter", gPerCup: 227 },
  { id: "rice", label: "Uncooked rice", gPerCup: 185 },
  { id: "milk", label: "Milk", gPerCup: 245 },
  { id: "water", label: "Water", gPerCup: 236.59 },
  { id: "honey", label: "Honey", gPerCup: 340 },
  { id: "oats", label: "Rolled oats", gPerCup: 90 },
];

function CupsToGramsTool() {
  return (
    <Calc
      fields={[
        { key: "ing", label: "Ingredient", type: "select", options: DENSITIES.map((d) => ({ value: d.id, label: `${d.label} (${d.gPerCup} g/cup)` })), def: "flour" },
        { key: "cups", label: "Cups", type: "number", def: "1", required: true },
      ]}
      compute={(v) => {
        const cups = req(v, "cups", "Cups");
        if (typeof cups !== "number") return cups;
        if (cups < 0 || cups > 1000) return { error: "Cups must be 0–1000." };
        const d = DENSITIES.find((x) => x.id === v.ing) ?? DENSITIES[0];
        const g = cups * (d as { gPerCup: number }).gPerCup;
        return { rows: [["Grams", `${Number(g.toPrecision(10))} g`], ["Ounces", `${(g / 28.349523125).toFixed(2)} oz`], ["Ingredient", (d as { label: string }).label]], note: "Per-cup densities for common baking ingredients." };
      }}
    />
  );
}

function GramsToCupsTool() {
  return (
    <Calc
      fields={[
        { key: "ing", label: "Ingredient", type: "select", options: DENSITIES.map((d) => ({ value: d.id, label: `${d.label} (${d.gPerCup} g/cup)` })), def: "flour" },
        { key: "g", label: "Grams", type: "number", def: "125", required: true },
      ]}
      compute={(v) => {
        const g = req(v, "g", "Grams");
        if (typeof g !== "number") return g;
        if (g < 0 || g > 50000) return { error: "Grams must be 0–50,000." };
        const d = DENSITIES.find((x) => x.id === v.ing) ?? DENSITIES[0];
        const cups = g / (d as { gPerCup: number }).gPerCup;
        return {
          rows: [
            ["US cups", String(Number(cups.toPrecision(10)))],
            ["Tablespoons", `${(cups * 16).toFixed(2)} tbsp`],
            ["Ingredient", (d as { label: string }).label],
          ],
        };
      }}
    />
  );
}

const GAS_MARKS: [number, number][] = [[140, 1], [150, 2], [160, 3], [180, 4], [190, 5], [200, 6], [220, 7], [230, 8], [240, 9]];

function gasFromC(c: number): string {
  if (c < GAS_MARKS[0]![0] - 10) return "below Gas 1";
  let best = GAS_MARKS[0]!;
  for (const g of GAS_MARKS) {
    if (Math.abs(c - g[0]) < Math.abs(c - best[0])) best = g;
  }
  return `Gas ${best[1]} (≈${best[0]}°C)`;
}

function CookingTempTool() {
  return (
    <Units
      units={[
        { id: "c", label: "°C", factor: 1 },
        { id: "f", label: "°F", factor: 1 },
        { id: "gas", label: "Gas mark", factor: 1 },
      ]}
      defFrom="c"
      defTo="f"
      convert={(val, from, to) => {
        let c: number;
        if (from === "c") c = val;
        else if (from === "f") c = ((val - 32) * 5) / 9;
        else {
          const g = GAS_MARKS.find((x) => x[1] === Math.round(val));
          if (!g) return null;
          c = g[0];
        }
        if (to === "c") return c;
        if (to === "f") return (c * 9) / 5 + 32;
        const label = gasFromC(c);
        const n = Number(/Gas (\d)/.exec(label)?.[1] ?? NaN);
        return Number.isFinite(n) ? n : null;
      }}
      hint="°C ↔ °F uses exact conversion math; gas mark uses the standard UK mapping (shown approximately)."
    />
  );
}

function CookingTimerTool() {
  return (
    <div>
      <Timer mode="countdown" presets={[360, 600, 1080, 1800, 3600]} />
      <Note>Presets: soft egg 6 min · pasta 10 min · rice 18 min · baking 30 min · roast 60 min. Set custom seconds for anything else — a chime sounds at zero.</Note>
    </div>
  );
}

function KitchenUnitsTool() {
  return (
    <Units
      units={[
        { id: "tsp", label: "Teaspoons (tsp)", factor: 4.92892159375 },
        { id: "tbsp", label: "Tablespoons (tbsp)", factor: 14.78676478125 },
        { id: "cup", label: "US cups", factor: 236.5882365 },
        { id: "pint", label: "Pints", factor: 473.176473 },
        { id: "quart", label: "Quarts", factor: 946.352946 },
        { id: "gal", label: "Gallons", factor: 3785.411784 },
        { id: "ml", label: "Millilitres (ml)", factor: 1 },
        { id: "l", label: "Litres (l)", factor: 1000 },
      ]}
      defFrom="cup"
      defTo="ml"
      hint="Exact US customary factors (1 cup = 236.588 ml)."
    />
  );
}

function BakersPctTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "flour", label: "Flour weight (g)", type: "number", def: "500", required: true },
        { key: "others", label: "Other ingredients — one per line as “name weight_g”", type: "textarea", def: "water 350\nsalt 10\nyeast 5" },
      ]}
      compute={(v) => {
        const flour = req(v, "flour", "Flour weight (g)");
        if (typeof flour !== "number") return flour;
        if (flour <= 0) return { error: "Flour weight must be positive." };
        const rows: [string, string][] = [["Flour", "100%"]];
        let total = flour;
        for (const ln of (v.others ?? "").split("\n").map((x) => x.trim()).filter(Boolean)) {
          const m = /^(.*?)\s+(\d+(?:\.\d+)?)\s*g?$/.exec(ln);
          if (!m) return { error: `Could not parse line: “${ln}”. Use “name weight”.` };
          const w = Number(m[2]);
          total += w;
          rows.push([m[1] as string, `${((w / flour) * 100).toFixed(1)}% (${w} g)`]);
        }
        rows.push(["Total dough", `${Number(total.toPrecision(10))} g`]);
        return { rows, note: "Baker's math: flour is always 100%." };
      }}
    />
  );
}

function RecipeCostTool() {
  return (
    <Calc
      fields={[
        { key: "cost", label: "Total ingredient cost", type: "number", def: "12", required: true },
        { key: "serv", label: "Servings", type: "number", def: "4", required: true },
      ]}
      compute={(v) => {
        const cost = req(v, "cost", "Total ingredient cost");
        if (typeof cost !== "number") return cost;
        const serv = req(v, "serv", "Servings");
        if (typeof serv !== "number") return serv;
        if (cost < 0 || serv <= 0) return { error: "Cost must be non-negative and servings positive." };
        const per = cost / serv;
        return {
          rows: [
            ["Per serving", per.toFixed(2)],
            ["Double batch", (per * serv * 2).toFixed(2)],
            ["Cost for 8 servings", (per * 8).toFixed(2)],
          ],
          note: "Estimate for home budgeting — not professional food-costing advice.",
        };
      }}
    />
  );
}

function ServingSizeTool() {
  return (
    <Calc
      fields={[
        { key: "mode", label: "Direction", type: "select", options: [{ value: "per", label: "Total → per serving" }, { value: "batch", label: "Serving → full batch" }], def: "per" },
        { key: "amt", label: "Amount (g)", type: "number", def: "1000", required: true },
        { key: "n", label: "Servings", type: "number", def: "4", required: true },
      ]}
      compute={(v) => {
        const amt = req(v, "amt", "Amount (g)");
        if (typeof amt !== "number") return amt;
        const n = req(v, "n", "Servings");
        if (typeof n !== "number") return n;
        if (amt <= 0 || n <= 0) return { error: "Amount and servings must be positive." };
        if (v.mode === "batch") return { rows: [["Full batch", `${Number((amt * n).toPrecision(10))} g`], ["Per serving", `${amt} g`], ["Servings", String(n)]] };
        return { rows: [["Per serving", `${Number((amt / n).toPrecision(10))} g`], ["Batch total", `${amt} g`], ["Servings", String(n)]] };
      }}
    />
  );
}

function PizzaDoughTool() {
  return (
    <Calc
      fields={[
        { key: "pies", label: "Pie count", type: "number", def: "4", required: true },
        { key: "ball", label: "Dough ball (g)", type: "number", def: "250", required: true },
        { key: "hyd", label: "Hydration (%)", type: "number", def: "65", required: true },
      ]}
      compute={(v) => {
        const pies = req(v, "pies", "Pie count");
        if (typeof pies !== "number") return pies;
        const ball = req(v, "ball", "Dough ball (g)");
        if (typeof ball !== "number") return ball;
        const hyd = req(v, "hyd", "Hydration (%)");
        if (typeof hyd !== "number") return hyd;
        if (!Number.isInteger(pies) || pies < 1 || pies > 100 || ball <= 0 || hyd < 40 || hyd > 100) return { error: "Check ranges: pies 1–100 whole, ball positive, hydration 40–100%." };
        const total = pies * ball;
        const flour = total / (1 + hyd / 100 + 0.025 + 0.005);
        const water = flour * (hyd / 100);
        return {
          rows: [
            ["Flour", `${flour.toFixed(1)} g (100%)`],
            ["Water", `${water.toFixed(1)} g (${hyd}%)`],
            ["Salt", `${(flour * 0.025).toFixed(1)} g (2.5%)`],
            ["Dry yeast", `${(flour * 0.005).toFixed(1)} g (0.5%)`],
            ["Total dough", `${total} g`],
          ],
        };
      }}
    />
  );
}

function HydrationTool() {
  return (
    <Calc
      fields={[
        { key: "water", label: "Water (g)", type: "number", def: "350", required: true },
        { key: "flour", label: "Flour (g)", type: "number", def: "500", required: true },
      ]}
      compute={(v) => {
        const water = req(v, "water", "Water (g)");
        if (typeof water !== "number") return water;
        const flour = req(v, "flour", "Flour (g)");
        if (typeof flour !== "number") return flour;
        if (water < 0 || flour <= 0) return { error: "Flour must be positive; water non-negative." };
        const pct = (water / flour) * 100;
        const style = pct < 55 ? "Stiff (bagel-style)" : pct < 62 ? "Firm sandwich loaf" : pct < 70 ? "Soft artisan dough" : pct < 80 ? "Wet (ciabatta-style)" : "Very wet batter-like dough";
        return { rows: [["Hydration", `${pct.toFixed(1)}%`], ["Style", style]] };
      }}
    />
  );
}

function CoffeeRatioTool() {
  return (
    <Calc
      fields={[
        { key: "mode", label: "Solve for", type: "select", options: [{ value: "water", label: "Water from dose" }, { value: "dose", label: "Dose from target yield" }], def: "water" },
        { key: "dose", label: "Coffee dose (g)", type: "number", def: "20", required: true },
        { key: "ratio", label: "Ratio water:coffee (e.g. 15 for 1:15)", type: "number", def: "15", required: true },
        { key: "yield", label: "Target yield (ml, dose mode)", type: "number", def: "300" },
      ]}
      compute={(v) => {
        const ratio = req(v, "ratio", "Ratio water:coffee (e.g. 15 for 1:15)");
        if (typeof ratio !== "number") return ratio;
        if (ratio <= 0 || ratio > 100) return { error: "Ratio must be 0–100." };
        if (v.mode === "dose") {
          const y = req(v, "yield", "Target yield (ml, dose mode)");
          if (typeof y !== "number") return y;
          if (y <= 0) return { error: "Target yield must be positive." };
          return { rows: [["Coffee dose", `${(y / ratio).toFixed(1)} g`], ["Water", `${y} ml`], ["Ratio", `1:${ratio}`]] };
        }
        const dose = req(v, "dose", "Coffee dose (g)");
        if (typeof dose !== "number") return dose;
        if (dose <= 0) return { error: "Dose must be positive." };
        return { rows: [["Water needed", `${(dose * ratio).toFixed(0)} ml`], ["Final yield", `≈${(dose * ratio).toFixed(0)} ml`], ["Ratio", `1:${ratio}`]] };
      }}
    />
  );
}

const BREWS = [
  { id: "pour", label: "Pour-over", ratio: 16, time: "2:30–3:30", perCup: 15 },
  { id: "press", label: "French press", ratio: 14, time: "~4:00", perCup: 17 },
  { id: "aero", label: "AeroPress", ratio: 13, time: "~2:00", perCup: 15 },
  { id: "moka", label: "Moka pot", ratio: 10, time: "~5:00", perCup: 18 },
  { id: "espresso", label: "Espresso", ratio: 2, time: "~0:30", perCup: 18 },
  { id: "cold", label: "Cold brew", ratio: 8, time: "12–18 h", perCup: 30 },
];

function CoffeeBrewTool() {
  return (
    <Calc
      fields={[
        { key: "m", label: "Method", type: "select", options: BREWS.map((b) => ({ value: b.id, label: `${b.label} (1:${b.ratio})` })), def: "pour" },
        { key: "cups", label: "Cups (250 ml each)", type: "number", def: "2", required: true },
      ]}
      compute={(v) => {
        const cups = req(v, "cups", "Cups (250 ml each)");
        if (typeof cups !== "number") return cups;
        if (cups <= 0 || cups > 40) return { error: "Cups must be 0–40." };
        const b = BREWS.find((x) => x.id === v.m) ?? BREWS[0];
        const brew = b as { label: string; ratio: number; time: string };
        const water = cups * 250;
        return {
          rows: [
            ["Coffee", `${(water / brew.ratio).toFixed(1)} g`],
            ["Water", `${water} ml`],
            ["Brew time", brew.time],
            ["Ratio", `1:${brew.ratio}`],
          ],
        };
      }}
    />
  );
}

function CocktailRatioTool() {
  return (
    <Calc
      fields={[
        { key: "base", label: "Base juice per serving (ml)", type: "number", def: "60", required: true },
        { key: "mix", label: "Mixer per 1 part base (ml)", type: "number", def: "120", required: true },
        { key: "n", label: "Servings", type: "number", def: "8", required: true },
      ]}
      compute={(v) => {
        const base = req(v, "base", "Base juice per serving (ml)");
        if (typeof base !== "number") return base;
        const mix = req(v, "mix", "Mixer per 1 part base (ml)");
        if (typeof mix !== "number") return mix;
        const n = req(v, "n", "Servings");
        if (typeof n !== "number") return n;
        if (base <= 0 || mix < 0 || n <= 0) return { error: "Base and servings must be positive; mixer non-negative." };
        return {
          rows: [
            ["Base juice total", `${(base * n).toFixed(0)} ml`],
            ["Mixer total", `${(mix * n).toFixed(0)} ml`],
            ["Per serving", `${base + mix} ml`],
            ["Batch total", `${(base + mix) * n} ml (≈${(((base + mix) * n) / 1000).toFixed(2)} L)`],
          ],
          note: "Non-alcoholic mixer drinks only.",
        };
      }}
    />
  );
}

function NutritionLabelTool() {
  return (
    <Calc
      fields={[
        { key: "kcal", label: "Calories / serving", type: "number", def: "250", required: true },
        { key: "p", label: "Protein (g)", type: "number", def: "15", required: true },
        { key: "c", label: "Carbs (g)", type: "number", def: "30", required: true },
        { key: "f", label: "Fat (g)", type: "number", def: "8", required: true },
      ]}
      compute={(v) => {
        const kcal = req(v, "kcal", "Calories / serving");
        if (typeof kcal !== "number") return kcal;
        const p = req(v, "p", "Protein (g)");
        if (typeof p !== "number") return p;
        const c = req(v, "c", "Carbs (g)");
        if (typeof c !== "number") return c;
        const f = req(v, "f", "Fat (g)");
        if (typeof f !== "number") return f;
        if (kcal < 0 || p < 0 || c < 0 || f < 0) return { error: "Values cannot be negative." };
        return {
          rows: [
            ["Protein %DV", `${((p / 50) * 100).toFixed(0)}% (of 50 g)`],
            ["Carbs %DV", `${((c / 275) * 100).toFixed(0)}% (of 275 g)`],
            ["Fat %DV", `${((f / 78) * 100).toFixed(0)}% (of 78 g)`],
            ["Energy %DV", `${((kcal / 2000) * 100).toFixed(0)}% (of 2,000 kcal)`],
          ],
          note: `Reference intakes for a 2,000 kcal diet. Rough estimate — ${MEDICAL.toLowerCase()}`,
        };
      }}
    />
  );
}

const FOODS = [
  { id: "chicken", label: "Chicken breast", kcal: 165 },
  { id: "rice", label: "Cooked rice", kcal: 130 },
  { id: "egg", label: "Egg", kcal: 155 },
  { id: "milk", label: "Milk", kcal: 42 },
  { id: "bread", label: "Bread", kcal: 265 },
  { id: "banana", label: "Banana", kcal: 89 },
  { id: "apple", label: "Apple", kcal: 52 },
  { id: "potato", label: "Potato", kcal: 77 },
  { id: "pasta", label: "Cooked pasta", kcal: 131 },
  { id: "beef", label: "Beef", kcal: 250 },
  { id: "salmon", label: "Salmon", kcal: 208 },
  { id: "cheese", label: "Cheddar cheese", kcal: 402 },
  { id: "oats", label: "Oats", kcal: 389 },
  { id: "broccoli", label: "Broccoli", kcal: 34 },
];

function FoodCalorieTool() {
  return (
    <Calc
      fields={[
        { key: "f", label: "Food", type: "select", options: FOODS.map((x) => ({ value: x.id, label: `${x.label} (${x.kcal}/100 g)` })), def: "chicken" },
        { key: "g", label: "Weight (g)", type: "number", def: "150", required: true },
      ]}
      compute={(v) => {
        const g = req(v, "g", "Weight (g)");
        if (typeof g !== "number") return g;
        if (g < 0 || g > 10000) return { error: "Weight must be 0–10,000 g." };
        const f = FOODS.find((x) => x.id === v.f) ?? FOODS[0];
        const food = f as { label: string; kcal: number };
        return {
          rows: [
            ["Calories", `${((g * food.kcal) / 100).toFixed(0)} kcal`],
            ["Food", food.label],
            ["Per 100 g", `${food.kcal} kcal`],
          ],
          note: `Approximate values — ${MEDICAL.toLowerCase()}`,
        };
      }}
    />
  );
}

function MacroTool() {
  return (
    <Calc
      fields={[
        { key: "w", label: "Weight (kg)", type: "number", def: "70", required: true },
        { key: "goal", label: "Goal", type: "select", options: [{ value: "cut", label: "Cut (lose fat)" }, { value: "maintain", label: "Maintain" }, { value: "gain", label: "Gain (build)" }], def: "maintain" },
      ]}
      compute={(v) => {
        const w = req(v, "w", "Weight (kg)");
        if (typeof w !== "number") return w;
        if (w < 30 || w > 300) return { error: "Weight must be 30–300 kg." };
        const base = w * 30;
        const kcal = v.goal === "cut" ? base * 0.8 : v.goal === "gain" ? base * 1.1 : base;
        const protein = w * (v.goal === "cut" ? 2.2 : v.goal === "gain" ? 2.0 : 1.8);
        const fat = w * 0.9;
        const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);
        return {
          rows: [
            ["Calories", `${Math.round(kcal)} kcal`],
            ["Protein", `${Math.round(protein)} g/day`],
            ["Fat", `${Math.round(fat)} g/day`],
            ["Carbs", `${Math.round(carbs)} g/day`],
          ],
          note: `Standard coaching ranges. ${MEDICAL}`,
        };
      }}
    />
  );
}

function ProteinTool() {
  return (
    <Calc
      fields={[
        { key: "w", label: "Weight (kg)", type: "number", def: "70", required: true },
        { key: "act", label: "Activity", type: "select", options: [{ value: "low", label: "Sedentary" }, { value: "mod", label: "Moderately active" }, { value: "high", label: "Very active / training" }], def: "mod" },
      ]}
      compute={(v) => {
        const w = req(v, "w", "Weight (kg)");
        if (typeof w !== "number") return w;
        if (w < 30 || w > 300) return { error: "Weight must be 30–300 kg." };
        const [lo, hi] = v.act === "low" ? [1.2, 1.4] : v.act === "high" ? [2.0, 2.2] : [1.6, 1.8];
        return {
          rows: [
            ["Daily protein", `${Math.round(w * (lo as number))}–${Math.round(w * (hi as number))} g`],
            ["Range", `${lo}–${hi} g/kg`],
          ],
          note: `Widely used sports-nutrition ranges. ${MEDICAL}`,
        };
      }}
    />
  );
}

function MealPortionTool() {
  return (
    <Calc
      fields={[
        { key: "total", label: "Total food (g)", type: "number", def: "2000", required: true },
        { key: "guests", label: "Guests", type: "number", def: "6", required: true },
        { key: "buf", label: "Leftover buffer (%)", type: "number", def: "10" },
      ]}
      compute={(v) => {
        const total = req(v, "total", "Total food (g)");
        if (typeof total !== "number") return total;
        const guests = req(v, "guests", "Guests");
        if (typeof guests !== "number") return guests;
        const buf = num(v, "buf") ?? 0;
        if (total <= 0 || guests <= 0 || !Number.isInteger(guests) || buf < 0 || buf > 100) return { error: "Check: total positive, guests a whole number ≥ 1, buffer 0–100%." };
        const per = total / guests;
        const prepare = total * (1 + buf / 100);
        return {
          rows: [
            ["Per person", `${per.toFixed(0)} g`],
            ["Prepare total", `${prepare.toFixed(0)} g`],
            ["With buffer", `+${buf}% leftovers`],
          ],
        };
      }}
    />
  );
}

/* ================= TRAVEL (14) ================= */

function TravelDistanceTool() {
  return (
    <Calc
      button="Compute distance"
      fields={[
        { key: "lat1", label: "From latitude", type: "number", def: "51.5074", required: true },
        { key: "lon1", label: "From longitude", type: "number", def: "-0.1278", required: true },
        { key: "lat2", label: "To latitude", type: "number", def: "40.7128", required: true },
        { key: "lon2", label: "To longitude", type: "number", def: "-74.006", required: true },
      ]}
      compute={(v) => {
        const lat1 = req(v, "lat1", "From latitude");
        if (typeof lat1 !== "number") return lat1;
        const lon1 = req(v, "lon1", "From longitude");
        if (typeof lon1 !== "number") return lon1;
        const lat2 = req(v, "lat2", "To latitude");
        if (typeof lat2 !== "number") return lat2;
        const lon2 = req(v, "lon2", "To longitude");
        if (typeof lon2 !== "number") return lon2;
        if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90 || Math.abs(lon1) > 180 || Math.abs(lon2) > 180) return { error: "Latitude must be ±90, longitude ±180." };
        const R = 6371;
        const toRad = (d: number) => (d * Math.PI) / 180;
        const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
        const km = 2 * R * Math.asin(Math.sqrt(a));
        return {
          rows: [
            ["Distance", `${km.toFixed(1)} km`],
            ["Miles", `${(km * 0.621371).toFixed(1)} mi`],
            ["Method", "Haversine great-circle"],
          ],
          note: "Straight-line distance — road distance will be longer.",
        };
      }}
    />
  );
}

function TravelTimeTool() {
  return (
    <Calc
      fields={[
        { key: "d", label: "Distance (km)", type: "number", def: "300", required: true },
        { key: "s", label: "Average speed (km/h)", type: "number", def: "90", required: true },
        { key: "dep", label: "Departure (HH:MM, optional)", type: "time", def: "09:00" },
      ]}
      compute={(v) => {
        const d = req(v, "d", "Distance (km)");
        if (typeof d !== "number") return d;
        const s = req(v, "s", "Average speed (km/h)");
        if (typeof s !== "number") return s;
        if (d < 0 || s <= 0) return { error: "Distance must be non-negative and speed positive." };
        const mins = (d / s) * 60;
        const dep = parseHm(v.dep ?? "");
        const rows: [string, string][] = [
          ["Travel time", fmtDur(mins)],
          ["Decimal", `${(mins / 60).toFixed(2)} h`],
        ];
        if (dep !== null) rows.push(["Arrival", fmtHm(dep + mins)]);
        return { rows, note: "Use a realistic average speed including stops." };
      }}
    />
  );
}

function TripFuelTool() {
  return (
    <Calc
      fields={[
        { key: "d", label: "Trip distance (km)", type: "number", def: "500", required: true },
        { key: "c", label: "Consumption (L/100 km)", type: "number", def: "7", required: true },
        { key: "p", label: "Fuel price (per litre)", type: "number", def: "1.6", required: true },
      ]}
      compute={(v) => {
        const d = req(v, "d", "Trip distance (km)");
        if (typeof d !== "number") return d;
        const c = req(v, "c", "Consumption (L/100 km)");
        if (typeof c !== "number") return c;
        const p = req(v, "p", "Fuel price (per litre)");
        if (typeof p !== "number") return p;
        if (d < 0 || c <= 0 || p < 0) return { error: "Consumption must be positive; distance and price non-negative." };
        const litres = (d * c) / 100;
        return {
          rows: [
            ["Fuel needed", `${litres.toFixed(1)} L (${(litres * 0.264172).toFixed(1)} gal)`],
            ["Total cost", `${(litres * p).toFixed(2)}`],
          ],
          note: "Planning estimate only — traffic and load change real consumption.",
        };
      }}
    />
  );
}

function TripBudgetTool() {
  return (
    <Calc
      fields={[
        { key: "tr", label: "Transport", type: "number", def: "400", required: true },
        { key: "ac", label: "Accommodation", type: "number", def: "600", required: true },
        { key: "food", label: "Food", type: "number", def: "300", required: true },
        { key: "misc", label: "Activities & misc", type: "number", def: "200", required: true },
        { key: "days", label: "Trip days", type: "number", def: "7", required: true },
      ]}
      compute={(v) => {
        const tr = req(v, "tr", "Transport");
        if (typeof tr !== "number") return tr;
        const ac = req(v, "ac", "Accommodation");
        if (typeof ac !== "number") return ac;
        const food = req(v, "food", "Food");
        if (typeof food !== "number") return food;
        const misc = req(v, "misc", "Activities & misc");
        if (typeof misc !== "number") return misc;
        const days = req(v, "days", "Trip days");
        if (typeof days !== "number") return days;
        if (tr < 0 || ac < 0 || food < 0 || misc < 0 || days <= 0) return { error: "Costs must be non-negative and days positive." };
        const total = tr + ac + food + misc;
        return {
          rows: [
            ["Total", total.toFixed(2)],
            ["Per day", (total / days).toFixed(2)],
            ["Transport share", `${(((tr / (total || 1)) * 100).toFixed(0))}%`],
            ["Stay share", `${(((ac / (total || 1)) * 100).toFixed(0))}%`],
            ["Food share", `${(((food / (total || 1)) * 100).toFixed(0))}%`],
          ],
          note: "Planning estimate only.",
        };
      }}
    />
  );
}

function TravelCurrencyTool() {
  return (
    <Calc
      fields={[
        { key: "amt", label: "Amount (home currency)", type: "number", def: "500", required: true },
        { key: "rate", label: "Your exchange rate (foreign per 1 home)", type: "number", def: "0.92", required: true },
        { key: "fee", label: "Fee (%)", type: "number", def: "2" },
      ]}
      compute={(v) => {
        const amt = req(v, "amt", "Amount (home currency)");
        if (typeof amt !== "number") return amt;
        const rate = req(v, "rate", "Your exchange rate (foreign per 1 home)");
        if (typeof rate !== "number") return rate;
        const fee = num(v, "fee") ?? 0;
        if (amt < 0 || rate <= 0 || fee < 0 || fee > 100) return { error: "Amount and fee non-negative, rate positive." };
        const gross = amt * rate;
        const net = gross * (1 - fee / 100);
        return {
          rows: [
            ["You receive", `${net.toFixed(2)}`],
            ["Before fee", `${gross.toFixed(2)}`],
            ["Fee taken", `${(gross - net).toFixed(2)}`],
          ],
          note: "Uses YOUR rate — no live rates. Check your bank before travelling.",
        };
      }}
    />
  );
}

function JetLagTool() {
  return (
    <Gen
      button="Build plan"
      fileName="jet-lag-plan.txt"
      outLabel="Your sleep-shift plan (downloadable)"
      fields={[
        { key: "dir", label: "Direction", type: "select", options: [{ value: "east", label: "Eastbound (day gets shorter)" }, { value: "west", label: "Westbound (day gets longer)" }], def: "east" },
        { key: "hrs", label: "Time zones crossed", type: "number", def: "6", required: true },
        { key: "dep", label: "Departure date", type: "date", def: todayYmd() },
      ]}
      generate={(v) => {
        const hrs = Number(v.hrs);
        if (!Number.isInteger(hrs) || hrs < 1 || hrs > 12) return { error: "Time zones crossed must be a whole number 1–12." };
        const east = v.dir === "east";
        const shift = Math.min(hrs, 3);
        const lines = [
          `JET LAG PLAN — ${hrs} zone(s) ${east ? "eastbound" : "westbound"}`,
          `Departure: ${v.dep || "—"}`,
          "",
          `For the ${shift} night(s) before you fly, move bedtime and wake time ${east ? "EARLIER" : "LATER"} by 1 hour each night (total ${shift} h of the ${hrs} h gap).`,
          ...Array.from({ length: shift }, (_, i) => `Night ${i + 1}: bed/wake ${east ? "1 h earlier" : "1 h later"} than usual.`),
          "",
          east ? "Light: seek bright morning light at destination; avoid bright late-evening light for 2 days." : "Light: seek bright late-afternoon/evening light at destination; wear sunglasses early morning.",
          "Caffeine: mornings only at destination; none after mid-afternoon for the first 2 days.",
          "Onboard: set your watch to destination time, sleep on night-flight legs, hydrate, limit alcohol.",
          "",
          "General information — not medical advice. See a clinician if you use sleep medication or have a sleep disorder.",
        ];
        return lines.join("\n");
      }}
    />
  );
}

const PACKING = ["Passport / ID", "Tickets & bookings (offline copies)", "Travel insurance details", "Phone + charger + adapter", "Medications", "Toiletries (3-1-1 bag)", "Change of clothes in day bag", "Weather-appropriate layers", "Comfortable walking shoes", "Snacks & water bottle", "Cash + backup card", "Emergency contacts"];

function PackingListTool() {
  return <Checklist initial={PACKING} persistKey="toolora:packing-list" exportName="packing-list.txt" addLabel="Add item" placeholder="Add a packing item…" />;
}

const TRAVEL_DOCS = ["Passport valid 6+ months", "Visa / entry permit", "Travel insurance", "Flight bookings", "Hotel bookings", "Transfer / car rental bookings", "Vaccination / health documents", "Bank & card travel notes", "Emergency contacts", "Offline maps downloaded"];

function TravelChecklistTool() {
  return <Checklist initial={TRAVEL_DOCS} persistKey="toolora:travel-checklist" exportName="travel-checklist.txt" addLabel="Add item" placeholder="Add a checklist item…" />;
}

function TripCountdownTool() {
  return (
    <Calc
      button="Count down"
      fields={[{ key: "dep", label: "Departure date", type: "date", def: todayYmd(), required: true }]}
      compute={(v) => {
        const dep = parseYmd(v.dep ?? "");
        if (!dep) return { error: "Enter a valid departure date." };
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const target = new Date(dep.getFullYear(), dep.getMonth(), dep.getDate());
        const days = Math.round((target.getTime() - today.getTime()) / 86400000);
        if (days < 0) return { rows: [["Status", `Departed ${Math.abs(days)} days ago`]] };
        if (days === 0) return { rows: [["Status", "You leave today — safe travels!"]], note: "Final check: documents, chargers, medications, day bag." };
        const weekends = Math.floor(days / 7);
        const nudge = days <= 3 ? "Pack now: documents, chargers, medications, day bag." : days <= 14 ? "Good time to confirm bookings and start a packing list." : "Plenty of time — check passport expiry and visa rules first.";
        return {
          rows: [
            ["Days left", String(days)],
            ["Weeks left", (days / 7).toFixed(1)],
            ["Weekends left", String(weekends)],
            ["Departs", target.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })],
          ],
          note: nudge,
        };
      }}
    />
  );
}

function RoadTripTool() {
  return (
    <Gen
      button="Plan road trip"
      fileName="road-trip-plan.txt"
      outLabel="Your leg plan (downloadable)"
      fields={[
        { key: "total", label: "Total distance (km)", type: "number", def: "800", required: true },
        { key: "stops", label: "Stops (one per line, in order)", type: "textarea", def: "Springfield\nRiverton\nLakeside" },
        { key: "cons", label: "Consumption (L/100 km)", type: "number", def: "7" },
        { key: "price", label: "Fuel price (per litre)", type: "number", def: "1.6" },
      ]}
      generate={(v) => {
        const total = Number(v.total);
        const cons = Number(v.cons ?? "7");
        const price = Number(v.price ?? "1.6");
        if (!(total > 0) || !(cons > 0) || !(price >= 0)) return { error: "Distance and consumption must be positive; price non-negative." };
        const stops = linesOf(v.stops ?? "");
        if (stops.length === 0) return { error: "Enter at least one stop." };
        const legs = stops.length + 1;
        const per = total / legs;
        const litres = (total * cons) / 100;
        const out = [
          `ROAD TRIP PLAN — ${total} km, ${legs} legs of ≈${per.toFixed(0)} km`,
          "",
          ...stops.map((s, i) => `Leg ${i + 1}: drive ≈${per.toFixed(0)} km → ${s} (rest, refuel check)`),
          `Leg ${legs}: drive ≈${per.toFixed(0)} km → destination`,
          "",
          `Fuel: ≈${litres.toFixed(1)} L ≈ ${(litres * price).toFixed(2)} at ${price}/L.`,
          "Tip: plan a 15-minute break every 2 hours; check tyre pressure and oil before leaving.",
          "Planning estimate only.",
        ];
        return out.join("\n");
      }}
    />
  );
}

function SpeedDistTimeTool() {
  return (
    <Calc
      button="Solve"
      fields={[
        { key: "solve", label: "Solve for", type: "select", options: [{ value: "speed", label: "Speed" }, { value: "dist", label: "Distance" }, { value: "time", label: "Time" }], def: "speed" },
        { key: "d", label: "Distance (km)", type: "number", def: "120" },
        { key: "t", label: "Time (hours)", type: "number", def: "2" },
        { key: "s", label: "Speed (km/h)", type: "number", def: "60" },
      ]}
      compute={(v) => {
        const d = num(v, "d") ?? 0;
        const t = num(v, "t") ?? 0;
        const s = num(v, "s") ?? 0;
        if (v.solve === "speed") {
          if (!(d >= 0) || !(t > 0)) return { error: "Need distance ≥ 0 and time > 0." };
          return { rows: [["Speed", `${(d / t).toFixed(2)} km/h`], ["In mph", `${(d / t / 1.609344).toFixed(2)} mph`]] };
        }
        if (v.solve === "dist") {
          if (!(s >= 0) || !(t >= 0)) return { error: "Need speed and time ≥ 0." };
          return { rows: [["Distance", `${(s * t).toFixed(2)} km`], ["In miles", `${((s * t) * 0.621371).toFixed(2)} mi`]] };
        }
        if (!(s > 0) || !(d >= 0)) return { error: "Need speed > 0 and distance ≥ 0." };
        return { rows: [["Time", fmtDur((d / s) * 60)], ["Decimal", `${(d / s).toFixed(2)} h`]] };
      }}
    />
  );
}

function GasMileageTool() {
  return (
    <Calc
      fields={[
        { key: "mi", label: "Miles driven", type: "number", def: "300", required: true },
        { key: "gal", label: "Gallons used", type: "number", def: "10", required: true },
        { key: "p", label: "Fuel price (per gallon, optional)", type: "number", def: "3.5" },
      ]}
      compute={(v) => {
        const mi = req(v, "mi", "Miles driven");
        if (typeof mi !== "number") return mi;
        const gal = req(v, "gal", "Gallons used");
        if (typeof gal !== "number") return gal;
        const p = num(v, "p") ?? 0;
        if (mi < 0 || gal <= 0 || p < 0) return { error: "Gallons must be positive; miles and price non-negative." };
        const mpg = mi / gal;
        const rows: [string, string][] = [
          ["MPG", mpg.toFixed(2)],
          ["L/100 km", (235.214 / mpg).toFixed(2)],
        ];
        if (p > 0) rows.push(["Cost / mile", (p / mpg).toFixed(3)]);
        return { rows };
      }}
    />
  );
}

function OdometerTool() {
  return (
    <Calc
      fields={[
        { key: "a", label: "Start reading", type: "number", def: "12000", required: true },
        { key: "b", label: "End reading", type: "number", def: "12350", required: true },
        { key: "days", label: "Days (optional)", type: "number", def: "5" },
      ]}
      compute={(v) => {
        const a = req(v, "a", "Start reading");
        if (typeof a !== "number") return a;
        const b = req(v, "b", "End reading");
        if (typeof b !== "number") return b;
        const days = num(v, "days") ?? 0;
        if (b < a) return { error: "End reading cannot be below the start reading." };
        const rows: [string, string][] = [["Trip distance", `${(b - a).toLocaleString()} (same unit as odometer)`]];
        if (days > 0) rows.push(["Average / day", `${((b - a) / days).toFixed(1)} /day`]);
        return { rows };
      }}
    />
  );
}

function ExpenseSplitterTool() {
  return (
    <Calc
      fields={[
        { key: "total", label: "Total trip spend", type: "number", def: "1200", required: true },
        { key: "n", label: "Travellers", type: "number", def: "4", required: true },
        { key: "tip", label: "Tip / fee (%)", type: "number", def: "10" },
      ]}
      compute={(v) => {
        const total = req(v, "total", "Total trip spend");
        if (typeof total !== "number") return total;
        const n = req(v, "n", "Travellers");
        if (typeof n !== "number") return n;
        const tip = num(v, "tip") ?? 0;
        if (total < 0 || !Number.isInteger(n) || n < 1 || tip < 0 || tip > 100) return { error: "Check: total non-negative, travellers a whole number ≥ 1, tip 0–100%." };
        const grand = total * (1 + tip / 100);
        return {
          rows: [
            ["Each pays", (grand / n).toFixed(2)],
            ["Grand total", grand.toFixed(2)],
            ["Tip / fee", (grand - total).toFixed(2)],
          ],
          note: "Friends-and-family estimate — service charges may already be included in bills.",
        };
      }}
    />
  );
}

/* ================= RANDOM (14) ================= */

function RandomIntTool() {
  const [mn, setMn] = useState("1");
  const [mx, setMx] = useState("100");
  const [error, setError] = useState("");
  const [last, setLast] = useState<number | null>(null);
  const h = useHistory();
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="ri-min">Min</FieldLabel>
          <Input id="ri-min" inputMode="numeric" value={mn} onChange={(e) => setMn(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="ri-max">Max</FieldLabel>
          <Input id="ri-max" inputMode="numeric" value={mx} onChange={(e) => setMx(e.target.value)} />
        </div>
      </div>
      <div className="mt-3">
        <Button type="button" onClick={() => {
          const a = Number(mn);
          const b = Number(mx);
          if (!Number.isInteger(a) || !Number.isInteger(b)) {
            setError("Min and max must be whole numbers.");
            return;
          }
          setError("");
          const r = randomInt(a, b);
          setLast(r.value);
          h.push(String(r.value), r.secure);
        }}>Draw integer</Button>
      </div>
      <Err message={error} />
      {last !== null && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
          <p className="text-4xl font-extrabold text-(--foreground) tabular-nums">{last}</p>
        </div>
      )}
      <HistoryBlock history={h.history} secure={h.secure} onClear={h.clear} fileName="random-integers.txt" />
    </div>
  );
}

function RandomDecimalTool() {
  const [mn, setMn] = useState("0");
  const [mx, setMx] = useState("1");
  const [dp, setDp] = useState("2");
  const [error, setError] = useState("");
  const [last, setLast] = useState<string | null>(null);
  const h = useHistory();
  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <FieldLabel htmlFor="rd-min">Min</FieldLabel>
          <Input id="rd-min" inputMode="decimal" value={mn} onChange={(e) => setMn(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="rd-max">Max</FieldLabel>
          <Input id="rd-max" inputMode="decimal" value={mx} onChange={(e) => setMx(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="rd-dp">Decimals</FieldLabel>
          <Input id="rd-dp" inputMode="numeric" value={dp} onChange={(e) => setDp(e.target.value)} />
        </div>
      </div>
      <div className="mt-3">
        <Button type="button" onClick={() => {
          const a = Number(mn);
          const b = Number(mx);
          const d = Number(dp);
          if (!Number.isFinite(a) || !Number.isFinite(b)) {
            setError("Enter a valid range.");
            return;
          }
          if (!Number.isInteger(d) || d < 0 || d > 10) {
            setError("Decimals must be 0–10.");
            return;
          }
          setError("");
          const scale = 10 ** d;
          const r = randomInt(Math.ceil(Math.min(a, b) * scale), Math.floor(Math.max(a, b) * scale));
          const val = (r.value / scale).toFixed(d);
          setLast(val);
          h.push(val, r.secure);
        }}>Draw decimal</Button>
      </div>
      <Err message={error} />
      {last !== null && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
          <p className="text-4xl font-extrabold text-(--foreground) tabular-nums">{last}</p>
        </div>
      )}
      <HistoryBlock history={h.history} secure={h.secure} onClear={h.clear} fileName="random-decimals.txt" />
    </div>
  );
}

function RandomChoiceTool() {
  const [opts, setOpts] = useState("Red\nGreen\nBlue");
  const [error, setError] = useState("");
  const [pick, setPick] = useState<string | null>(null);
  const h = useHistory();
  return (
    <div>
      <FieldLabel htmlFor="rc-opts">Options (one per line)</FieldLabel>
      <Textarea id="rc-opts" value={opts} onChange={(e) => setOpts(e.target.value)} />
      <div className="mt-3">
        <Button type="button" onClick={() => {
          const list = linesOf(opts);
          if (list.length === 0) {
            setError("Enter at least one option.");
            return;
          }
          setError("");
          const r = randomInt(0, list.length - 1);
          const val = list[r.value] as string;
          setPick(val);
          h.push(val, r.secure);
        }}>Pick one</Button>
      </div>
      <Err message={error} />
      {pick !== null && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
          <p className="text-2xl font-extrabold text-(--foreground)">{pick}</p>
        </div>
      )}
      <HistoryBlock history={h.history} secure={h.secure} onClear={h.clear} fileName="random-choices.txt" />
    </div>
  );
}

const FIRST = ["Ava", "Liam", "Mia", "Noah", "Emma", "Lucas", "Sofia", "Mateo", "Zoe", "Kai", "Ruby", "Felix", "Nora", "Hugo", "Ivy", "Omar", "Lena", "Yuki", "Marco", "Priya"];
const LAST = ["Smith", "Garcia", "Kim", "Patel", "Muller", "Rossi", "Dubois", "Tanaka", "Silva", "Novak", "Haddad", "Okafor", "Larsen", "Costa", "Weber", "Ali", "Brown", "Khan", "Moreau", "Sato"];

function RandomNameTool() {
  const [extra, setExtra] = useState("");
  const [count, setCount] = useState("1");
  const [error, setError] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const h = useHistory();
  return (
    <div>
      <FieldLabel htmlFor="rn-extra">Your own names to mix in (optional, one per line)</FieldLabel>
      <Textarea id="rn-extra" value={extra} onChange={(e) => setExtra(e.target.value)} />
      <div className="mt-3 max-w-[200px]">
        <FieldLabel htmlFor="rn-n">How many</FieldLabel>
        <Input id="rn-n" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
      </div>
      <div className="mt-3">
        <Button type="button" onClick={() => {
          const n = Number(count);
          if (!Number.isInteger(n) || n < 1 || n > 20) {
            setError("Count must be 1–20.");
            return;
          }
          setError("");
          const custom = linesOf(extra);
          const out: string[] = [];
          let sec = true;
          for (let i = 0; i < n; i++) {
            if (custom.length > 0) {
              const r = randomInt(0, custom.length - 1);
              if (!r.secure) sec = false;
              out.push(custom[r.value] as string);
            } else {
              const rf = randomInt(0, FIRST.length - 1);
              const rl = randomInt(0, LAST.length - 1);
              if (!rf.secure || !rl.secure) sec = false;
              out.push(`${FIRST[rf.value]} ${LAST[rl.value]}`);
            }
          }
          setNames(out);
          h.push(out.join(", "), sec);
        }}>Generate</Button>
      </div>
      <Err message={error} />
      {names.length > 0 && (
        <ul className="mt-4 divide-y divide-(--border) rounded-xl border border-(--border)" aria-live="polite">
          {names.map((x, i) => <li key={i} className="px-4 py-2 font-semibold text-(--foreground)">{x}</li>)}
        </ul>
      )}
      <HistoryBlock history={h.history} secure={h.secure} onClear={h.clear} fileName="random-names.txt" />
    </div>
  );
}

function RandomDateTool() {
  const [from, setFrom] = useState("2025-01-01");
  const [to, setTo] = useState(todayYmd());
  const [error, setError] = useState("");
  const [last, setLast] = useState<string | null>(null);
  const h = useHistory();
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="rdt-from">Start</FieldLabel>
          <Input id="rdt-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="rdt-to">End</FieldLabel>
          <Input id="rdt-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <div className="mt-3">
        <Button type="button" onClick={() => {
          const a = parseYmd(from);
          const b = parseYmd(to);
          if (!a || !b) {
            setError("Enter two valid dates.");
            return;
          }
          const lo = Math.min(a.getTime(), b.getTime());
          const hi = Math.max(a.getTime(), b.getTime());
          const loD = Math.floor(lo / 86400000);
          const hiD = Math.floor(hi / 86400000);
          if (hiD - loD > 36500) {
            setError("Range is too large (max ~100 years).");
            return;
          }
          setError("");
          const r = randomInt(loD, hiD);
          const d = new Date(r.value * 86400000);
          const label = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")} (${d.toLocaleDateString(undefined, { weekday: "long", timeZone: "UTC" })})`;
          setLast(label);
          h.push(label, r.secure);
        }}>Draw date</Button>
      </div>
      <Err message={error} />
      {last !== null && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
          <p className="text-2xl font-extrabold text-(--foreground)">{last}</p>
        </div>
      )}
      <HistoryBlock history={h.history} secure={h.secure} onClear={h.clear} fileName="random-dates.txt" />
    </div>
  );
}

function RandomTimeTool() {
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("17:00");
  const [error, setError] = useState("");
  const [last, setLast] = useState<string | null>(null);
  const h = useHistory();
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="rt-from">Earliest (HH:MM)</FieldLabel>
          <Input id="rt-from" type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="rt-to">Latest (HH:MM)</FieldLabel>
          <Input id="rt-to" type="time" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <div className="mt-3">
        <Button type="button" onClick={() => {
          const a = parseHm(from);
          const b = parseHm(to);
          if (a === null || b === null) {
            setError("Enter valid start and end times.");
            return;
          }
          setError("");
          const r = randomInt(Math.min(a, b), Math.max(a, b));
          const val = fmtHm(r.value);
          setLast(val);
          h.push(val, r.secure);
        }}>Draw time</Button>
      </div>
      <Err message={error} />
      {last !== null && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
          <p className="text-4xl font-extrabold text-(--foreground) tabular-nums">{last}</p>
        </div>
      )}
      <HistoryBlock history={h.history} secure={h.secure} onClear={h.clear} fileName="random-times.txt" />
    </div>
  );
}

const EMOJIS = ["😀", "😎", "🎉", "🚀", "🌈", "🍕", "⚽", "🎸", "🐱", "🐶", "🦄", "🐝", "🌵", "🍩", "☕", "🎧", "📚", "✈️", "🏖️", "⛰️", "🌙", "⭐", "🔥", "💧", "🎨", "🤖", "👾", "🎲", "🏆", "💡", "🔑", "🧲", "🎁", "🪴", "🍀", "🌊", "❄️", "🌸", "🍉", "🥑", "🧀", "🍫", "⚡", "🎯", "🧭", "🪂", "🏕️", "🛶"];

function RandomEmojiTool() {
  const [count, setCount] = useState("1");
  const [error, setError] = useState("");
  const [last, setLast] = useState<string | null>(null);
  const h = useHistory();
  return (
    <div>
      <div className="max-w-[200px]">
        <FieldLabel htmlFor="re-n">How many (1–10)</FieldLabel>
        <Input id="re-n" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
      </div>
      <div className="mt-3">
        <Button type="button" onClick={() => {
          const n = Number(count);
          if (!Number.isInteger(n) || n < 1 || n > 10) {
            setError("Count must be 1–10.");
            return;
          }
          setError("");
          const out: string[] = [];
          let sec = true;
          for (let i = 0; i < n; i++) {
            const r = randomInt(0, EMOJIS.length - 1);
            if (!r.secure) sec = false;
            out.push(EMOJIS[r.value] as string);
          }
          const val = out.join(" ");
          setLast(val);
          h.push(val, sec);
        }}>Draw emoji</Button>
      </div>
      <Err message={error} />
      {last !== null && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
          <p className="text-4xl">{last}</p>
        </div>
      )}
      <Note>Curated list of {EMOJIS.length} emoji.</Note>
      <HistoryBlock history={h.history} secure={h.secure} onClear={h.clear} fileName="random-emoji.txt" />
    </div>
  );
}

function RandomLetterTool() {
  const [mode, setMode] = useState("mixed");
  const [count, setCount] = useState("5");
  const [error, setError] = useState("");
  const [last, setLast] = useState<string | null>(null);
  const h = useHistory();
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="rl-case">Case</FieldLabel>
          <select id="rl-case" value={mode} onChange={(e) => setMode(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px]">
            <option value="upper">UPPER</option>
            <option value="lower">lower</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="rl-n">Count (1–50)</FieldLabel>
          <Input id="rl-n" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
        </div>
      </div>
      <div className="mt-3">
        <Button type="button" onClick={() => {
          const n = Number(count);
          if (!Number.isInteger(n) || n < 1 || n > 50) {
            setError("Count must be 1–50.");
            return;
          }
          setError("");
          const pool = mode === "upper" ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : mode === "lower" ? "abcdefghijklmnopqrstuvwxyz" : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
          let out = "";
          let sec = true;
          for (let i = 0; i < n; i++) {
            const r = randomInt(0, pool.length - 1);
            if (!r.secure) sec = false;
            out += pool[r.value];
          }
          setLast(out);
          h.push(out, sec);
        }}>Generate</Button>
      </div>
      <Err message={error} />
      {last !== null && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
          <p className="text-3xl font-extrabold tracking-widest text-(--foreground)">{last}</p>
        </div>
      )}
      <HistoryBlock history={h.history} secure={h.secure} onClear={h.clear} fileName="random-letters.txt" />
    </div>
  );
}

const HEX = "0123456789abcdef";

function RandomHexTool() {
  const [len, setLen] = useState("8");
  const [error, setError] = useState("");
  const [last, setLast] = useState<string | null>(null);
  const [copied, copy] = useCopied();
  const h = useHistory();
  return (
    <div>
      <div className="max-w-[200px]">
        <FieldLabel htmlFor="rh-n">Length (1–256)</FieldLabel>
        <Input id="rh-n" inputMode="numeric" value={len} onChange={(e) => setLen(e.target.value)} />
      </div>
      <div className="mt-3">
        <Button type="button" onClick={() => {
          const n = Number(len);
          if (!Number.isInteger(n) || n < 1 || n > 256) {
            setError("Length must be 1–256.");
            return;
          }
          setError("");
          let out = "";
          let sec = true;
          for (let i = 0; i < n; i++) {
            const r = randomInt(0, 15);
            if (!r.secure) sec = false;
            out += HEX[r.value];
          }
          setLast(out);
          h.push(out, sec);
        }}>Generate hex</Button>
      </div>
      <Err message={error} />
      {last !== null && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
          <p className="break-all font-mono text-xl font-bold text-(--foreground)">{last}</p>
          <div className="mt-2">
            <Button type="button" variant="secondary" onClick={() => copy(last)}>{copied ? "Copied!" : "Copy"}</Button>
          </div>
        </div>
      )}
      <Note>For colours, IDs and test fixtures — not for secrets or passwords.</Note>
      <HistoryBlock history={h.history} secure={h.secure} onClear={h.clear} fileName="random-hex.txt" />
    </div>
  );
}

function LotteryTool() {
  const [count, setCount] = useState("6");
  const [max, setMax] = useState("49");
  const [error, setError] = useState("");
  const [last, setLast] = useState<number[] | null>(null);
  const h = useHistory();
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="lo-n">Numbers drawn</FieldLabel>
          <Input id="lo-n" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="lo-max">Highest number</FieldLabel>
          <Input id="lo-max" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} />
        </div>
      </div>
      <div className="mt-3">
        <Button type="button" onClick={() => {
          const n = Number(count);
          const m = Number(max);
          if (!Number.isInteger(n) || !Number.isInteger(m) || n < 1 || m < 1 || n > m) {
            setError("Need whole numbers with count ≤ max.");
            return;
          }
          if (m > 1000 || n > 100) {
            setError("Keep max ≤ 1000 and count ≤ 100.");
            return;
          }
          setError("");
          const pool = Array.from({ length: m }, (_, i) => i + 1);
          const { out, secure } = shuffle(pool);
          const draw = out.slice(0, n).sort((a, b) => a - b);
          setLast(draw);
          h.push(draw.join(" – "), secure);
        }}>Draw numbers</Button>
      </div>
      <Err message={error} />
      {last !== null && (
        <div className="mt-4 flex flex-wrap justify-center gap-2" aria-live="polite">
          {last.map((x) => (
            <span key={x} className="grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-lg font-extrabold text-white tabular-nums">{x}</span>
          ))}
        </div>
      )}
      <Note>For fun — no system improves lottery odds.</Note>
      <HistoryBlock history={h.history} secure={h.secure} onClear={h.clear} fileName="lottery-draws.txt" />
    </div>
  );
}

const QUOTES = ["Small steps every day beat big plans someday.", "Done is a great place to start.", "Make the bed, then make progress.", "Tidy space, steady mind.", "One focused hour beats three distracted ones.", "Drink water before the second coffee.", "Write it down or it did not happen.", "Stretch for five minutes — future you says thanks.", "Finish one small task completely.", "Pack the bag the night before.", "A short walk resets a long day.", "Learn one thing on purpose today.", "Call the person you keep meaning to call.", "Save a little from every paycheck.", "Compare prices, not packaging.", "Cook once, eat twice.", "Leave ten minutes earlier than feels necessary.", "Check the forecast, then check it again.", "Smile at the delay — it is break time in disguise.", "Review the week every Sunday evening.", "Backup the file before you need it.", "Ask the question; someone else wonders too.", "Keep cables, keys and kindness untangled.", "Celebrate the streak, forgive the slip."];

function RandomQuoteTool() {
  const [last, setLast] = useState<string | null>(null);
  const [copied, copy] = useCopied();
  const h = useHistory();
  return (
    <div>
      <Button type="button" onClick={() => {
        const r = randomInt(0, QUOTES.length - 1);
        const q = QUOTES[r.value] as string;
        setLast(q);
        h.push(q, r.secure);
      }}>Draw quote</Button>
      {last !== null && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
          <p className="text-xl font-bold text-(--foreground)">“{last}”</p>
          <div className="mt-2">
            <Button type="button" variant="secondary" onClick={() => copy(last)}>{copied ? "Copied!" : "Copy quote"}</Button>
          </div>
        </div>
      )}
      <Note>Original Toolora-written motivational lines ({QUOTES.length} in the bank).</Note>
      <HistoryBlock history={h.history} secure={h.secure} onClear={h.clear} fileName="quotes.txt" />
    </div>
  );
}

function RandomGroupTool() {
  const [names, setNames] = useState("Ava\nLiam\nMia\nNoah\nEmma\nLucas\nSofia\nMateo");
  const [size, setSize] = useState("3");
  const [error, setError] = useState("");
  const [groups, setGroups] = useState<string[][] | null>(null);
  const [copied, copy] = useCopied();
  return (
    <div>
      <FieldLabel htmlFor="rg-names">Names (one per line)</FieldLabel>
      <Textarea id="rg-names" value={names} onChange={(e) => setNames(e.target.value)} />
      <div className="mt-3 max-w-[200px]">
        <FieldLabel htmlFor="rg-size">Group size</FieldLabel>
        <Input id="rg-size" inputMode="numeric" value={size} onChange={(e) => setSize(e.target.value)} />
      </div>
      <div className="mt-3">
        <Button type="button" onClick={() => {
          const list = linesOf(names);
          const n = Number(size);
          if (list.length < 2) {
            setError("Enter at least two names.");
            return;
          }
          if (!Number.isInteger(n) || n < 2 || n > list.length) {
            setError("Group size must be 2 or more and no more than the name count.");
            return;
          }
          setError("");
          const { out } = shuffle(list);
          const g: string[][] = [];
          for (let i = 0; i < out.length; i += n) g.push(out.slice(i, i + n));
          setGroups(g);
        }}>Make groups</Button>
      </div>
      <Err message={error} />
      {groups && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-live="polite">
          {groups.map((g, i) => (
            <div key={i} className="rounded-xl border border-(--border) p-3">
              <p className="font-bold text-(--foreground)">Group {i + 1}</p>
              <ul className="mt-1 text-sm text-(--muted)">{g.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
      {groups && <div className="mt-3"><Button type="button" variant="secondary" onClick={() => copy(groups.map((g, i) => `Group ${i + 1}: ${g.join(", ")}`).join("\n"))}>{copied ? "Copied!" : "Copy groups"}</Button></div>}
      <Note>Shuffled with cryptographic randomness; the last group may be smaller.</Note>
    </div>
  );
}

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const FULL_DECK = SUITS.flatMap((s) => RANKS.map((r) => `${r}${s}`));

function RandomCardTool() {
  const [norepeat, setNorepeat] = useState(true);
  const [left, setLeft] = useState<string[]>(() => [...FULL_DECK]);
  const [last, setLast] = useState<string | null>(null);
  const h = useHistory();
  return (
    <div>
      <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[15px] font-medium">
        <input type="checkbox" checked={norepeat} onChange={(e) => {
          setNorepeat(e.target.checked);
          setLeft([...FULL_DECK]);
        }} className="h-5 w-5 accent-indigo-600" />
        No repeats until the deck runs out
      </label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={() => {
          if (norepeat) {
            const pool = left.length === 0 ? [...FULL_DECK] : left;
            const r = randomInt(0, pool.length - 1);
            const card = pool[r.value] as string;
            setLeft(pool.filter((_, i) => i !== r.value));
            setLast(card);
            h.push(card, r.secure);
          } else {
            const r = randomInt(0, FULL_DECK.length - 1);
            const card = FULL_DECK[r.value] as string;
            setLast(card);
            h.push(card, r.secure);
          }
        }}>Draw card</Button>
        <Button type="button" variant="secondary" onClick={() => {
          setLeft([...FULL_DECK]);
          setLast(null);
        }}>Reshuffle</Button>
      </div>
      {last !== null && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
          <p className={`text-5xl font-extrabold ${last.includes("♥") || last.includes("♦") ? "text-red-600" : "text-(--foreground)"}`}>{last}</p>
          {norepeat && <p className="mt-1 text-sm text-(--muted)">{left.length} cards left in deck</p>}
        </div>
      )}
      <HistoryBlock history={h.history} secure={h.secure} onClear={h.clear} fileName="card-draws.txt" />
    </div>
  );
}

const COUNTRIES = ["Argentina", "Australia", "Brazil", "Canada", "Chile", "China", "Colombia", "Croatia", "Denmark", "Egypt", "Ethiopia", "Finland", "France", "Germany", "Greece", "India", "Indonesia", "Ireland", "Italy", "Japan", "Kenya", "Malaysia", "Mexico", "Morocco", "Netherlands", "New Zealand", "Nigeria", "Norway", "Peru", "Poland", "Portugal", "South Africa", "South Korea", "Spain", "Sweden", "Thailand", "Turkey", "United Kingdom", "United States", "Vietnam"];

function RandomCountryTool() {
  const [last, setLast] = useState<string | null>(null);
  const h = useHistory();
  return (
    <div>
      <Button type="button" onClick={() => {
        const r = randomInt(0, COUNTRIES.length - 1);
        const c = COUNTRIES[r.value] as string;
        setLast(c);
        h.push(c, r.secure);
      }}>Draw country</Button>
      {last !== null && (
        <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
          <p className="text-3xl font-extrabold text-(--foreground)">{last}</p>
        </div>
      )}
      <Note>Curated list of {COUNTRIES.length} countries — handy for quizzes, travel inspiration and games.</Note>
      <HistoryBlock history={h.history} secure={h.secure} onClear={h.clear} fileName="country-draws.txt" />
    </div>
  );
}
