"use client";

import { Calc, RefTable, TextOp, Units, num, req } from "../kits/kits";
import type { UnitDef } from "../kits/kits";

export const calcplusRegistry: Record<string, React.ComponentType> = {
  "basic-calculator": BasicCalculatorTool,
  "scientific-calculator": ScientificCalculatorTool,
  "percentage-increase-calculator": PercentageIncreaseTool,
  "percentage-decrease-calculator": PercentageDecreaseTool,
  "tax-calculator": TaxTool,
  "split-bill-calculator": SplitBillTool,
  "markup-calculator": MarkupTool,
  "proportion-calculator": ProportionTool,
  "mean-calculator": MeanTool,
  "median-calculator": MedianTool,
  "mode-calculator": ModeTool,
  "range-calculator": RangeTool,
  "stddev-calculator": StddevTool,
  "variance-calculator": VarianceTool,
  "weighted-average-calculator": WeightedAverageTool,
  "mixed-fraction-calculator": MixedFractionTool,
  "decimal-to-fraction": DecimalToFractionTool,
  "fraction-to-decimal": FractionToDecimalTool,
  "lcm-calculator": LcmTool,
  "gcd-calculator": GcdTool,
  "prime-checker": PrimeCheckerTool,
  "prime-factorization": PrimeFactorizationTool,
  "factorial-calculator": FactorialTool,
  "exponent-calculator": ExponentTool,
  "square-root-calculator": SquareRootTool,
  "cube-root-calculator": CubeRootTool,
  "logarithm-calculator": LogarithmTool,
  "power-calculator": PowerTool,
  "scientific-notation-calculator": ScientificNotationTool,
  "quadratic-solver": QuadraticSolverTool,
  "linear-equation-solver": LinearEquationTool,
  "triangle-calculator": TriangleTool,
  "circle-calculator": CircleTool,
  "rectangle-calculator": RectangleTool,
  "square-calculator": SquareTool,
  "trapezoid-calculator": TrapezoidTool,
  "polygon-calculator": PolygonTool,
  "pythagorean-theorem": PythagoreanTool,
  "area-calculator": AreaTool,
  "volume-calculator": VolumeTool,
  "surface-area-calculator": SurfaceAreaTool,
  "speed-calculator": SpeedTool,
  "distance-calculator": DistanceTool,
  "pressure-converter": PressureConverterTool,
  "energy-converter": EnergyConverterTool,
  "power-converter": PowerConverterTool,
  "force-converter": ForceConverterTool,
  "frequency-converter": FrequencyConverterTool,
  "angle-converter": AngleConverterTool,
  "fuel-economy-converter": FuelEconomyConverterTool,
  "density-converter": DensityConverterTool,
  "cooking-converter": CookingConverterTool,
  "shoe-size-converter": ShoeSizeConverterTool,
  "clothing-size-converter": ClothingSizeConverterTool,
  "ring-size-converter": RingSizeConverterTool,
  "paper-size-converter": PaperSizeConverterTool,
  "digital-speed-converter": DigitalSpeedConverterTool,
  "number-base-pro": NumberBaseProTool,
  "ohms-law-calculator": OhmsLawTool,
  "voltage-calculator": VoltageTool,
  "current-calculator": CurrentTool,
  "resistance-calculator": ResistanceTool,
  "power-electric-calculator": PowerElectricTool,
  "energy-calculator": EnergyScienceTool,
  "frequency-calculator": FrequencyScienceTool,
  "wavelength-calculator": WavelengthTool,
  "wave-speed-calculator": WaveSpeedTool,
  "force-calculator": ForceScienceTool,
  "pressure-science-calculator": PressureScienceTool,
  "density-science-calculator": DensityScienceTool,
  "engineering-notation-converter": EngineeringNotationTool,
};

/* ---------- shared math helpers (no eval anywhere) ---------- */

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "Not a finite number";
  if (n === 0) return "0";
  const a = Math.abs(n);
  if (a >= 1e15 || a < 1e-6) return n.toExponential(4).replace(/\.?0+e/, "e");
  return String(Number(n.toPrecision(10)));
}

function parseList(s: string): number[] | null {
  const parts = s.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const out: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isFinite(n)) return null;
    out.push(n);
  }
  return out;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/** Safe expression parser (recursive descent): + - * / % ^, parentheses, % suffix, sqrt/sin/cos/tan/log/ln/abs/exp, pi/e. */
function evalExpression(src: string, degrees = false): number {
  const s = src.trim();
  let i = 0;
  if (!s) throw new Error("Enter an expression, e.g. (2 + 3) * 4^2.");
  if (s.length > 500) throw new Error("Expression is too long (max 500 characters).");
  if (!/^[0-9+\-*/^%().,\sA-Za-z]+$/.test(s)) throw new Error("Only numbers, + − * / ^ % ( ) and sqrt/sin/cos/tan/log/ln/abs/exp allowed.");
  const skip = () => {
    while (s[i] === " " || s[i] === "\t") i++;
  };
  const toRad = (x: number) => (degrees ? (x * Math.PI) / 180 : x);
  function applyFn(name: string, x: number): number {
    switch (name) {
      case "sqrt":
        if (x < 0) throw new Error("sqrt needs x ≥ 0 for a real result.");
        return Math.sqrt(x);
      case "sin":
        return Math.sin(toRad(x));
      case "cos":
        return Math.cos(toRad(x));
      case "tan": {
        const c = Math.cos(toRad(x));
        if (Math.abs(c) < 1e-15) throw new Error("tan is undefined at this angle.");
        return Math.tan(toRad(x));
      }
      case "log":
        if (x <= 0) throw new Error("log needs x > 0 (base 10).");
        return Math.log10(x);
      case "ln":
        if (x <= 0) throw new Error("ln needs x > 0.");
        return Math.log(x);
      case "abs":
        return Math.abs(x);
      case "exp":
        return Math.exp(x);
      default:
        throw new Error(`Unknown function "${name}". Try sqrt, sin, cos, tan, log, ln, abs, exp.`);
    }
  }
  function parseExpr(): number {
    let v = parseTerm();
    for (;;) {
      skip();
      if (s[i] === "+") {
        i++;
        v += parseTerm();
      } else if (s[i] === "-") {
        i++;
        v -= parseTerm();
      } else return v;
    }
  }
  function parseTerm(): number {
    let v = parseFactor();
    for (;;) {
      skip();
      if (s[i] === "*") {
        i++;
        v *= parseFactor();
      } else if (s[i] === "/") {
        i++;
        const d = parseFactor();
        if (d === 0) throw new Error("Division by zero.");
        v /= d;
      } else if (s[i] === "%") {
        i++;
        const d = parseFactor();
        if (d === 0) throw new Error("Modulo by zero.");
        v %= d;
      } else return v;
    }
  }
  function parseFactor(): number {
    const base = parseUnary();
    skip();
    if (s[i] === "^") {
      i++;
      const e = parseFactor();
      const r = Math.pow(base, e);
      if (!Number.isFinite(r)) throw new Error("Result is out of range.");
      return r;
    }
    return base;
  }
  function parseUnary(): number {
    skip();
    if (s[i] === "-") {
      i++;
      return -parseUnary();
    }
    if (s[i] === "+") {
      i++;
      return parseUnary();
    }
    return parsePrimary();
  }
  function parsePrimary(): number {
    skip();
    if (s[i] === "(") {
      i++;
      const v = parseExpr();
      skip();
      if (s[i] !== ")") throw new Error("Missing closing parenthesis.");
      i++;
      return v;
    }
    if (s[i] !== undefined && /[A-Za-z]/.test(s[i])) {
      let name = "";
      while (s[i] !== undefined && /[A-Za-z]/.test(s[i])) name += s[i++];
      const low = name.toLowerCase();
      if (low === "pi") return Math.PI;
      if (low === "e") return Math.E;
      skip();
      if (s[i] !== "(") throw new Error(`Function "${name}" needs parentheses, e.g. ${name}(x).`);
      i++;
      const arg = parseExpr();
      skip();
      if (s[i] !== ")") throw new Error("Missing closing parenthesis.");
      i++;
      return applyFn(low, arg);
    }
    let digits = "";
    let dot = false;
    while (s[i] !== undefined && (/[0-9]/.test(s[i]) || (s[i] === "." && !dot))) {
      if (s[i] === ".") dot = true;
      digits += s[i++];
    }
    if (digits === "" || digits === ".") throw new Error("Could not parse the expression — check operators and parentheses.");
    skip();
    let v = Number(digits);
    if (s[i] === "%" && (i + 1 >= s.length || /[+\-*/^)\s]/.test(s[i + 1]))) {
      i++;
      v = v / 100;
    }
    return v;
  }
  const v = parseExpr();
  skip();
  if (i < s.length) throw new Error(`Unexpected character "${s[i]}".`);
  if (!Number.isFinite(v)) throw new Error("Result is out of range.");
  return v;
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  const zero = BigInt(0);
  const one = BigInt(1);
  const two = BigInt(2);
  let r = one;
  let b = base % mod;
  let e = exp;
  while (e > zero) {
    if (e % two === one) r = (r * b) % mod;
    b = (b * b) % mod;
    e = e / two;
  }
  return r;
}

/** Deterministic Miller-Rabin for n < 2^64 (bases 2,325,9375,28178,450775,9780504,1795265022). */
function isPrimeBig(n: bigint): boolean {
  const zero = BigInt(0);
  const one = BigInt(1);
  const two = BigInt(2);
  if (n < two) return false;
  const small = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37].map(BigInt);
  for (const p of small) {
    if (n === p) return true;
    if (n % p === zero) return false;
  }
  let d = n - one;
  let r = 0;
  while (d % two === zero) {
    d = d / two;
    r++;
  }
  const bases = [2, 325, 9375, 28178, 450775, 9780504, 1795265022].map(BigInt);
  for (const a0 of bases) {
    const a = a0 % n;
    if (a === zero) continue;
    let x = modPow(a, d, n);
    if (x === one || x === n - one) continue;
    let composite = true;
    for (let j = 1; j < r; j++) {
      x = (x * x) % n;
      if (x === n - one) {
        composite = false;
        break;
      }
    }
    if (composite) return false;
  }
  return true;
}

function factorize(n: number): [number, number][] {
  const out: [number, number][] = [];
  let m = n;
  let d = 2;
  while (d * d <= m) {
    if (m % d === 0) {
      let c = 0;
      while (m % d === 0) {
        m /= d;
        c++;
      }
      out.push([d, c]);
    }
    d += d === 2 ? 1 : 2;
  }
  if (m > 1) out.push([m, 1]);
  return out;
}

function decToFrac(x: number, maxDen = 10000): [number, number] {
  if (Math.round(x) === x && Math.abs(x) < 1e15) return [x, 1];
  const neg = x < 0;
  let v = Math.abs(x);
  let h1 = 1;
  let h2 = 0;
  let k1 = 0;
  let k2 = 1;
  let prev: [number, number] = [Math.round(v), 1];
  let b = v;
  for (let it = 0; it < 64; it++) {
    const a = Math.floor(b);
    const h = a * h1 + h2;
    const k = a * k1 + k2;
    if (k > maxDen) break;
    prev = [h, k];
    if (Math.abs(h / k - v) < 1e-9) break;
    const f = b - a;
    if (f < 1e-12) break;
    b = 1 / f;
    h2 = h1;
    h1 = h;
    k2 = k1;
    k1 = k;
  }
  const g = gcd(prev[0], prev[1]) || 1;
  const r: [number, number] = [prev[0] / g, prev[1] / g];
  return neg ? [-r[0], r[1]] : r;
}

/* ---------- 1. basic calculator ---------- */

function BasicCalculatorTool() {
  return (
    <Calc
      button="Calculate"
      fields={[{ key: "expr", label: "Expression", type: "text", placeholder: "e.g. (2+3)*4^2 - 50%*200", required: true }]}
      compute={(v) => {
        try {
          const r = evalExpression(v.expr ?? "");
          return { rows: [["Result", fmt(r)]], note: "Operators: + − * / ^ % and parentheses. A trailing % means /100 (50% = 0.5). No code is ever evaluated — a safe parser does the math." };
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Could not evaluate the expression." };
        }
      }}
    />
  );
}

/* ---------- 2. scientific calculator ---------- */

function ScientificCalculatorTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "expr", label: "Expression", type: "text", placeholder: "e.g. sin(30)^2 + cos(30)^2 + sqrt(16) + log(1000)", required: true },
        { key: "ang", label: "Trig angle unit", type: "select", options: [{ value: "rad", label: "Radians" }, { value: "deg", label: "Degrees" }], def: "rad" },
      ]}
      compute={(v) => {
        try {
          const r = evalExpression(v.expr ?? "", v.ang === "deg");
          return { rows: [["Result", fmt(r)]], note: "Functions: sqrt(x) sin(x) cos(x) tan(x) log(x)=base-10 ln(x) abs(x) exp(x); constants pi, e. Trig uses " + (v.ang === "deg" ? "degrees." : "radians.") };
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Could not evaluate the expression." };
        }
      }}
    />
  );
}

/* ---------- 3-4. percentage increase / decrease ---------- */

function PercentageIncreaseTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "base", label: "Base value", type: "number", required: true },
        { key: "pct", label: "Increase %", type: "number", def: "10", required: true },
      ]}
      compute={(v) => {
        const base = req(v, "base", "Base value");
        if (typeof base !== "number") return base;
        const pct = req(v, "pct", "Increase %");
        if (typeof pct !== "number") return pct;
        const inc = (base * pct) / 100;
        return { rows: [["Increase", fmt(inc)], ["New value", fmt(base + inc)], ["Multiplier", fmt(1 + pct / 100)]], note: "New value = base × (1 + p/100)." };
      }}
    />
  );
}

function PercentageDecreaseTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "base", label: "Base value", type: "number", required: true },
        { key: "pct", label: "Decrease %", type: "number", def: "10", required: true },
      ]}
      compute={(v) => {
        const base = req(v, "base", "Base value");
        if (typeof base !== "number") return base;
        const pct = req(v, "pct", "Decrease %");
        if (typeof pct !== "number") return pct;
        const dec = (base * pct) / 100;
        return { rows: [["Decrease", fmt(dec)], ["New value", fmt(base - dec)], ["Multiplier", fmt(1 - pct / 100)]], note: "New value = base × (1 − p/100)." };
      }}
    />
  );
}

/* ---------- 5. tax ---------- */

function TaxTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "price", label: "Net price", type: "number", required: true },
        { key: "rate", label: "Tax rate %", type: "number", def: "20", required: true },
      ]}
      compute={(v) => {
        const price = req(v, "price", "Net price");
        if (typeof price !== "number") return price;
        const rate = req(v, "rate", "Tax rate %");
        if (typeof rate !== "number") return rate;
        if (price < 0 || rate < 0) return { error: "Price and rate must be zero or more." };
        const tax = (price * rate) / 100;
        return { rows: [["Tax", fmt(tax)], ["Total", fmt(price + tax)]], note: "Total = price × (1 + rate/100). Planning estimate, not tax advice." };
      }}
    />
  );
}

/* ---------- 6. split bill ---------- */

function SplitBillTool() {
  return (
    <Calc
      button="Split"
      fields={[
        { key: "bill", label: "Bill amount", type: "number", required: true },
        { key: "tip", label: "Tip %", type: "number", def: "10" },
        { key: "n", label: "People", type: "number", def: "2", required: true },
      ]}
      compute={(v) => {
        const bill = req(v, "bill", "Bill amount");
        if (typeof bill !== "number") return bill;
        const tip = num(v, "tip") ?? 0;
        const n = req(v, "n", "People");
        if (typeof n !== "number") return n;
        if (bill < 0) return { error: "Bill must be zero or more." };
        if (!Number.isInteger(n) || n < 1 || n > 1000) return { error: "People must be a whole number from 1 to 1000." };
        const tipAmt = (bill * tip) / 100;
        const total = bill + tipAmt;
        return { rows: [["Tip", fmt(tipAmt)], ["Total", fmt(total)], ["Per person", fmt(total / n)]], note: "Per person = bill × (1 + tip/100) ÷ people." };
      }}
    />
  );
}

/* ---------- markup ---------- */

function MarkupTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "cost", label: "Unit cost", type: "number", required: true },
        { key: "pct", label: "Markup %", type: "number", def: "50", required: true },
      ]}
      compute={(v) => {
        const cost = req(v, "cost", "Unit cost");
        if (typeof cost !== "number") return cost;
        const pct = req(v, "pct", "Markup %");
        if (typeof pct !== "number") return pct;
        const amt = (cost * pct) / 100;
        return { rows: [["Markup amount", fmt(amt)], ["Selling price", fmt(cost + amt)]], note: "Price = cost × (1 + markup/100)." };
      }}
    />
  );
}

/* ---------- 9. proportion ---------- */

function ProportionTool() {
  return (
    <Calc
      button="Solve"
      fields={[
        { key: "a", label: "a (in a:b)", type: "number", required: true },
        { key: "b", label: "b (in a:b)", type: "number", required: true },
        { key: "c", label: "c (in c:d)", type: "number", required: true },
      ]}
      compute={(v) => {
        const a = req(v, "a", "a");
        if (typeof a !== "number") return a;
        const b = req(v, "b", "b");
        if (typeof b !== "number") return b;
        const c = req(v, "c", "c");
        if (typeof c !== "number") return c;
        if (a === 0) return { error: "“a” cannot be zero (division by zero)." };
        const d = (b * c) / a;
        return { rows: [["Missing d", fmt(d)], ["Check a:b", fmt(a / b)], ["Check c:d", c === 0 || d === 0 ? "—" : fmt(c / d)]], note: "Cross-multiplication: a×d = b×c, so d = b×c ÷ a." };
      }}
    />
  );
}

/* ---------- 10-13. mean / median / mode / range ---------- */

function MeanTool() {
  return (
    <Calc
      button="Calculate"
      fields={[{ key: "list", label: "Numbers (comma, space or line separated)", type: "textarea", placeholder: "e.g. 4, 8, 15, 16, 23, 42", required: true }]}
      compute={(v) => {
        const xs = parseList(v.list ?? "");
        if (!xs) return { error: "Enter at least one valid number." };
        const sum = xs.reduce((s, x) => s + x, 0);
        return { rows: [["Mean", fmt(sum / xs.length)], ["Sum", fmt(sum)], ["Count", String(xs.length)]], note: "Mean = sum ÷ count." };
      }}
    />
  );
}

function MedianTool() {
  return (
    <Calc
      button="Calculate"
      fields={[{ key: "list", label: "Numbers (comma, space or line separated)", type: "textarea", placeholder: "e.g. 4, 8, 15, 16, 23, 42", required: true }]}
      compute={(v) => {
        const xs = parseList(v.list ?? "");
        if (!xs) return { error: "Enter at least one valid number." };
        const s = [...xs].sort((a, b) => a - b);
        const mid = Math.floor(s.length / 2);
        const med = s.length % 2 === 1 ? s[mid] as number : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
        return { rows: [["Median", fmt(med)], ["Sorted", s.slice(0, 20).map(fmt).join(", ") + (s.length > 20 ? " …" : "")], ["Count", String(s.length)]], note: "Middle value of the sorted list (average of two middles for even counts)." };
      }}
    />
  );
}

function ModeTool() {
  return (
    <Calc
      button="Calculate"
      fields={[{ key: "list", label: "Numbers (comma, space or line separated)", type: "textarea", placeholder: "e.g. 2, 3, 3, 5, 5, 5", required: true }]}
      compute={(v) => {
        const xs = parseList(v.list ?? "");
        if (!xs) return { error: "Enter at least one valid number." };
        const freq = new Map<number, number>();
        for (const x of xs) freq.set(x, (freq.get(x) ?? 0) + 1);
        let best = 0;
        for (const c of freq.values()) best = Math.max(best, c);
        const modes = [...freq.entries()].filter(([, c]) => c === best).map(([x]) => x).sort((a, b) => a - b);
        return { rows: [["Mode" + (modes.length > 1 ? "s" : ""), modes.map(fmt).join(", ")], ["Frequency", String(best)], ["Distinct values", String(freq.size)]], note: best === 1 ? "Every value appears once — there is no mode." : "The most frequent value(s); several can tie (multimodal)." };
      }}
    />
  );
}

function RangeTool() {
  return (
    <Calc
      button="Calculate"
      fields={[{ key: "list", label: "Numbers (comma, space or line separated)", type: "textarea", placeholder: "e.g. 4, 8, 15, 16, 23, 42", required: true }]}
      compute={(v) => {
        const xs = parseList(v.list ?? "");
        if (!xs) return { error: "Enter at least one valid number." };
        const lo = Math.min(...xs);
        const hi = Math.max(...xs);
        return { rows: [["Minimum", fmt(lo)], ["Maximum", fmt(hi)], ["Range", fmt(hi - lo)]], note: "Range = maximum − minimum." };
      }}
    />
  );
}

/* ---------- 14-15. stddev / variance ---------- */

function stddevCommon(v: Record<string, string>): { error: string } | { xs: number[]; mean: number; popVar: number; sampVar: number } {
  const xs = parseList(v.list ?? "");
  if (!xs) return { error: "Enter at least one valid number." };
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  const sq = xs.reduce((s, x) => s + (x - mean) * (x - mean), 0);
  return { xs, mean, popVar: sq / xs.length, sampVar: xs.length > 1 ? sq / (xs.length - 1) : NaN };
}

function StddevTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "list", label: "Numbers (comma, space or line separated)", type: "textarea", placeholder: "e.g. 2, 4, 4, 4, 5, 5, 7, 9", required: true },
        { key: "mode", label: "Dataset type", type: "select", options: [{ value: "pop", label: "Population" }, { value: "samp", label: "Sample" }], def: "pop" },
      ]}
      compute={(v) => {
        const r = stddevCommon(v);
        if ("error" in r) return r;
        const sd = v.mode === "samp" ? Math.sqrt(r.sampVar) : Math.sqrt(r.popVar);
        if (!Number.isFinite(sd)) return { error: "Sample deviation needs at least two values." };
        return { rows: [["Std deviation (" + (v.mode === "samp" ? "sample" : "population") + ")", fmt(sd)], ["Mean", fmt(r.mean)], ["Variance", fmt(v.mode === "samp" ? r.sampVar : r.popVar)], ["Count", String(r.xs.length)]], note: "Population: √(Σ(x−μ)²/N). Sample: √(Σ(x−x̄)²/(n−1))." };
      }}
    />
  );
}

function VarianceTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "list", label: "Numbers (comma, space or line separated)", type: "textarea", placeholder: "e.g. 2, 4, 4, 4, 5, 5, 7, 9", required: true },
        { key: "mode", label: "Dataset type", type: "select", options: [{ value: "pop", label: "Population" }, { value: "samp", label: "Sample" }], def: "pop" },
      ]}
      compute={(v) => {
        const r = stddevCommon(v);
        if ("error" in r) return r;
        const va = v.mode === "samp" ? r.sampVar : r.popVar;
        if (!Number.isFinite(va)) return { error: "Sample variance needs at least two values." };
        return { rows: [["Variance (" + (v.mode === "samp" ? "sample" : "population") + ")", fmt(va)], ["Std deviation", fmt(Math.sqrt(va))], ["Mean", fmt(r.mean)], ["Count", String(r.xs.length)]], note: "Population: Σ(x−μ)²/N. Sample: Σ(x−x̄)²/(n−1)." };
      }}
    />
  );
}

/* ---------- 16. weighted average ---------- */

function WeightedAverageTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "vals", label: "Values", type: "textarea", placeholder: "e.g. 85 90 78", required: true },
        { key: "wts", label: "Weights (same order)", type: "textarea", placeholder: "e.g. 3 3 4", required: true },
      ]}
      compute={(v) => {
        const xs = parseList(v.vals ?? "");
        const ws = parseList(v.wts ?? "");
        if (!xs || !ws) return { error: "Enter valid numbers for both values and weights." };
        if (xs.length !== ws.length) return { error: `Counts must match (${xs.length} values vs ${ws.length} weights).` };
        const tw = ws.reduce((s, x) => s + x, 0);
        if (tw === 0) return { error: "Total weight cannot be zero." };
        const wa = xs.reduce((s, x, i) => s + x * (ws[i] as number), 0) / tw;
        return { rows: [["Weighted average", fmt(wa)], ["Total weight", fmt(tw)]], note: "Σ(value × weight) ÷ Σ(weights)." };
      }}
    />
  );
}

/* ---------- 17-19. fractions ---------- */

function MixedFractionTool() {
  return (
    <Calc
      button="Convert"
      fields={[
        { key: "whole", label: "Whole part", type: "number", def: "1", required: true },
        { key: "n", label: "Numerator", type: "number", def: "1", required: true },
        { key: "d", label: "Denominator", type: "number", def: "2", required: true },
      ]}
      compute={(v) => {
        const w = req(v, "whole", "Whole part");
        if (typeof w !== "number") return w;
        const n = req(v, "n", "Numerator");
        if (typeof n !== "number") return n;
        const d = req(v, "d", "Denominator");
        if (typeof d !== "number") return d;
        if (!Number.isInteger(w) || !Number.isInteger(n) || !Number.isInteger(d)) return { error: "Whole, numerator and denominator must be whole numbers." };
        if (d === 0) return { error: "Denominator cannot be zero." };
        const dd = Math.abs(d);
        const top = Math.abs(w) * dd + Math.abs(n);
        const sign = w < 0 || n < 0 ? "-" : "";
        const g = gcd(top, dd) || 1;
        const sTop = top / g;
        const sDen = dd / g;
        const w2 = Math.floor(sTop / sDen);
        const r2 = sTop % sDen;
        return { rows: [["Improper fraction", `${sign}${top}/${dd}`], ["Simplified", r2 === 0 ? `${sign}${w2}` : `${sign}${w2} ${r2}/${sDen}`], ["Decimal", fmt((Number(sign + "1") * top) / dd)]], note: "Improper = (whole × denominator + numerator) / denominator." };
      }}
    />
  );
}

function DecimalToFractionTool() {
  return (
    <Calc
      button="Convert"
      fields={[{ key: "x", label: "Decimal", type: "number", placeholder: "e.g. 0.333333", required: true }]}
      compute={(v) => {
        const x = req(v, "x", "Decimal");
        if (typeof x !== "number") return x;
        if (Math.abs(x) > 1e15) return { error: "Enter a value with absolute size below 10^15." };
        const [a, b] = decToFrac(x);
        return { rows: [["Fraction", `${a}/${b}`], ["Check (decimal)", fmt(a / b)]], note: "Exact best fraction via continued fractions (denominator ≤ 10000)." };
      }}
    />
  );
}

function FractionToDecimalTool() {
  return (
    <Calc
      button="Convert"
      fields={[
        { key: "n", label: "Numerator", type: "number", def: "1", required: true },
        { key: "d", label: "Denominator", type: "number", def: "3", required: true },
      ]}
      compute={(v) => {
        const n = req(v, "n", "Numerator");
        if (typeof n !== "number") return n;
        const d = req(v, "d", "Denominator");
        if (typeof d !== "number") return d;
        if (d === 0) return { error: "Denominator cannot be zero." };
        const q = n / d;
        return { rows: [["Decimal", String(Number(q.toPrecision(12)))], ["Percent", fmt(q * 100) + " %"]], note: "Decimal = numerator ÷ denominator." };
      }}
    />
  );
}

/* ---------- 20-21. lcm / gcd ---------- */

function LcmTool() {
  return (
    <Calc
      button="Calculate"
      fields={[{ key: "list", label: "Integers (space or comma separated)", type: "text", placeholder: "e.g. 12 18 30", required: true }]}
      compute={(v) => {
        const xs = parseList(v.list ?? "");
        if (!xs || xs.length === 0) return { error: "Enter at least one integer." };
        if (xs.length > 50) return { error: "At most 50 numbers." };
        for (const x of xs) {
          if (!Number.isInteger(x) || Math.abs(x) > 1e9) return { error: "Each value must be a whole number below 10^9 in size." };
          if (x === 0) return { error: "LCM is not defined when a value is zero." };
        }
        let l = Math.abs(xs[0] as number);
        for (let k = 1; k < xs.length; k++) {
          const g = gcd(l, xs[k] as number);
          l = Math.abs((l / g) * (xs[k] as number));
          if (l > 1e15) return { error: "LCM is too large to show exactly (over 10^15)." };
        }
        return { rows: [["LCM", String(l)]], note: "lcm(a,b) = |a×b| ÷ gcd(a,b), folded across the list." };
      }}
    />
  );
}

function GcdTool() {
  return (
    <Calc
      button="Calculate"
      fields={[{ key: "list", label: "Integers (space or comma separated)", type: "text", placeholder: "e.g. 12 18 30", required: true }]}
      compute={(v) => {
        const xs = parseList(v.list ?? "");
        if (!xs || xs.length === 0) return { error: "Enter at least one integer." };
        if (xs.length > 50) return { error: "At most 50 numbers." };
        for (const x of xs) {
          if (!Number.isInteger(x) || Math.abs(x) > 1e15) return { error: "Each value must be a whole number below 10^15 in size." };
        }
        let g = Math.abs(xs[0] as number);
        for (let k = 1; k < xs.length; k++) g = gcd(g, xs[k] as number);
        return { rows: [["GCD", String(g)]], note: "Euclid's algorithm folded across the list." };
      }}
    />
  );
}

/* ---------- 22-23. primes ---------- */

function PrimeCheckerTool() {
  return (
    <Calc
      button="Check"
      fields={[{ key: "n", label: "Integer", type: "text", placeholder: "e.g. 104729", required: true }]}
      compute={(v) => {
        const raw = (v.n ?? "").trim().replace(/_/g, "");
        if (!/^-?\d{1,30}$/.test(raw)) return { error: "Enter a whole number (up to 30 digits, no decimals)." };
        let n: bigint;
        try {
          n = BigInt(raw);
        } catch {
          return { error: "Could not read that integer." };
        }
        if (n < BigInt(0)) return { rows: [["Result", "Neither prime nor composite (negative)"]] };
        if (n < BigInt(2)) return { rows: [["Result", "Neither prime nor composite"]] };
        const prime = isPrimeBig(n);
        return { rows: [["Result", prime ? "Prime ✓" : "Composite (not prime)"]], note: "Trial division by small primes, then deterministic Miller–Rabin (valid below 2^64)." };
      }}
    />
  );
}

function PrimeFactorizationTool() {
  return (
    <Calc
      button="Factorize"
      fields={[{ key: "n", label: "Integer (2 – 1,000,000,000,000)", type: "number", placeholder: "e.g. 360", required: true }]}
      compute={(v) => {
        const n = req(v, "n", "Integer");
        if (typeof n !== "number") return n;
        if (!Number.isInteger(n) || n < 2 || n > 1e12) return { error: "Enter a whole number from 2 to 1,000,000,000,000." };
        const fs = factorize(n);
        const str = fs.map(([p, c]) => (c === 1 ? String(p) : `${p}^${c}`)).join(" × ");
        return { rows: [["Factorization", str], ["Distinct primes", String(fs.length)], ["Prime?", fs.length === 1 && fs[0]?.[1] === 1 ? "Yes — it is prime" : "No — composite"]], note: "Trial division up to √n, exponents grouped." };
      }}
    />
  );
}

/* ---------- 24. factorial ---------- */

function FactorialTool() {
  return (
    <Calc
      button="Calculate"
      fields={[{ key: "n", label: "n (0 – 5000)", type: "number", def: "20", required: true }]}
      compute={(v) => {
        const n = req(v, "n", "n");
        if (typeof n !== "number") return n;
        if (!Number.isInteger(n) || n < 0 || n > 5000) return { error: "Enter a whole number from 0 to 5000." };
        let f = BigInt(1);
        for (let k = 2; k <= n; k++) f *= BigInt(k);
        const s = f.toString();
        let zeros = 0;
        for (let k = n; k >= 5; k = Math.floor(k / 5)) zeros += Math.floor(k / 5);
        return {
          rows: [
            ["Digits", String(s.length)],
            ["Value", s.length <= 120 ? s : `${s.slice(0, 60)}…${s.slice(-40)}`],
            ["Trailing zeros", String(zeros)],
          ],
          note: "Exact BigInt arithmetic: n! = 1×2×…×n. Long values are trimmed in the middle.",
        };
      }}
    />
  );
}

/* ---------- 25-30. powers / roots / logs ---------- */

function ExponentTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "base", label: "Base", type: "number", def: "2", required: true },
        { key: "exp", label: "Exponent", type: "number", def: "10", required: true },
      ]}
      compute={(v) => {
        const base = req(v, "base", "Base");
        if (typeof base !== "number") return base;
        const exp = req(v, "exp", "Exponent");
        if (typeof exp !== "number") return exp;
        const r = Math.pow(base, exp);
        if (!Number.isFinite(r)) return { error: "Result is out of range (overflow or 0^negative)." };
        if (base < 0 && !Number.isInteger(exp)) return { error: "A negative base needs a whole-number exponent for a real result." };
        return { rows: [["Result", fmt(r)]], note: "x^0 = 1, x^−n = 1/x^n, x^(1/n) = nth root." };
      }}
    />
  );
}

function SquareRootTool() {
  return (
    <Calc
      button="Calculate"
      fields={[{ key: "x", label: "Number (≥ 0)", type: "number", def: "2", required: true }]}
      compute={(v) => {
        const x = req(v, "x", "Number");
        if (typeof x !== "number") return x;
        if (x < 0) return { error: "Square root of a negative number is not real." };
        const r = Math.sqrt(x);
        const s = Math.sqrt(x);
        const perfect = Number.isInteger(s);
        void perfect;
        const root = Math.round(r);
        return { rows: [["√x", fmt(r)], ["Squared check", fmt(r * r)], ["Perfect square?", root * root === x ? `Yes (${root}²)` : "No"]], note: "Principal (non-negative) square root: √x × √x = x." };
      }}
    />
  );
}

function CubeRootTool() {
  return (
    <Calc
      button="Calculate"
      fields={[{ key: "x", label: "Number (any sign)", type: "number", def: "27", required: true }]}
      compute={(v) => {
        const x = req(v, "x", "Number");
        if (typeof x !== "number") return x;
        const r = Math.cbrt(x);
        const root = Math.round(r);
        return { rows: [["∛x", fmt(r)], ["Cubed check", fmt(r * r * r)], ["Perfect cube?", root * root * root === x ? `Yes (${root}³)` : "No"]], note: "Cube root: ∛x × ∛x × ∛x = x, negatives allowed." };
      }}
    />
  );
}

function LogarithmTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "x", label: "Value (> 0)", type: "number", def: "100", required: true },
        { key: "b", label: "Base (> 0, ≠ 1)", type: "number", def: "10", required: true },
      ]}
      compute={(v) => {
        const x = req(v, "x", "Value");
        if (typeof x !== "number") return x;
        const b = req(v, "b", "Base");
        if (typeof b !== "number") return b;
        if (x <= 0) return { error: "Value must be greater than zero." };
        if (b <= 0 || b === 1) return { error: "Base must be positive and not equal to 1." };
        return { rows: [[`log base ${fmt(b)}`, fmt(Math.log(x) / Math.log(b))], ["ln (base e)", fmt(Math.log(x))], ["log10", fmt(Math.log10(x))]], note: "log_b(x) = ln(x) ÷ ln(b); it answers “b to what power gives x?”." };
      }}
    />
  );
}

function PowerTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "x", label: "Base", type: "number", def: "2", required: true },
        { key: "n", label: "Custom exponent n", type: "number", def: "10" },
      ]}
      compute={(v) => {
        const x = req(v, "x", "Base");
        if (typeof x !== "number") return x;
        const n = num(v, "n") ?? 0;
        const full = Math.pow(x, n);
        const rows: [string, string][] = [];
        for (let k = 0; k <= 5; k++) rows.push([`x^${k}`, fmt(Math.pow(x, k))]);
        rows.push([`x^${fmt(n)}`, Number.isFinite(full) ? fmt(full) : "Out of range"]);
        return { rows, note: "Power laws: x^a × x^b = x^(a+b); (x^a)^b = x^(ab)." };
      }}
    />
  );
}

function ScientificNotationTool() {
  return (
    <Calc
      button="Convert"
      fields={[{ key: "x", label: "Number", type: "number", placeholder: "e.g. 0.0000045", required: true }]}
      compute={(v) => {
        const x = req(v, "x", "Number");
        if (typeof x !== "number") return x;
        if (x === 0) return { rows: [["Scientific", "0 × 10^0"], ["E-notation", "0e0"]] };
        const e = Math.floor(Math.log10(Math.abs(x)));
        const m = x / Math.pow(10, e);
        const eng = Math.floor(e / 3) * 3;
        return { rows: [["Scientific", `${fmt(m)} × 10^${e}`], ["E-notation", `${fmt(m)}e${e}`], ["Engineering (×10^3k)", `${fmt(x / Math.pow(10, eng))} × 10^${eng}`]], note: "Normalized form: one non-zero digit before the point (a × 10^n)." };
      }}
    />
  );
}

/* ---------- 31-32. equation solvers ---------- */

function QuadraticSolverTool() {
  return (
    <Calc
      button="Solve"
      fields={[
        { key: "a", label: "a (≠ 0)", type: "number", def: "1", required: true },
        { key: "b", label: "b", type: "number", def: "-3", required: true },
        { key: "c", label: "c", type: "number", def: "2", required: true },
      ]}
      compute={(v) => {
        const a = req(v, "a", "a");
        if (typeof a !== "number") return a;
        const b = req(v, "b", "b");
        if (typeof b !== "number") return b;
        const c = req(v, "c", "c");
        if (typeof c !== "number") return c;
        if (a === 0) return { error: "“a” cannot be zero — that is a linear equation (use the linear solver)." };
        const D = b * b - 4 * a * c;
        const vx = -b / (2 * a);
        const vy = (4 * a * c - b * b) / (4 * a);
        if (D > 0) {
          const r1 = (-b + Math.sqrt(D)) / (2 * a);
          const r2 = (-b - Math.sqrt(D)) / (2 * a);
          return { rows: [["Root 1", fmt(r1)], ["Root 2", fmt(r2)], ["Discriminant", fmt(D) + " (> 0: two real roots)"], ["Vertex", `(${fmt(vx)}, ${fmt(vy)})`]], note: "x = (−b ± √D) / 2a with D = b² − 4ac." };
        }
        if (D === 0) {
          return { rows: [["Double root", fmt(vx)], ["Discriminant", "0 (one repeated root)"], ["Vertex", `(${fmt(vx)}, ${fmt(vy)})`]], note: "x = −b / 2a when D = 0." };
        }
        const im = Math.sqrt(-D) / (2 * a);
        return { rows: [["Root 1", `${fmt(vx)} + ${fmt(Math.abs(im))}i`], ["Root 2", `${fmt(vx)} − ${fmt(Math.abs(im))}i`], ["Discriminant", fmt(D) + " (< 0: complex pair, honestly shown)"], ["Vertex", `(${fmt(vx)}, ${fmt(vy)})`]], note: "Complex roots are shown as a ± bi — never faked as real." };
      }}
    />
  );
}

function LinearEquationTool() {
  return (
    <Calc
      button="Solve"
      fields={[
        { key: "a", label: "a in ax + b = 0 (≠ 0)", type: "number", def: "2", required: true },
        { key: "b", label: "b in ax + b = 0", type: "number", def: "-8", required: true },
      ]}
      compute={(v) => {
        const a = req(v, "a", "a");
        if (typeof a !== "number") return a;
        const b = req(v, "b", "b");
        if (typeof b !== "number") return b;
        if (a === 0) return { error: b === 0 ? "0 = 0: every x is a solution." : "No solution: 0×x + b = 0 with b ≠ 0." };
        return { rows: [["x", fmt(-b / a)]], note: "ax + b = 0 gives x = −b / a." };
      }}
    />
  );
}

/* ---------- 33-44. geometry + motion ---------- */

function TriangleTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "a", label: "Side a", type: "number", def: "3", required: true },
        { key: "b", label: "Side b", type: "number", def: "4", required: true },
        { key: "c", label: "Side c", type: "number", def: "5", required: true },
      ]}
      compute={(v) => {
        const a = req(v, "a", "Side a");
        if (typeof a !== "number") return a;
        const b = req(v, "b", "Side b");
        if (typeof b !== "number") return b;
        const c = req(v, "c", "Side c");
        if (typeof c !== "number") return c;
        if (a <= 0 || b <= 0 || c <= 0) return { error: "Sides must be positive." };
        if (a + b <= c || a + c <= b || b + c <= a) return { error: "Not a valid triangle: each two sides must exceed the third." };
        const p = (a + b + c) / 2;
        const area = Math.sqrt(p * (p - a) * (p - b) * (p - c));
        const A = (Math.acos((b * b + c * c - a * a) / (2 * b * c)) * 180) / Math.PI;
        const B = (Math.acos((a * a + c * c - b * b) / (2 * a * c)) * 180) / Math.PI;
        return { rows: [["Area", fmt(area)], ["Perimeter", fmt(a + b + c)], ["Angle A", fmt(A) + "°"], ["Angle B", fmt(B) + "°"], ["Angle C", fmt(180 - A - B) + "°"]], note: "Area via Heron: √(p(p−a)(p−b)(p−c)); angles via the law of cosines." };
      }}
    />
  );
}

function CircleTool() {
  return (
    <Calc
      button="Calculate"
      fields={[{ key: "r", label: "Radius", type: "number", def: "1", required: true }]}
      compute={(v) => {
        const r = req(v, "r", "Radius");
        if (typeof r !== "number") return r;
        if (r <= 0) return { error: "Radius must be positive." };
        return { rows: [["Area", fmt(Math.PI * r * r)], ["Circumference", fmt(2 * Math.PI * r)], ["Diameter", fmt(2 * r)]], note: "Area = πr². Circumference = 2πr." };
      }}
    />
  );
}

function RectangleTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "l", label: "Length", type: "number", def: "4", required: true },
        { key: "w", label: "Width", type: "number", def: "3", required: true },
      ]}
      compute={(v) => {
        const l = req(v, "l", "Length");
        if (typeof l !== "number") return l;
        const w = req(v, "w", "Width");
        if (typeof w !== "number") return w;
        if (l <= 0 || w <= 0) return { error: "Length and width must be positive." };
        return { rows: [["Area", fmt(l * w)], ["Perimeter", fmt(2 * (l + w))], ["Diagonal", fmt(Math.hypot(l, w))]], note: "Area = l×w. Diagonal = √(l²+w²)." };
      }}
    />
  );
}

function SquareTool() {
  return (
    <Calc
      button="Calculate"
      fields={[{ key: "s", label: "Side", type: "number", def: "1", required: true }]}
      compute={(v) => {
        const s = req(v, "s", "Side");
        if (typeof s !== "number") return s;
        if (s <= 0) return { error: "Side must be positive." };
        return { rows: [["Area", fmt(s * s)], ["Perimeter", fmt(4 * s)], ["Diagonal", fmt(s * Math.SQRT2)]], note: "Area = s². Diagonal = s√2." };
      }}
    />
  );
}

function TrapezoidTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "a", label: "Base a", type: "number", def: "5", required: true },
        { key: "b", label: "Base b", type: "number", def: "3", required: true },
        { key: "h", label: "Height", type: "number", def: "4", required: true },
        { key: "c", label: "Leg c (for perimeter, optional)", type: "number" },
        { key: "d", label: "Leg d (for perimeter, optional)", type: "number" },
      ]}
      compute={(v) => {
        const a = req(v, "a", "Base a");
        if (typeof a !== "number") return a;
        const b = req(v, "b", "Base b");
        if (typeof b !== "number") return b;
        const h = req(v, "h", "Height");
        if (typeof h !== "number") return h;
        if (a <= 0 || b <= 0 || h <= 0) return { error: "Bases and height must be positive." };
        const c = num(v, "c");
        const d = num(v, "d");
        const rows: [string, string][] = [["Area", fmt(((a + b) / 2) * h)]];
        if (c !== null && d !== null && c > 0 && d > 0) rows.push(["Perimeter", fmt(a + b + c + d)]);
        else rows.push(["Perimeter", "Enter both legs for perimeter"]);
        return { rows, note: "Area = (a+b)/2 × h. Perimeter = a+b+c+d." };
      }}
    />
  );
}

function PolygonTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "n", label: "Sides n (3 – 1000)", type: "number", def: "6", required: true },
        { key: "s", label: "Side length", type: "number", def: "1", required: true },
      ]}
      compute={(v) => {
        const n = req(v, "n", "Sides n");
        if (typeof n !== "number") return n;
        const s = req(v, "s", "Side length");
        if (typeof s !== "number") return s;
        if (!Number.isInteger(n) || n < 3 || n > 1000) return { error: "Sides must be a whole number from 3 to 1000." };
        if (s <= 0) return { error: "Side length must be positive." };
        const area = (n * s * s) / (4 * Math.tan(Math.PI / n));
        return { rows: [["Area", fmt(area)], ["Perimeter", fmt(n * s)], ["Interior angle", fmt(((n - 2) * 180) / n) + "°"]], note: "Area = ns² / (4·tan(π/n)). Interior angle = (n−2)×180°/n." };
      }}
    />
  );
}

function PythagoreanTool() {
  return (
    <Calc
      button="Solve"
      fields={[
        { key: "mode", label: "Find", type: "select", options: [{ value: "hyp", label: "Hypotenuse c from a, b" }, { value: "leg", label: "Leg b from c, a" }], def: "hyp" },
        { key: "x", label: "First known side", type: "number", def: "3", required: true },
        { key: "y", label: "Second known side", type: "number", def: "4", required: true },
      ]}
      compute={(v) => {
        const x = req(v, "x", "First known side");
        if (typeof x !== "number") return x;
        const y = req(v, "y", "Second known side");
        if (typeof y !== "number") return y;
        if (x <= 0 || y <= 0) return { error: "Sides must be positive." };
        if (v.mode === "leg") {
          if (x <= y) return { error: "The hypotenuse (first side) must exceed the leg (second side)." };
          return { rows: [["Missing leg", fmt(Math.sqrt(x * x - y * y))]], note: "b = √(c² − a²)." };
        }
        return { rows: [["Hypotenuse", fmt(Math.hypot(x, y))]], note: "c = √(a² + b²)." };
      }}
    />
  );
}

function AreaTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "shape", label: "Shape", type: "select", options: [{ value: "circle", label: "Circle (d1 = radius)" }, { value: "rect", label: "Rectangle (d1 = length, d2 = width)" }, { value: "tri", label: "Triangle (d1 = base, d2 = height)" }, { value: "trap", label: "Trapezoid (d1 = base a, d2 = base b, d3 = height)" }], def: "circle" },
        { key: "d1", label: "Dimension 1", type: "number", def: "1", required: true },
        { key: "d2", label: "Dimension 2 (if needed)", type: "number" },
        { key: "d3", label: "Dimension 3 (trapezoid height)", type: "number" },
      ]}
      compute={(v) => {
        const d1 = req(v, "d1", "Dimension 1");
        if (typeof d1 !== "number") return d1;
        if (v.shape === "circle") {
          if (d1 <= 0) return { error: "Radius must be positive." };
          return { rows: [["Area", fmt(Math.PI * d1 * d1)]], note: "Circle: πr²." };
        }
        const d2 = req(v, "d2", "Dimension 2");
        if (typeof d2 !== "number") return d2;
        if (v.shape === "rect") {
          if (d1 <= 0 || d2 <= 0) return { error: "Length and width must be positive." };
          return { rows: [["Area", fmt(d1 * d2)]], note: "Rectangle: l × w." };
        }
        if (v.shape === "tri") {
          if (d1 <= 0 || d2 <= 0) return { error: "Base and height must be positive." };
          return { rows: [["Area", fmt((d1 * d2) / 2)]], note: "Triangle: ½ × base × height." };
        }
        const d3 = req(v, "d3", "Dimension 3");
        if (typeof d3 !== "number") return d3;
        if (d1 <= 0 || d2 <= 0 || d3 <= 0) return { error: "Bases and height must be positive." };
        return { rows: [["Area", fmt(((d1 + d2) / 2) * d3)]], note: "Trapezoid: (a+b)/2 × h." };
      }}
    />
  );
}

function VolumeTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "shape", label: "Shape", type: "select", options: [{ value: "cube", label: "Cube (d1 = side)" }, { value: "sphere", label: "Sphere (d1 = radius)" }, { value: "cyl", label: "Cylinder (d1 = radius, d2 = height)" }, { value: "cone", label: "Cone (d1 = radius, d2 = height)" }, { value: "box", label: "Box (d1 = length, d2 = width, d3 = depth)" }], def: "sphere" },
        { key: "d1", label: "Dimension 1", type: "number", def: "1", required: true },
        { key: "d2", label: "Dimension 2 (if needed)", type: "number" },
        { key: "d3", label: "Dimension 3 (box depth)", type: "number" },
      ]}
      compute={(v) => {
        const d1 = req(v, "d1", "Dimension 1");
        if (typeof d1 !== "number") return d1;
        if (d1 <= 0) return { error: "Dimensions must be positive." };
        if (v.shape === "cube") return { rows: [["Volume", fmt(d1 * d1 * d1)]], note: "Cube: s³." };
        if (v.shape === "sphere") return { rows: [["Volume", fmt((4 / 3) * Math.PI * d1 * d1 * d1)]], note: "Sphere: 4/3 πr³." };
        const d2 = req(v, "d2", "Dimension 2");
        if (typeof d2 !== "number") return d2;
        if (d2 <= 0) return { error: "Dimensions must be positive." };
        if (v.shape === "cyl") return { rows: [["Volume", fmt(Math.PI * d1 * d1 * d2)]], note: "Cylinder: πr²h." };
        if (v.shape === "cone") return { rows: [["Volume", fmt((Math.PI * d1 * d1 * d2) / 3)]], note: "Cone: πr²h/3." };
        const d3 = req(v, "d3", "Dimension 3");
        if (typeof d3 !== "number") return d3;
        if (d3 <= 0) return { error: "Dimensions must be positive." };
        return { rows: [["Volume", fmt(d1 * d2 * d3)]], note: "Box: l × w × d." };
      }}
    />
  );
}

function SurfaceAreaTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "shape", label: "Shape", type: "select", options: [{ value: "cube", label: "Cube (d1 = side)" }, { value: "sphere", label: "Sphere (d1 = radius)" }, { value: "cyl", label: "Cylinder (d1 = radius, d2 = height)" }, { value: "box", label: "Box (d1 = length, d2 = width, d3 = depth)" }], def: "sphere" },
        { key: "d1", label: "Dimension 1", type: "number", def: "1", required: true },
        { key: "d2", label: "Dimension 2 (if needed)", type: "number" },
        { key: "d3", label: "Dimension 3 (box depth)", type: "number" },
      ]}
      compute={(v) => {
        const d1 = req(v, "d1", "Dimension 1");
        if (typeof d1 !== "number") return d1;
        if (d1 <= 0) return { error: "Dimensions must be positive." };
        if (v.shape === "cube") return { rows: [["Surface area", fmt(6 * d1 * d1)]], note: "Cube: 6s²." };
        if (v.shape === "sphere") return { rows: [["Surface area", fmt(4 * Math.PI * d1 * d1)]], note: "Sphere: 4πr²." };
        const d2 = req(v, "d2", "Dimension 2");
        if (typeof d2 !== "number") return d2;
        if (d2 <= 0) return { error: "Dimensions must be positive." };
        if (v.shape === "cyl") return { rows: [["Surface area", fmt(2 * Math.PI * d1 * (d1 + d2))]], note: "Cylinder: 2πr(r+h)." };
        const d3 = req(v, "d3", "Dimension 3");
        if (typeof d3 !== "number") return d3;
        if (d3 <= 0) return { error: "Dimensions must be positive." };
        return { rows: [["Surface area", fmt(2 * (d1 * d2 + d1 * d3 + d2 * d3))]], note: "Box: 2(lw+lh+wh)." };
      }}
    />
  );
}

function SpeedTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "d", label: "Distance", type: "number", def: "100", required: true },
        { key: "t", label: "Time", type: "number", def: "2", required: true },
      ]}
      compute={(v) => {
        const d = req(v, "d", "Distance");
        if (typeof d !== "number") return d;
        const t = req(v, "t", "Time");
        if (typeof t !== "number") return t;
        if (t === 0) return { error: "Time cannot be zero." };
        if (d < 0 || t < 0) return { error: "Distance and time must be zero or more." };
        return { rows: [["Speed", fmt(d / t) + " per time unit"]], note: "v = d / t — use matching units (e.g. km and hours give km/h)." };
      }}
    />
  );
}

function DistanceTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "s", label: "Speed", type: "number", def: "50", required: true },
        { key: "t", label: "Time", type: "number", def: "2", required: true },
      ]}
      compute={(v) => {
        const s = req(v, "s", "Speed");
        if (typeof s !== "number") return s;
        const t = req(v, "t", "Time");
        if (typeof t !== "number") return t;
        if (s < 0 || t < 0) return { error: "Speed and time must be zero or more." };
        return { rows: [["Distance", fmt(s * t)]], note: "d = v × t — use matching units." };
      }}
    />
  );
}

/* ---------- 45-50. linear converters (Units factor tables) ---------- */

const PRESSURE_UNITS: UnitDef[] = [
  { id: "pa", label: "Pascal (Pa)", factor: 1 },
  { id: "kpa", label: "Kilopascal (kPa)", factor: 1000 },
  { id: "bar", label: "Bar", factor: 100000 },
  { id: "psi", label: "psi", factor: 6894.757293168 },
  { id: "atm", label: "Atmosphere (atm)", factor: 101325 },
  { id: "mmhg", label: "mmHg (torr)", factor: 133.322387415 },
];

function PressureConverterTool() {
  return <Units units={PRESSURE_UNITS} defFrom="bar" defTo="psi" hint="1 atm = 101325 Pa = 1.01325 bar = 14.6959 psi = 760 mmHg." />;
}

const ENERGY_UNITS: UnitDef[] = [
  { id: "j", label: "Joule (J)", factor: 1 },
  { id: "kj", label: "Kilojoule (kJ)", factor: 1000 },
  { id: "cal", label: "Calorie (cal)", factor: 4.184 },
  { id: "kcal", label: "Kilocalorie (kcal)", factor: 4184 },
  { id: "wh", label: "Watt-hour (Wh)", factor: 3600 },
  { id: "kwh", label: "Kilowatt-hour (kWh)", factor: 3600000 },
  { id: "btu", label: "BTU", factor: 1055.05585262 },
  { id: "ev", label: "Electronvolt (eV)", factor: 1.602176634e-19 },
];

function EnergyConverterTool() {
  return <Units units={ENERGY_UNITS} defFrom="kwh" defTo="j" hint="1 kWh = 3.6 MJ. 1 kcal = 4184 J. 1 eV = 1.602×10⁻¹⁹ J." />;
}

const POWER_UNITS: UnitDef[] = [
  { id: "w", label: "Watt (W)", factor: 1 },
  { id: "kw", label: "Kilowatt (kW)", factor: 1000 },
  { id: "mw", label: "Megawatt (MW)", factor: 1000000 },
  { id: "hp", label: "Horsepower, mechanical (hp)", factor: 745.699872 },
  { id: "hpm", label: "Horsepower, metric (PS)", factor: 735.49875 },
  { id: "btuh", label: "BTU/hour", factor: 0.29307107 },
];

function PowerConverterTool() {
  return <Units units={POWER_UNITS} defFrom="hp" defTo="kw" hint="1 mechanical hp = 745.7 W. 1 metric hp (PS) = 735.5 W." />;
}

const FORCE_UNITS: UnitDef[] = [
  { id: "n", label: "Newton (N)", factor: 1 },
  { id: "kn", label: "Kilonewton (kN)", factor: 1000 },
  { id: "lbf", label: "Pound-force (lbf)", factor: 4.4482216152605 },
  { id: "kgf", label: "Kilogram-force (kgf)", factor: 9.80665 },
  { id: "dyn", label: "Dyne (dyn)", factor: 0.00001 },
  { id: "ozf", label: "Ounce-force (ozf)", factor: 0.2780138509 },
];

function ForceConverterTool() {
  return <Units units={FORCE_UNITS} defFrom="lbf" defTo="n" hint="1 lbf = 4.44822 N. 1 kgf = 9.80665 N." />;
}

const FREQUENCY_UNITS: UnitDef[] = [
  { id: "hz", label: "Hertz (Hz)", factor: 1 },
  { id: "khz", label: "Kilohertz (kHz)", factor: 1000 },
  { id: "mhz", label: "Megahertz (MHz)", factor: 1000000 },
  { id: "ghz", label: "Gigahertz (GHz)", factor: 1000000000 },
  { id: "rpm", label: "Revolutions/min (RPM)", factor: 1 / 60 },
];

function FrequencyConverterTool() {
  return <Units units={FREQUENCY_UNITS} defFrom="mhz" defTo="khz" hint="RPM ÷ 60 = Hz. 1 GHz = 1000 MHz." />;
}

const ANGLE_UNITS: UnitDef[] = [
  { id: "deg", label: "Degrees (°)", factor: 1 },
  { id: "rad", label: "Radians (rad)", factor: 180 / Math.PI },
  { id: "grad", label: "Gradians (grad)", factor: 0.9 },
  { id: "turn", label: "Turns", factor: 360 },
  { id: "arcmin", label: "Arcminutes (′)", factor: 1 / 60 },
  { id: "arcsec", label: "Arcseconds (″)", factor: 1 / 3600 },
];

function AngleConverterTool() {
  return <Units units={ANGLE_UNITS} defFrom="deg" defTo="rad" hint="180° = π rad. 360° = 400 grad = 1 turn." />;
}

/* ---------- 51. fuel economy (inverse scale -> convert override) ---------- */

const FUEL_UNITS: UnitDef[] = [
  { id: "l100km", label: "L/100 km", factor: 1 },
  { id: "kml", label: "km/L", factor: 1 },
  { id: "mpg-us", label: "MPG (US gallon)", factor: 1 },
  { id: "mpg-uk", label: "MPG (UK gallon)", factor: 1 },
];

function fuelConvert(v: number, from: string, to: string): number | null {
  if (!(v > 0) || !Number.isFinite(v)) return null;
  let l: number;
  if (from === "l100km") l = v;
  else if (from === "kml") l = 100 / v;
  else if (from === "mpg-us") l = 235.214583 / v;
  else if (from === "mpg-uk") l = 282.480936 / v;
  else return null;
  if (to === "l100km") return l;
  if (to === "kml") return 100 / l;
  if (to === "mpg-us") return 235.214583 / l;
  if (to === "mpg-uk") return 282.480936 / l;
  return null;
}

function FuelEconomyConverterTool() {
  return <Units units={FUEL_UNITS} def="25" defFrom="mpg-us" defTo="l100km" convert={fuelConvert} hint="mpg and L/100km are inversely related: L/100km = 235.21 ÷ mpg(US) = 282.48 ÷ mpg(UK)." />;
}

/* ---------- 52-53. density / cooking ---------- */

const DENSITY_UNITS: UnitDef[] = [
  { id: "kgm3", label: "kg/m³", factor: 1 },
  { id: "gl", label: "g/L", factor: 1 },
  { id: "gcm3", label: "g/cm³", factor: 1000 },
  { id: "kgl", label: "kg/L", factor: 1000 },
  { id: "lbft3", label: "lb/ft³", factor: 16.01846337 },
];

function DensityConverterTool() {
  return <Units units={DENSITY_UNITS} defFrom="gcm3" defTo="kgm3" hint="Water = 1000 kg/m³ = 1 g/cm³. 1 g/cm³ = 1000 kg/m³." />;
}

const COOKING_UNITS: UnitDef[] = [
  { id: "ml", label: "Millilitre (ml)", factor: 1 },
  { id: "l", label: "Litre (L)", factor: 1000 },
  { id: "tsp", label: "Teaspoon (tsp, US)", factor: 4.92892159375 },
  { id: "tbsp", label: "Tablespoon (tbsp, US)", factor: 14.78676478125 },
  { id: "floz", label: "Fluid ounce (fl oz, US)", factor: 29.5735295625 },
  { id: "cup", label: "Cup (US)", factor: 236.5882365 },
  { id: "pint", label: "Pint (US)", factor: 473.176473 },
  { id: "quart", label: "Quart (US)", factor: 946.352946 },
];

function CookingConverterTool() {
  return <Units units={COOKING_UNITS} def="1" defFrom="cup" defTo="ml" hint="US kitchen measures: 1 cup = 16 tbsp = 48 tsp = 236.588 ml." />;
}

/* ---------- 54. shoe sizes (numeric systems -> convert override via foot length) ---------- */

const SHOE_UNITS: UnitDef[] = [
  { id: "us-m", label: "US men's", factor: 1 },
  { id: "us-w", label: "US women's", factor: 1 },
  { id: "uk", label: "UK", factor: 1 },
  { id: "eu", label: "EU", factor: 1 },
  { id: "cm", label: "Mondo (foot cm)", factor: 1 },
];

function shoeToCm(v: number, from: string): number | null {
  const IN = 2.54;
  if (from === "us-m") return ((v + 22) * IN) / 3;
  if (from === "us-w") return ((v + 20.5) * IN) / 3;
  if (from === "uk") return ((v + 22.5) * IN) / 3;
  if (from === "eu") return (v - 2) / 1.5;
  if (from === "cm") return v;
  return null;
}

function shoeFromCm(cm: number, to: string): number | null {
  const IN = 2.54;
  if (to === "us-m") return (cm * 3) / IN - 22;
  if (to === "us-w") return (cm * 3) / IN - 20.5;
  if (to === "uk") return (cm * 3) / IN - 22.5;
  if (to === "eu") return cm * 1.5 + 2;
  if (to === "cm") return cm;
  return null;
}

function shoeConvert(v: number, from: string, to: string): number | null {
  if (!Number.isFinite(v) || v <= 0 || v > 60) return null;
  const cm = shoeToCm(v, from);
  if (cm === null || cm <= 0 || cm > 40) return null;
  const r = shoeFromCm(cm, to);
  if (r === null || !Number.isFinite(r)) return null;
  return to === "cm" ? Math.round(r * 10) / 10 : Math.round(r * 2) / 2;
}

function ShoeSizeConverterTool() {
  return <Units units={SHOE_UNITS} def="9" defFrom="us-m" defTo="eu" convert={shoeConvert} hint="Approximate athletic-shoe tables via foot length (US men's ≈ 3×inches − 22). Sizes vary by brand — try shoes on." />;
}

/* ---------- 55. clothing sizes (letter sizes -> Calc lookup) ---------- */

const CLOTHING: { size: string; lo: number; hi: number }[] = [
  { size: "XS", lo: 30, hi: 32 },
  { size: "S", lo: 34, hi: 36 },
  { size: "M", lo: 38, hi: 40 },
  { size: "L", lo: 42, hi: 44 },
  { size: "XL", lo: 46, hi: 48 },
  { size: "XXL", lo: 50, hi: 52 },
];

function ClothingSizeConverterTool() {
  return (
    <Calc
      button="Look up"
      fields={[
        { key: "size", label: "Letter size", type: "select", options: [{ value: "", label: "Pick a size…" }, ...CLOTHING.map((c) => ({ value: c.size, label: c.size }))], def: "M" },
        { key: "chest", label: "…or chest (inches) for reverse lookup", type: "number", placeholder: "e.g. 41" },
      ]}
      compute={(v) => {
        const chest = num(v, "chest");
        if (chest !== null) {
          if (chest < 20 || chest > 70) return { error: "Chest must be between 20 and 70 inches." };
          const exact = CLOTHING.find((c) => chest >= c.lo && chest <= c.hi);
          if (exact) return { rows: [["Nearest size", exact.size], ["Its chest range", `${exact.lo}–${exact.hi} in`]], note: "Men's chest sizing, approximate — vanity sizing varies by brand." };
          let best = CLOTHING[0] as { size: string; lo: number; hi: number };
          let bestD = Infinity;
          for (const c of CLOTHING) {
            const d = Math.min(Math.abs(chest - c.lo), Math.abs(chest - c.hi));
            if (d < bestD) {
              bestD = d;
              best = c;
            }
          }
          return { rows: [["Nearest size", "≈ " + best.size], ["Its chest range", `${best.lo}–${best.hi} in`]], note: "Between sizes — check the brand chart. Approximate." };
        }
        const row = CLOTHING.find((c) => c.size === v.size);
        if (!row) return { error: "Pick a letter size or enter a chest measurement." };
        return { rows: [["Letter size", row.size], ["Chest range", `${row.lo}–${row.hi} inches`], ["Chest (cm)", `${fmt(row.lo * 2.54)}–${fmt(row.hi * 2.54)} cm`]], note: "Men's chest sizing, approximate — vanity sizing varies by brand." };
      }}
    />
  );
}

/* ---------- 56. ring sizes (Calc lookup with real formulas) ---------- */

const UK_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function RingSizeConverterTool() {
  return (
    <Calc
      button="Convert"
      fields={[
        { key: "sys", label: "Input system", type: "select", options: [{ value: "us", label: "US number" }, { value: "uk", label: "UK letter" }, { value: "eu", label: "EU (mm circumference)" }], def: "us" },
        { key: "val", label: "Size value", type: "text", placeholder: "e.g. 7, or N, or 54", required: true },
      ]}
      compute={(v) => {
        let us: number;
        if (v.sys === "us") {
          const n = Number((v.val ?? "").trim());
          if (!Number.isFinite(n)) return { error: "Enter a US size number, e.g. 7." };
          us = n;
        } else if (v.sys === "uk") {
          const t = (v.val ?? "").trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 1);
          const idx = UK_LETTERS.indexOf(t);
          if (idx < 0) return { error: "Enter a UK letter A–Z, e.g. N." };
          us = 4 + (idx - 8) / 2.5;
        } else {
          const n = Number((v.val ?? "").trim());
          if (!Number.isFinite(n) || n <= 0) return { error: "Enter an EU size in mm, e.g. 54." };
          const dia = n / Math.PI;
          us = (dia - 11.63) / 0.8128;
        }
        if (!Number.isFinite(us) || us < -2 || us > 20) return { error: "That size is outside the convertible range (about US 0–16)." };
        const dia = 11.63 + 0.8128 * us;
        const circ = dia * Math.PI;
        const ukIdx = Math.round((us - 4) * 2.5 + 8);
        const uk = ukIdx >= 0 && ukIdx < 26 ? "≈ " + UK_LETTERS[ukIdx] : "—";
        return {
          rows: [
            ["US", fmt(Math.round(us * 2) / 2)],
            ["UK", uk],
            ["EU (≈ mm circ.)", "≈ " + Math.round(circ)],
            ["Inner diameter", fmt(dia) + " mm"],
            ["Inner circumference", fmt(circ) + " mm"],
          ],
          note: "US numbers follow ISO diameter spacing; EU is inner circumference in mm. UK letters are approximate — jewellers' charts differ slightly.",
        };
      }}
    />
  );
}

/* ---------- 57. paper sizes (Calc + RefTable) ---------- */

function paperSizes(): { name: string; w: number; h: number }[] {
  const out: { name: string; w: number; h: number }[] = [];
  let w = 841;
  let h = 1189;
  for (let k = 0; k <= 10; k++) {
    out.push({ name: `A${k}`, w, h });
    const nw = Math.floor(h / 2);
    h = w;
    w = nw;
  }
  return out;
}

function PaperSizeConverterTool() {
  const sizes = paperSizes();
  return (
    <div>
      <Calc
        button="Show size"
        fields={[{ key: "size", label: "Paper size", type: "select", options: sizes.map((s) => ({ value: s.name, label: `${s.name} — ${s.w} × ${s.h} mm` })), def: "A4" }]}
        compute={(v) => {
          const s = sizes.find((x) => x.name === v.size) ?? sizes[4];
          const ref = s as { name: string; w: number; h: number };
          return {
            rows: [
              ["Size", `${ref.w} × ${ref.h} mm`],
              ["In cm", `${fmt(ref.w / 10)} × ${fmt(ref.h / 10)} cm`],
              ["Area", fmt((ref.w * ref.h) / 1000000) + " m²"],
            ],
            note: "ISO 216: each step halves the long side; every size keeps the √2 : 1 aspect ratio. A0 = 1 m².",
          };
        }}
      />
      <div className="mt-6">
        <RefTable
          columns={["Size", "Dimensions (mm)", "Area"]}
          rows={sizes.map((s) => [s.name, `${s.w} × ${s.h}`, fmt((s.w * s.h) / 1000000) + " m²"])}
          searchPlaceholder="Filter sizes, e.g. A4…"
        />
      </div>
    </div>
  );
}

/* ---------- 58. digital speed ---------- */

const DIGITAL_SPEED_UNITS: UnitDef[] = [
  { id: "bps", label: "Bits/sec (bps)", factor: 1 },
  { id: "kbps", label: "Kilobits/sec (Kbps)", factor: 1000 },
  { id: "mbps", label: "Megabits/sec (Mbps)", factor: 1000000 },
  { id: "gbps", label: "Gigabits/sec (Gbps)", factor: 1000000000 },
  { id: "kBps", label: "KBytes/sec (KB/s)", factor: 8000 },
  { id: "mBps", label: "MBytes/sec (MB/s)", factor: 8000000 },
];

function DigitalSpeedConverterTool() {
  return <Units units={DIGITAL_SPEED_UNITS} def="100" defFrom="mbps" defTo="mBps" hint="Decimal SI factors as ISPs quote them: 1 Mbps = 1000 Kbps; 1 byte = 8 bits." />;
}

/* ---------- 59. number base pro (bases 2-36, Calc because digits are text) ---------- */

const PRO_BASES = Array.from({ length: 35 }, (_, k) => ({ value: String(k + 2), label: `Base ${k + 2}${k + 2 === 10 ? " (decimal)" : k + 2 === 16 ? " (hex)" : k + 2 === 2 ? " (binary)" : k + 2 === 8 ? " (octal)" : ""}` }));

function NumberBaseProTool() {
  return (
    <Calc
      button="Convert"
      fields={[
        { key: "digits", label: "Number", type: "text", placeholder: "e.g. FF", required: true },
        { key: "from", label: "From base", type: "select", options: PRO_BASES, def: "16" },
        { key: "to", label: "To base", type: "select", options: PRO_BASES, def: "10" },
      ]}
      compute={(v) => {
        const raw = (v.digits ?? "").trim().replace(/_/g, "");
        const from = Number(v.from);
        const to = Number(v.to);
        if (!/^-?[0-9A-Za-z]{1,64}$/.test(raw)) return { error: "Enter up to 64 digits/letters (optional leading −)." };
        const neg = raw.startsWith("-");
        const body = neg ? raw.slice(1) : raw;
        const alpha = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (const ch of body.toUpperCase()) {
          if (alpha.indexOf(ch) < 0 || alpha.indexOf(ch) >= from) return { error: `Digit "${ch}" is not valid in base ${from}.` };
        }
        const dec = parseInt((neg ? "-" : "") + body, from);
        if (!Number.isSafeInteger(dec)) return { error: "Value is too large for exact conversion (must stay within ±2^53)." };
        const out = dec.toString(to).toUpperCase();
        return { rows: [["Result (base " + to + ")", out], ["Decimal check", String(dec)]], note: "Real radix conversion via place-value parsing; digits validated strictly per base." };
      }}
    />
  );
}

/* ---------- 60-63. ohm's law family ---------- */

function OhmsLawTool() {
  return (
    <Calc
      button="Solve"
      fields={[
        { key: "find", label: "Solve for", type: "select", options: [{ value: "v", label: "Voltage V" }, { value: "i", label: "Current I" }, { value: "r", label: "Resistance R" }], def: "v" },
        { key: "a", label: "First known (I in A, or V in V)", type: "number", required: true },
        { key: "b", label: "Second known (R in Ω, or R in Ω)", type: "number", required: true },
      ]}
      compute={(v) => {
        const a = req(v, "a", "First known");
        if (typeof a !== "number") return a;
        const b = req(v, "b", "Second known");
        if (typeof b !== "number") return b;
        if (v.find === "v") return { rows: [["Voltage", fmt(a * b) + " V"]], note: "V = I × R (amps × ohms)." };
        if (b === 0) return { error: "Resistance cannot be zero for this direction." };
        if (v.find === "i") return { rows: [["Current", fmt(a / b) + " A"]], note: "I = V / R (volts ÷ ohms)." };
        if (a === 0) return { error: "Current cannot be zero for this direction." };
        return { rows: [["Resistance", fmt(a / b) + " Ω"]], note: "R = V / I (volts ÷ amps)." };
      }}
    />
  );
}

function VoltageTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "i", label: "Current (A)", type: "number", required: true },
        { key: "r", label: "Resistance (Ω)", type: "number", required: true },
      ]}
      compute={(v) => {
        const i = req(v, "i", "Current");
        if (typeof i !== "number") return i;
        const r = req(v, "r", "Resistance");
        if (typeof r !== "number") return r;
        return { rows: [["Voltage", fmt(i * r) + " V"]], note: "V = I × R." };
      }}
    />
  );
}

function CurrentTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "vv", label: "Voltage (V)", type: "number", required: true },
        { key: "r", label: "Resistance (Ω)", type: "number", required: true },
      ]}
      compute={(v) => {
        const vv = req(v, "vv", "Voltage");
        if (typeof vv !== "number") return vv;
        const r = req(v, "r", "Resistance");
        if (typeof r !== "number") return r;
        if (r === 0) return { error: "Resistance cannot be zero (short circuit: current is unbounded)." };
        return { rows: [["Current", fmt(vv / r) + " A"], ["Milliamps", fmt((vv / r) * 1000) + " mA"]], note: "I = V / R." };
      }}
    />
  );
}

function ResistanceTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "vv", label: "Voltage (V)", type: "number", required: true },
        { key: "i", label: "Current (A)", type: "number", required: true },
      ]}
      compute={(v) => {
        const vv = req(v, "vv", "Voltage");
        if (typeof vv !== "number") return vv;
        const i = req(v, "i", "Current");
        if (typeof i !== "number") return i;
        if (i === 0) return { error: "Current cannot be zero (open circuit: resistance is unbounded)." };
        return { rows: [["Resistance", fmt(vv / i) + " Ω"], ["Kiloohms", fmt(vv / i / 1000) + " kΩ"]], note: "R = V / I." };
      }}
    />
  );
}

/* ---------- 64. electric power ---------- */

function PowerElectricTool() {
  return (
    <Calc
      button="Solve"
      fields={[
        { key: "find", label: "Solve for", type: "select", options: [{ value: "p", label: "Power P (W)" }, { value: "vv", label: "Voltage V" }, { value: "i", label: "Current I" }], def: "p" },
        { key: "a", label: "First known", type: "number", required: true },
        { key: "b", label: "Second known", type: "number", required: true },
      ]}
      compute={(v) => {
        const a = req(v, "a", "First known");
        if (typeof a !== "number") return a;
        const b = req(v, "b", "Second known");
        if (typeof b !== "number") return b;
        if (v.find === "p") return { rows: [["Power", fmt(a * b) + " W"]], note: "P = V × I." };
        if (b === 0) return { error: "The divisor cannot be zero." };
        if (v.find === "vv") return { rows: [["Voltage", fmt(a / b) + " V"]], note: "V = P / I." };
        return { rows: [["Current", fmt(a / b) + " A"]], note: "I = P / V." };
      }}
    />
  );
}

/* ---------- 65. energy E = Pt ---------- */

function EnergyScienceTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "p", label: "Power (W)", type: "number", required: true },
        { key: "t", label: "Time", type: "number", required: true },
        { key: "u", label: "Time unit", type: "select", options: [{ value: "s", label: "Seconds" }, { value: "min", label: "Minutes" }, { value: "h", label: "Hours" }], def: "h" },
      ]}
      compute={(v) => {
        const p = req(v, "p", "Power");
        if (typeof p !== "number") return p;
        const t = req(v, "t", "Time");
        if (typeof t !== "number") return t;
        if (p < 0 || t < 0) return { error: "Power and time must be zero or more." };
        const sec = v.u === "h" ? t * 3600 : v.u === "min" ? t * 60 : t;
        const joules = p * sec;
        return { rows: [["Energy", fmt(joules) + " J"], ["Kilowatt-hours", fmt(joules / 3600000) + " kWh"]], note: "E = P × t (watts × seconds = joules; ÷ 3.6M for kWh)." };
      }}
    />
  );
}

/* ---------- 66-68. frequency / wavelength / wave speed ---------- */

function FrequencyScienceTool() {
  return (
    <Calc
      button="Calculate"
      fields={[{ key: "t", label: "Period T (seconds)", type: "number", required: true }]}
      compute={(v) => {
        const t = req(v, "t", "Period T");
        if (typeof t !== "number") return t;
        if (t <= 0) return { error: "Period must be positive." };
        const f = 1 / t;
        return { rows: [["Frequency", fmt(f) + " Hz"], ["Angular (ω = 2πf)", fmt(2 * Math.PI * f) + " rad/s"]], note: "f = 1 / T. For waves also v = f × λ (see the wave tools)." };
      }}
    />
  );
}

function WavelengthTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "vv", label: "Wave speed (m/s)", type: "number", def: "343", required: true },
        { key: "f", label: "Frequency (Hz)", type: "number", def: "440", required: true },
      ]}
      compute={(v) => {
        const vv = req(v, "vv", "Wave speed");
        if (typeof vv !== "number") return vv;
        const f = req(v, "f", "Frequency");
        if (typeof f !== "number") return f;
        if (vv <= 0 || f <= 0) return { error: "Speed and frequency must be positive." };
        return { rows: [["Wavelength", fmt(vv / f) + " m"], ["In cm", fmt((vv / f) * 100) + " cm"]], note: "λ = v / f. Defaults: sound in air (343 m/s) at A440." };
      }}
    />
  );
}

function WaveSpeedTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "f", label: "Frequency (Hz)", type: "number", def: "440", required: true },
        { key: "l", label: "Wavelength (m)", type: "number", def: "0.78", required: true },
      ]}
      compute={(v) => {
        const f = req(v, "f", "Frequency");
        if (typeof f !== "number") return f;
        const l = req(v, "l", "Wavelength");
        if (typeof l !== "number") return l;
        if (f <= 0 || l <= 0) return { error: "Frequency and wavelength must be positive." };
        return { rows: [["Wave speed", fmt(f * l) + " m/s"], ["In km/h", fmt(f * l * 3.6) + " km/h"]], note: "v = f × λ." };
      }}
    />
  );
}

/* ---------- 69-71. force / pressure / density ---------- */

function ForceScienceTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "m", label: "Mass (kg)", type: "number", required: true },
        { key: "a", label: "Acceleration (m/s²)", type: "number", def: "9.81", required: true },
      ]}
      compute={(v) => {
        const m = req(v, "m", "Mass");
        if (typeof m !== "number") return m;
        const a = req(v, "a", "Acceleration");
        if (typeof a !== "number") return a;
        if (m < 0) return { error: "Mass cannot be negative." };
        return { rows: [["Force", fmt(m * a) + " N"]], note: "F = m × a (Newton's second law). Default a = 9.81 m/s² gives weight." };
      }}
    />
  );
}

function PressureScienceTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "f", label: "Force (N)", type: "number", required: true },
        { key: "a", label: "Area (m²)", type: "number", required: true },
      ]}
      compute={(v) => {
        const f = req(v, "f", "Force");
        if (typeof f !== "number") return f;
        const a = req(v, "a", "Area");
        if (typeof a !== "number") return a;
        if (a <= 0) return { error: "Area must be positive." };
        const p = f / a;
        return { rows: [["Pressure", fmt(p) + " Pa"], ["In kPa", fmt(p / 1000) + " kPa"]], note: "P = F / A (pascal = newton per square metre)." };
      }}
    />
  );
}

function DensityScienceTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "m", label: "Mass (kg)", type: "number", required: true },
        { key: "vv", label: "Volume (m³)", type: "number", required: true },
      ]}
      compute={(v) => {
        const m = req(v, "m", "Mass");
        if (typeof m !== "number") return m;
        const vol = req(v, "vv", "Volume");
        if (typeof vol !== "number") return vol;
        if (m < 0) return { error: "Mass cannot be negative." };
        if (vol <= 0) return { error: "Volume must be positive." };
        const rho = m / vol;
        return { rows: [["Density", fmt(rho) + " kg/m³"], ["In g/cm³", fmt(rho / 1000) + " g/cm³"]], note: "ρ = m / V. Water ≈ 1000 kg/m³." };
      }}
    />
  );
}

/* ---------- 72. engineering notation (TextOp, real) ---------- */

const SI_PREFIX: Record<number, string> = { "-24": "y", "-21": "z", "-18": "a", "-15": "f", "-12": "p", "-9": "n", "-6": "µ", "-3": "m", "0": "", "3": "k", "6": "M", "9": "G", "12": "T", "15": "P", "18": "E", "21": "Z", "24": "Y" };

function toEngineering(n: number): string {
  if (n === 0) return "0";
  const e = Math.floor(Math.log10(Math.abs(n)) / 3) * 3;
  const m = n / Math.pow(10, e);
  const p = SI_PREFIX[e];
  const mant = String(Number(m.toPrecision(6)));
  return p === undefined ? `${mant}e${e}` : `${mant}${p === "" ? "" : " " + p}`;
}

function EngineeringNotationTool() {
  return (
    <TextOp
      placeholder={"Enter numbers, one per line or comma separated…\ne.g. 0.0000045, 12000, 3.3e9"}
      button="Convert"
      outLabel="Engineering notation"
      fileName="engineering-notation.txt"
      process={(text) => {
        const parts = text.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
        if (parts.length === 0) return { error: "Enter at least one number." };
        if (parts.length > 500) return { error: "At most 500 numbers at once." };
        const lines: string[] = [];
        for (const p of parts) {
          const n = Number(p);
          if (!Number.isFinite(n)) return { error: `"${p}" is not a valid number.` };
          lines.push(`${p} → ${toEngineering(n)}`);
        }
        return { output: lines.join("\n"), stats: [["Converted", String(lines.length)]] };
      }}
    />
  );
}
