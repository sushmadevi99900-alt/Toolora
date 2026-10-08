"use client";

import { useMemo, useState } from "react";
import { Button } from "../../ui/Button";
import { Stat } from "../../ui/Card";
import { FieldLabel, Textarea } from "../../ui/Input";
import { Calc, Gen, asTool, num, req } from "../kits/kits";

export const moneybizRegistry: Record<string, React.ComponentType> = {
  "mortgage-calculator": asTool(<MortgageTool />),
  "loan-payment-calculator": asTool(<LoanPaymentTool />),
  "loan-interest-calculator": asTool(<LoanInterestTool />),
  "apr-calculator": asTool(<AprTool />),
  "roi-calculator": asTool(<RoiTool />),
  "investment-return-calculator": asTool(<InvestmentReturnTool />),
  "savings-calculator": asTool(<SavingsTool />),
  "future-value-calculator": asTool(<FutureValueTool />),
  "present-value-calculator": asTool(<PresentValueTool />),
  "cagr-calculator": asTool(<CagrTool />),
  "inflation-calculator": asTool(<InflationTool />),
  "salary-calculator": asTool(<SalaryTool />),
  "hourly-to-salary": asTool(<HourlyToSalaryTool />),
  "salary-to-hourly": asTool(<SalaryToHourlyTool />),
  "overtime-pay-calculator": asTool(<OvertimePayTool />),
  "commission-calculator": asTool(<CommissionTool />),
  "break-even-calculator": asTool(<BreakEvenTool />),
  "budget-calculator": asTool(<BudgetTool />),
  "monthly-budget-planner": asTool(<MonthlyBudgetPlannerTool />),
  "debt-payoff-calculator": asTool(<DebtPayoffTool />),
  "credit-card-interest-calculator": asTool(<CreditCardInterestTool />),
  "currency-exchange-calculator": asTool(<CurrencyExchangeTool />),
  "split-expense-calculator": asTool(<SplitExpenseTool />),
  "net-worth-calculator": asTool(<NetWorthTool />),
  "tip-percentage-calculator": asTool(<TipPercentageTool />),
  "sales-tax-calculator": asTool(<SalesTaxTool />),
  "vat-calculator": asTool(<VatTool />),
  "pay-raise-calculator": asTool(<PayRaiseTool />),
  "savings-goal-calculator": asTool(<SavingsGoalTool />),
  "invoice-generator": asTool(<InvoiceTool />),
  "receipt-generator": asTool(<ReceiptTool />),
  "quote-generator": asTool(<QuoteTool />),
  "purchase-order-generator": asTool(<PurchaseOrderTool />),
  "business-card-generator": asTool(<BusinessCardTool />),
  "meeting-agenda-generator": asTool(<AgendaTool />),
  "meeting-minutes-generator": asTool(<MinutesTool />),
  "project-timeline-generator": asTool(<TimelineTool />),
  "swot-analysis-template": asTool(<SwotTool />),
  "profit-loss-calculator": asTool(<ProfitLossTool />),
  "revenue-calculator": asTool(<RevenueTool />),
  "cost-calculator": asTool(<CostTool />),
  "break-even-analysis": asTool(<BreakEvenAnalysisTool />),
  "profit-margin-calculator": asTool(<ProfitMarginTool />),
  "employee-cost-calculator": asTool(<EmployeeCostTool />),
  "payroll-calculator": asTool(<PayrollTool />),
  "timesheet-generator": asTool(<TimesheetTool />),
  "working-hours-calculator": asTool(<WorkingHoursTool />),
  "overtime-hours-calculator": asTool(<OvertimeHoursTool />),
  "leave-balance-calculator": asTool(<LeaveBalanceTool />),
  "productivity-calculator": asTool(<ProductivityTool />),
  "hourly-rate-calculator": asTool(<HourlyRateTool />),
  "gpa-calculator": asTool(<GpaTool />),
  "cgpa-calculator": asTool(<CgpaTool />),
  "grade-calculator": asTool(<GradeTool />),
  "percentage-to-grade": asTool(<PctToGradeTool />),
  "grade-to-percentage": asTool(<GradeToPctTool />),
  "final-grade-calculator": asTool(<FinalGradeTool />),
  "exam-score-calculator": asTool(<ExamScoreTool />),
  "attendance-calculator": asTool(<AttendanceTool />),
  "required-attendance-calculator": asTool(<RequiredAttendanceTool />),
  "study-time-calculator": asTool(<StudyTimeTool />),
  "word-count-goal-calculator": asTool(<WordGoalTool />),
  "citation-generator": asTool(<CitationTool />),
  "apa-formatter": asTool(<ApaTool />),
  "mla-formatter": asTool(<MlaTool />),
  "chicago-formatter": asTool(<ChicagoTool />),
  "flashcard-generator": asTool(<FlashcardTool />),
  "quiz-generator": asTool(<QuizTool />),
  "question-generator": asTool(<QuestionGenTool />),
  "study-planner": asTool(<StudyPlannerTool />),
};

/* ---------- shared helpers ---------- */

const EDU = "Educational only — not financial advice.";

function money(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(n: number): string {
  return n.toFixed(2) + "%";
}

function monthsToYm(m: number): string {
  const y = Math.floor(m / 12);
  const r = m % 12;
  if (y === 0) return `${m} mo`;
  if (r === 0) return `${y} yr`;
  return `${y} yr ${r} mo`;
}

/** Standard amortizing-loan monthly payment. */
function loanPmt(principal: number, annualPct: number, years: number): number {
  const n = years * 12;
  if (n <= 0) return NaN;
  const r = annualPct / 100 / 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

interface LineItem {
  desc: string;
  qty: number;
  price: number;
}

function parseLineItems(text: string): LineItem[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const out: LineItem[] = [];
  for (const line of lines) {
    const parts = line.split(/[|,;]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const qty = Number(parts[parts.length - 2].replace(/,/g, ""));
      const price = Number(parts[parts.length - 1].replace(/,/g, "").replace(/^\$/, ""));
      if (Number.isFinite(qty) && Number.isFinite(price)) {
        out.push({ desc: parts.slice(0, parts.length - 2).join(", "), qty, price });
        continue;
      }
    }
    const m = /^(.*?)[x×]\s*([\d.,]+)\s*[@$]\s*([\d.,]+)\s*$/.exec(line);
    if (m) {
      const qty = Number(m[2].replace(/,/g, ""));
      const price = Number(m[3].replace(/,/g, ""));
      if (Number.isFinite(qty) && Number.isFinite(price)) {
        out.push({ desc: m[1].trim() || "Item", qty, price });
        continue;
      }
    }
    const nums = line.match(/[\d.,]+/g);
    if (nums && nums.length >= 2) {
      const qty = Number(nums[nums.length - 2].replace(/,/g, ""));
      const price = Number(nums[nums.length - 1].replace(/,/g, ""));
      if (Number.isFinite(qty) && Number.isFinite(price) && qty > 0) {
        const desc = line.slice(0, line.indexOf(nums[0])).replace(/[,|;:\-–—\s]+$/, "").trim() || line;
        out.push({ desc, qty, price });
        continue;
      }
    }
    out.push({ desc: line, qty: 1, price: 0 });
  }
  return out;
}

function itemsTable(items: LineItem[]): { text: string; subtotal: number } {
  let subtotal = 0;
  const rows = items.map((it, i) => {
    const t = it.qty * it.price;
    subtotal += t;
    return `${i + 1}. ${it.desc} — ${it.qty} x $${it.price.toFixed(2)} = $${t.toFixed(2)}`;
  });
  return { text: rows.join("\n"), subtotal };
}

function gradePoint(g: string): number | null {
  const map: Record<string, number> = {
    "A+": 4.0, A: 4.0, "A-": 3.7, "B+": 3.3, B: 3.0, "B-": 2.7,
    "C+": 2.3, C: 2.0, "C-": 1.7, "D+": 1.3, D: 1.0, F: 0,
  };
  return map[g] ?? null;
}

const LETTER_OPTS = [
  { value: "", label: "— skip —" },
  { value: "A+", label: "A+" }, { value: "A", label: "A" }, { value: "A-", label: "A-" },
  { value: "B+", label: "B+" }, { value: "B", label: "B" }, { value: "B-", label: "B-" },
  { value: "C+", label: "C+" }, { value: "C", label: "C" }, { value: "C-", label: "C-" },
  { value: "D+", label: "D+" }, { value: "D", label: "D" }, { value: "F", label: "F" },
];

function letterForScore(p: number): { letter: string; gpa: string } {
  if (p >= 97) return { letter: "A+", gpa: "4.0" };
  if (p >= 93) return { letter: "A", gpa: "4.0" };
  if (p >= 90) return { letter: "A-", gpa: "3.7" };
  if (p >= 87) return { letter: "B+", gpa: "3.3" };
  if (p >= 83) return { letter: "B", gpa: "3.0" };
  if (p >= 80) return { letter: "B-", gpa: "2.7" };
  if (p >= 77) return { letter: "C+", gpa: "2.3" };
  if (p >= 73) return { letter: "C", gpa: "2.0" };
  if (p >= 70) return { letter: "C-", gpa: "1.7" };
  if (p >= 67) return { letter: "D+", gpa: "1.3" };
  if (p >= 60) return { letter: "D", gpa: "1.0" };
  return { letter: "F", gpa: "0.0" };
}

function rangeForLetter(g: string): { range: string; mid: string } {
  const map: Record<string, { range: string; mid: string }> = {
    "A+": { range: "97–100", mid: "98.5" }, A: { range: "93–96", mid: "94.5" },
    "A-": { range: "90–92", mid: "91" }, "B+": { range: "87–89", mid: "88" },
    B: { range: "83–86", mid: "84.5" }, "B-": { range: "80–82", mid: "81" },
    "C+": { range: "77–79", mid: "78" }, C: { range: "73–76", mid: "74.5" },
    "C-": { range: "70–72", mid: "71" }, "D+": { range: "67–69", mid: "68" },
    D: { range: "60–66", mid: "63" }, F: { range: "0–59", mid: "29.5" },
  };
  return map[g] ?? { range: "—", mid: "—" };
}

function parseHm(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((s ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

/* ---------- FINANCE (29) ---------- */

function MortgageTool() {
  return (
    <Calc
      fields={[
        { key: "price", label: "Home price ($)", type: "number", def: "350000", required: true },
        { key: "down", label: "Down payment ($)", type: "number", def: "70000", required: true },
        { key: "rate", label: "Annual rate (%)", type: "number", def: "6.5", required: true },
        { key: "years", label: "Term (years)", type: "number", def: "30", required: true },
      ]}
      compute={(v) => {
        const price = req(v, "price", "Home price");
        if (typeof price !== "number") return price;
        const down = req(v, "down", "Down payment");
        if (typeof down !== "number") return down;
        const rate = req(v, "rate", "Annual rate");
        if (typeof rate !== "number") return rate;
        const years = req(v, "years", "Term");
        if (typeof years !== "number") return years;
        if (price <= 0 || years <= 0) return { error: "Price and term must be positive." };
        if (down < 0 || down >= price) return { error: "Down payment must be between 0 and the home price." };
        if (rate < 0 || rate > 30) return { error: "Rate must be between 0 and 30%." };
        const loan = price - down;
        const m = loanPmt(loan, rate, years);
        const total = m * years * 12;
        return {
          rows: [
            ["Monthly payment", money(m)],
            ["Loan amount", money(loan)],
            ["Total interest", money(total - loan)],
            ["Total paid", money(total)],
          ],
          note: "Principal + interest only (no taxes, insurance or fees). " + EDU,
        };
      }}
    />
  );
}

function LoanPaymentTool() {
  return (
    <Calc
      fields={[
        { key: "amt", label: "Loan amount ($)", type: "number", def: "20000", required: true },
        { key: "rate", label: "Annual rate (%)", type: "number", def: "7", required: true },
        { key: "years", label: "Term (years)", type: "number", def: "5", required: true },
      ]}
      compute={(v) => {
        const amt = req(v, "amt", "Loan amount");
        if (typeof amt !== "number") return amt;
        const rate = req(v, "rate", "Annual rate");
        if (typeof rate !== "number") return rate;
        const years = req(v, "years", "Term");
        if (typeof years !== "number") return years;
        if (amt <= 0 || years <= 0) return { error: "Amount and term must be positive." };
        if (rate < 0 || rate > 60) return { error: "Rate must be between 0 and 60%." };
        const m = loanPmt(amt, rate, years);
        const total = m * years * 12;
        return {
          rows: [
            ["Monthly payment", money(m)],
            ["Total interest", money(total - amt)],
            ["Total repaid", money(total)],
            ["Payments", String(Math.round(years * 12))],
          ],
          note: "Fixed-rate amortizing loan. " + EDU,
        };
      }}
    />
  );
}

function LoanInterestTool() {
  return (
    <Calc
      fields={[
        { key: "amt", label: "Loan amount ($)", type: "number", def: "20000", required: true },
        { key: "rate", label: "Annual rate (%)", type: "number", def: "7", required: true },
        { key: "years", label: "Term (years)", type: "number", def: "5", required: true },
      ]}
      compute={(v) => {
        const amt = req(v, "amt", "Loan amount");
        if (typeof amt !== "number") return amt;
        const rate = req(v, "rate", "Annual rate");
        if (typeof rate !== "number") return rate;
        const years = req(v, "years", "Term");
        if (typeof years !== "number") return years;
        if (amt <= 0 || years <= 0) return { error: "Amount and term must be positive." };
        if (rate < 0) return { error: "Rate cannot be negative." };
        const m = loanPmt(amt, rate, years);
        const total = m * years * 12;
        const interest = total - amt;
        return {
          rows: [
            ["Monthly payment", money(m)],
            ["Lifetime interest", money(interest)],
            ["Total repaid", money(total)],
            ["Daily interest equivalent", money(interest / (years * 365))],
          ],
          note: EDU,
        };
      }}
    />
  );
}

function AprTool() {
  return (
    <Calc
      fields={[
        { key: "nom", label: "Nominal rate (% p.a.)", type: "number", def: "6", required: true },
        {
          key: "freq", label: "Compounding per year", type: "select",
          options: [
            { value: "1", label: "Yearly (1)" }, { value: "2", label: "Semi-annual (2)" },
            { value: "4", label: "Quarterly (4)" }, { value: "12", label: "Monthly (12)" },
            { value: "365", label: "Daily (365)" },
          ],
        },
      ]}
      compute={(v) => {
        const nom = req(v, "nom", "Nominal rate");
        if (typeof nom !== "number") return nom;
        const m = Number(v.freq ?? "12");
        if (!Number.isFinite(m) || m <= 0) return { error: "Pick a compounding frequency." };
        if (nom < 0 || nom > 100) return { error: "Nominal rate must be between 0 and 100%." };
        const ear = (Math.pow(1 + nom / 100 / m, m) - 1) * 100;
        return {
          rows: [
            ["Effective APR", pct(ear)],
            ["Nominal rate", pct(nom)],
            ["Compounding", `${m}x per year`],
          ],
          note: "EAR = (1 + nominal/m)^m − 1. " + EDU,
        };
      }}
    />
  );
}

function RoiTool() {
  return (
    <Calc
      fields={[
        { key: "cost", label: "Amount invested ($)", type: "number", def: "1000", required: true },
        { key: "gain", label: "Amount returned ($)", type: "number", def: "1300", required: true },
      ]}
      compute={(v) => {
        const cost = req(v, "cost", "Amount invested");
        if (typeof cost !== "number") return cost;
        const gain = req(v, "gain", "Amount returned");
        if (typeof gain !== "number") return gain;
        if (cost <= 0) return { error: "Invested amount must be positive." };
        const profit = gain - cost;
        return {
          rows: [
            ["Profit / loss", money(profit)],
            ["ROI", pct((profit / cost) * 100)],
            ["Return multiple", (gain / cost).toFixed(2) + "x"],
          ],
          note: EDU,
        };
      }}
    />
  );
}

function InvestmentReturnTool() {
  return (
    <Calc
      fields={[
        { key: "p", label: "Initial lump sum ($)", type: "number", def: "5000", required: true },
        { key: "pmt", label: "Yearly contribution ($)", type: "number", def: "1200", required: true },
        { key: "rate", label: "Yearly growth (%)", type: "number", def: "7", required: true },
        { key: "years", label: "Years", type: "number", def: "10", required: true },
      ]}
      compute={(v) => {
        const p = req(v, "p", "Initial lump sum");
        if (typeof p !== "number") return p;
        const pmt = req(v, "pmt", "Yearly contribution");
        if (typeof pmt !== "number") return pmt;
        const rate = req(v, "rate", "Yearly growth");
        if (typeof rate !== "number") return rate;
        const years = req(v, "years", "Years");
        if (typeof years !== "number") return years;
        if (p < 0 || pmt < 0 || years <= 0 || years > 100) return { error: "Check amounts and years (1–100)." };
        const r = rate / 100;
        const fv = p * Math.pow(1 + r, years) + (r === 0 ? pmt * years : pmt * ((Math.pow(1 + r, years) - 1) / r));
        const paid = p + pmt * years;
        return {
          rows: [
            ["Future value", money(fv)],
            ["Total paid in", money(paid)],
            ["Growth earned", money(fv - paid)],
          ],
          note: "Fixed-rate projection, end-of-year contributions. " + EDU,
        };
      }}
    />
  );
}

function SavingsTool() {
  return (
    <Calc
      fields={[
        { key: "pmt", label: "Monthly deposit ($)", type: "number", def: "200", required: true },
        { key: "rate", label: "Annual rate (%)", type: "number", def: "4", required: true },
        { key: "years", label: "Years", type: "number", def: "5", required: true },
      ]}
      compute={(v) => {
        const pmt = req(v, "pmt", "Monthly deposit");
        if (typeof pmt !== "number") return pmt;
        const rate = req(v, "rate", "Annual rate");
        if (typeof rate !== "number") return rate;
        const years = req(v, "years", "Years");
        if (typeof years !== "number") return years;
        if (pmt < 0 || years <= 0 || years > 100) return { error: "Check deposit and years (1–100)." };
        const rm = rate / 100 / 12;
        const n = Math.round(years * 12);
        const fv = rm === 0 ? pmt * n : pmt * ((Math.pow(1 + rm, n) - 1) / rm);
        const dep = pmt * n;
        return {
          rows: [
            ["Final balance", money(fv)],
            ["Total deposits", money(dep)],
            ["Interest earned", money(fv - dep)],
          ],
          note: "Monthly deposits compounded monthly. " + EDU,
        };
      }}
    />
  );
}

function FutureValueTool() {
  return (
    <Calc
      fields={[
        { key: "pv", label: "Present amount ($)", type: "number", def: "1000", required: true },
        { key: "rate", label: "Annual rate (%)", type: "number", def: "5", required: true },
        { key: "years", label: "Years", type: "number", def: "10", required: true },
      ]}
      compute={(v) => {
        const pv = req(v, "pv", "Present amount");
        if (typeof pv !== "number") return pv;
        const rate = req(v, "rate", "Annual rate");
        if (typeof rate !== "number") return rate;
        const years = req(v, "years", "Years");
        if (typeof years !== "number") return years;
        if (years < 0 || years > 200) return { error: "Years must be 0–200." };
        const fv = pv * Math.pow(1 + rate / 100, years);
        return {
          rows: [
            ["Future value", money(fv)],
            ["Interest earned", money(fv - pv)],
            ["Growth", pct(pv === 0 ? 0 : ((fv - pv) / Math.abs(pv)) * 100)],
          ],
          note: EDU,
        };
      }}
    />
  );
}

function PresentValueTool() {
  return (
    <Calc
      fields={[
        { key: "fv", label: "Future amount ($)", type: "number", def: "10000", required: true },
        { key: "rate", label: "Annual rate (%)", type: "number", def: "5", required: true },
        { key: "years", label: "Years", type: "number", def: "10", required: true },
      ]}
      compute={(v) => {
        const fv = req(v, "fv", "Future amount");
        if (typeof fv !== "number") return fv;
        const rate = req(v, "rate", "Annual rate");
        if (typeof rate !== "number") return rate;
        const years = req(v, "years", "Years");
        if (typeof years !== "number") return years;
        if (years < 0 || years > 200) return { error: "Years must be 0–200." };
        const pv = fv / Math.pow(1 + rate / 100, years);
        return {
          rows: [
            ["Present value", money(pv)],
            ["Discount (time value)", money(fv - pv)],
          ],
          note: "PV = FV / (1 + r)^n. " + EDU,
        };
      }}
    />
  );
}

function CagrTool() {
  return (
    <Calc
      fields={[
        { key: "start", label: "Starting value ($)", type: "number", def: "10000", required: true },
        { key: "end", label: "Ending value ($)", type: "number", def: "16000", required: true },
        { key: "years", label: "Years", type: "number", def: "5", required: true },
      ]}
      compute={(v) => {
        const s = req(v, "start", "Starting value");
        if (typeof s !== "number") return s;
        const e = req(v, "end", "Ending value");
        if (typeof e !== "number") return e;
        const y = req(v, "years", "Years");
        if (typeof y !== "number") return y;
        if (s <= 0 || e < 0 || y <= 0) return { error: "Start must be positive; end and years must be valid." };
        const cagr = (Math.pow(e / s, 1 / y) - 1) * 100;
        return {
          rows: [
            ["CAGR", pct(cagr)],
            ["Total growth", pct(((e - s) / s) * 100)],
            ["Value multiple", (e / s).toFixed(2) + "x"],
          ],
          note: EDU,
        };
      }}
    />
  );
}

function InflationTool() {
  return (
    <Calc
      fields={[
        { key: "amt", label: "Today's amount ($)", type: "number", def: "100", required: true },
        { key: "rate", label: "Inflation rate (%/yr)", type: "number", def: "3", required: true },
        { key: "years", label: "Years", type: "number", def: "10", required: true },
      ]}
      compute={(v) => {
        const amt = req(v, "amt", "Today's amount");
        if (typeof amt !== "number") return amt;
        const rate = req(v, "rate", "Inflation rate");
        if (typeof rate !== "number") return rate;
        const years = req(v, "years", "Years");
        if (typeof years !== "number") return years;
        if (amt < 0 || years < 0) return { error: "Amount and years cannot be negative." };
        const future = amt * Math.pow(1 + rate / 100, years);
        const worth = amt / Math.pow(1 + rate / 100, years);
        return {
          rows: [
            ["Future price", money(future)],
            ["Purchasing power today of future $", money(worth)],
            ["Price increase", pct(((future - amt) / (amt === 0 ? 1 : amt)) * 100)],
          ],
          note: EDU,
        };
      }}
    />
  );
}

function SalaryTool() {
  return (
    <Calc
      fields={[{ key: "annual", label: "Annual salary ($)", type: "number", def: "60000", required: true }]}
      compute={(v) => {
        const a = req(v, "annual", "Annual salary");
        if (typeof a !== "number") return a;
        if (a < 0) return { error: "Salary cannot be negative." };
        return {
          rows: [
            ["Monthly", money(a / 12)],
            ["Biweekly", money(a / 26)],
            ["Weekly", money(a / 52)],
            ["Hourly (2080-hr year)", money(a / 2080)],
            ["Annual", money(a)],
          ],
          note: "Gross pay before tax; 2080-hour year. " + EDU,
        };
      }}
    />
  );
}

function HourlyToSalaryTool() {
  return (
    <Calc
      fields={[
        { key: "rate", label: "Hourly rate ($)", type: "number", def: "25", required: true },
        { key: "hrs", label: "Hours per week", type: "number", def: "40", required: true },
      ]}
      compute={(v) => {
        const r = req(v, "rate", "Hourly rate");
        if (typeof r !== "number") return r;
        const h = req(v, "hrs", "Hours per week");
        if (typeof h !== "number") return h;
        if (r < 0 || h < 0 || h > 168) return { error: "Check rate and weekly hours (0–168)." };
        const weekly = r * h;
        const annual = weekly * 52;
        return {
          rows: [
            ["Annual", money(annual)],
            ["Monthly", money(annual / 12)],
            ["Weekly", money(weekly)],
          ],
          note: "Gross figures before tax. " + EDU,
        };
      }}
    />
  );
}

function SalaryToHourlyTool() {
  return (
    <Calc
      fields={[
        { key: "sal", label: "Annual salary ($)", type: "number", def: "60000", required: true },
        { key: "hrs", label: "Hours per week", type: "number", def: "40", required: true },
      ]}
      compute={(v) => {
        const s = req(v, "sal", "Annual salary");
        if (typeof s !== "number") return s;
        const h = req(v, "hrs", "Hours per week");
        if (typeof h !== "number") return h;
        if (s < 0 || h <= 0 || h > 168) return { error: "Check salary and weekly hours." };
        const hourly = s / (h * 52);
        return {
          rows: [
            ["Hourly rate", money(hourly)],
            ["1.5x overtime rate", money(hourly * 1.5)],
            ["Weekly", money(s / 52)],
          ],
          note: EDU,
        };
      }}
    />
  );
}

function OvertimePayTool() {
  return (
    <Calc
      fields={[
        { key: "rate", label: "Hourly rate ($)", type: "number", def: "20", required: true },
        { key: "reg", label: "Regular hours", type: "number", def: "40", required: true },
        { key: "ot", label: "Overtime hours", type: "number", def: "5", required: true },
        { key: "mult", label: "OT multiplier", type: "number", def: "1.5", required: true },
      ]}
      compute={(v) => {
        const r = req(v, "rate", "Hourly rate");
        if (typeof r !== "number") return r;
        const reg = req(v, "reg", "Regular hours");
        if (typeof reg !== "number") return reg;
        const ot = req(v, "ot", "Overtime hours");
        if (typeof ot !== "number") return ot;
        const mult = req(v, "mult", "OT multiplier");
        if (typeof mult !== "number") return mult;
        if (r < 0 || reg < 0 || ot < 0 || mult < 0) return { error: "Values cannot be negative." };
        const regPay = r * reg;
        const otPay = r * mult * ot;
        return {
          rows: [
            ["Regular pay", money(regPay)],
            ["Overtime pay", money(otPay)],
            ["Paycheck total", money(regPay + otPay)],
          ],
          note: "Gross pay before tax. " + EDU,
        };
      }}
    />
  );
}

function CommissionTool() {
  return (
    <Calc
      fields={[
        { key: "sales", label: "Sales ($)", type: "number", def: "50000", required: true },
        { key: "rate", label: "Commission rate (%)", type: "number", def: "5", required: true },
        { key: "base", label: "Base salary ($)", type: "number", def: "3000" },
      ]}
      compute={(v) => {
        const s = req(v, "sales", "Sales");
        if (typeof s !== "number") return s;
        const r = req(v, "rate", "Commission rate");
        if (typeof r !== "number") return r;
        const base = num(v, "base") ?? 0;
        if (s < 0 || r < 0) return { error: "Sales and rate cannot be negative." };
        const comm = (s * r) / 100;
        return {
          rows: [
            ["Commission earned", money(comm)],
            ["Total pay", money(comm + base)],
          ],
          note: EDU,
        };
      }}
    />
  );
}

function BreakEvenTool() {
  return (
    <Calc
      fields={[
        { key: "fixed", label: "Fixed costs ($)", type: "number", def: "10000", required: true },
        { key: "price", label: "Price per unit ($)", type: "number", def: "25", required: true },
        { key: "var", label: "Variable cost per unit ($)", type: "number", def: "15", required: true },
      ]}
      compute={(v) => {
        const f = req(v, "fixed", "Fixed costs");
        if (typeof f !== "number") return f;
        const p = req(v, "price", "Price per unit");
        if (typeof p !== "number") return p;
        const vc = req(v, "var", "Variable cost per unit");
        if (typeof vc !== "number") return vc;
        if (f < 0) return { error: "Fixed costs cannot be negative." };
        const contrib = p - vc;
        if (contrib <= 0) return { error: "Price must exceed variable cost to break even." };
        const units = f / contrib;
        return {
          rows: [
            ["Break-even units", Math.ceil(units).toLocaleString()],
            ["Break-even revenue", money(Math.ceil(units) * p)],
            ["Contribution per unit", money(contrib)],
          ],
          note: EDU,
        };
      }}
    />
  );
}

function BudgetTool() {
  return (
    <Calc
      fields={[
        { key: "income", label: "Monthly income ($)", type: "number", def: "4000", required: true },
        { key: "rent", label: "Rent / housing ($)", type: "number", def: "1200" },
        { key: "food", label: "Food ($)", type: "number", def: "500" },
        { key: "trans", label: "Transport ($)", type: "number", def: "300" },
        { key: "util", label: "Utilities ($)", type: "number", def: "200" },
        { key: "extra", label: "Other spending ($)", type: "number", def: "400" },
      ]}
      compute={(v) => {
        const income = req(v, "income", "Monthly income");
        if (typeof income !== "number") return income;
        if (income <= 0) return { error: "Income must be positive." };
        const parts: [string, number][] = [];
        for (const k of ["rent", "food", "trans", "util", "extra"] as const) {
          const n = num(v, k) ?? 0;
          if (n < 0) return { error: "Expenses cannot be negative." };
          parts.push([k, n]);
        }
        const spent = parts.reduce((a, [, x]) => a + x, 0);
        const left = income - spent;
        return {
          rows: [
            ["Total spending", money(spent)],
            ["Money left", money(left)],
            ["Savings rate", pct((left / income) * 100)],
          ],
          note: "Rent, food, transport, utilities and extras summed. " + EDU,
        };
      }}
    />
  );
}

function MonthlyBudgetPlannerTool() {
  return (
    <Gen
      button="Generate budget plan"
      fileName="monthly-budget.txt"
      fields={[
        { key: "name", label: "Name (optional)", type: "text", placeholder: "Alex" },
        { key: "income", label: "Monthly income ($)", type: "number", def: "4000", required: true },
        { key: "rent", label: "Rent / housing ($)", type: "number", def: "1200" },
        { key: "food", label: "Food ($)", type: "number", def: "500" },
        { key: "trans", label: "Transport ($)", type: "number", def: "300" },
        { key: "util", label: "Utilities ($)", type: "number", def: "200" },
        { key: "extra", label: "Other spending ($)", type: "number", def: "400" },
        { key: "goal", label: "Savings goal ($, optional)", type: "number", placeholder: "500" },
      ]}
      generate={(v) => {
        const income = Number((v.income ?? "").replace(/,/g, ""));
        if (!Number.isFinite(income) || income <= 0) return { error: "Enter a valid monthly income." };
        const g = (k: string) => {
          const n = Number((v[k] ?? "").replace(/,/g, ""));
          return Number.isFinite(n) && n >= 0 ? n : 0;
        };
        const rent = g("rent");
        const food = g("food");
        const trans = g("trans");
        const util = g("util");
        const extra = g("extra");
        const spent = rent + food + trans + util + extra;
        const left = income - spent;
        const goalRaw = (v.goal ?? "").trim();
        const goal = goalRaw ? Number(goalRaw.replace(/,/g, "")) : NaN;
        const who = (v.name ?? "").trim();
        const lines = [
          "MONTHLY BUDGET PLAN",
          who ? `Prepared for: ${who}` : "Personal monthly budget",
          `Date: ${new Date().toLocaleDateString()}`,
          "",
          `Income: $${income.toFixed(2)}`,
          "",
          "Planned spending:",
          `- Rent / housing: $${rent.toFixed(2)}`,
          `- Food: $${food.toFixed(2)}`,
          `- Transport: $${trans.toFixed(2)}`,
          `- Utilities: $${util.toFixed(2)}`,
          `- Other: $${extra.toFixed(2)}`,
          `Total spending: $${spent.toFixed(2)}`,
          `Remaining: $${left.toFixed(2)} (${((left / income) * 100).toFixed(1)}% savings rate)`,
          "",
          Number.isFinite(goal) && goal > 0
            ? left >= goal
              ? `Goal check: on track — remaining $${left.toFixed(2)} covers your $${goal.toFixed(2)} goal.`
              : `Goal check: short by $${(goal - left).toFixed(2)} — trim spending or raise income to hit $${goal.toFixed(2)}.`
            : "Tip: set a savings goal (e.g. 20% of income) and pay yourself first.",
          "",
          "Educational only — not financial advice.",
        ];
        return lines.join("\n");
      }}
    />
  );
}

function DebtPayoffTool() {
  return (
    <Calc
      fields={[
        { key: "bal", label: "Balance ($)", type: "number", def: "5000", required: true },
        { key: "apr", label: "APR (%)", type: "number", def: "19.99", required: true },
        { key: "pay", label: "Monthly payment ($)", type: "number", def: "200", required: true },
      ]}
      compute={(v) => {
        const bal = req(v, "bal", "Balance");
        if (typeof bal !== "number") return bal;
        const apr = req(v, "apr", "APR");
        if (typeof apr !== "number") return apr;
        const pay = req(v, "pay", "Monthly payment");
        if (typeof pay !== "number") return pay;
        if (bal <= 0 || pay <= 0) return { error: "Balance and payment must be positive." };
        if (apr < 0) return { error: "APR cannot be negative." };
        const r = apr / 100 / 12;
        if (r === 0) {
          const m = Math.ceil(bal / pay);
          return {
            rows: [["Months to payoff", String(m)], ["Total interest", money(0)], ["True cost", money(bal)]],
            note: EDU,
          };
        }
        if (pay <= r * bal) return { error: "Payment is too small — it does not cover monthly interest." };
        const m = Math.ceil(-Math.log(1 - (r * bal) / pay) / Math.log(1 + r));
        const total = m * pay;
        return {
          rows: [
            ["Months to payoff", `${m} (${monthsToYm(m)})`],
            ["Total interest", money(total - bal)],
            ["True cost of debt", money(total)],
          ],
          note: "Fixed payment, no new charges. " + EDU,
        };
      }}
    />
  );
}

function CreditCardInterestTool() {
  return (
    <Calc
      fields={[
        { key: "bal", label: "Card balance ($)", type: "number", def: "3000", required: true },
        { key: "apr", label: "APR (%)", type: "number", def: "24.99", required: true },
        { key: "pay", label: "Monthly payment ($)", type: "number", def: "150", required: true },
      ]}
      compute={(v) => {
        const bal = req(v, "bal", "Card balance");
        if (typeof bal !== "number") return bal;
        const apr = req(v, "apr", "APR");
        if (typeof apr !== "number") return apr;
        const pay = req(v, "pay", "Monthly payment");
        if (typeof pay !== "number") return pay;
        if (bal <= 0 || pay <= 0) return { error: "Balance and payment must be positive." };
        if (apr < 0) return { error: "APR cannot be negative." };
        const r = apr / 100 / 12;
        if (r === 0) {
          const m = Math.ceil(bal / pay);
          return {
            rows: [["Months to clear", String(m)], ["Interest paid", money(0)], ["Total repaid", money(bal)]],
            note: EDU,
          };
        }
        if (pay <= r * bal) return { error: "Payment does not cover monthly interest — the balance would never clear." };
        const m = Math.ceil(-Math.log(1 - (r * bal) / pay) / Math.log(1 + r));
        const total = m * pay;
        return {
          rows: [
            ["Months to clear", `${m} (${monthsToYm(m)})`],
            ["Interest paid", money(total - bal)],
            ["Total repaid", money(total)],
          ],
          note: "No new purchases assumed. " + EDU,
        };
      }}
    />
  );
}

function CurrencyExchangeTool() {
  return (
    <Calc
      fields={[
        { key: "amt", label: "Amount", type: "number", def: "100", required: true },
        { key: "from", label: "From currency (code)", type: "text", def: "USD", required: true },
        { key: "to", label: "To currency (code)", type: "text", def: "EUR", required: true },
        { key: "rate", label: "Exchange rate (1 FROM = ? TO)", type: "number", def: "0.92", required: true, hint: "Enter the rate yourself — no live rates used." },
      ]}
      compute={(v) => {
        const amt = req(v, "amt", "Amount");
        if (typeof amt !== "number") return amt;
        const rate = req(v, "rate", "Exchange rate");
        if (typeof rate !== "number") return rate;
        const from = (v.from ?? "").trim().toUpperCase() || "FROM";
        const to = (v.to ?? "").trim().toUpperCase() || "TO";
        if (amt < 0 || rate <= 0) return { error: "Amount must be ≥ 0 and rate must be positive." };
        const out = amt * rate;
        return {
          rows: [
            ["Converted", `${out.toFixed(2)} ${to}`],
            ["Rate used", `1 ${from} = ${rate} ${to}`],
            ["Reverse rate", `1 ${to} = ${(1 / rate).toFixed(6)} ${from}`],
          ],
          note: "Manual rate you entered — no live market data. " + EDU,
        };
      }}
    />
  );
}

function SplitExpenseTool() {
  return (
    <Calc
      fields={[
        { key: "bill", label: "Bill ($)", type: "number", def: "120", required: true },
        { key: "tip", label: "Tip (%)", type: "number", def: "15" },
        { key: "n", label: "People", type: "number", def: "4", required: true },
      ]}
      compute={(v) => {
        const bill = req(v, "bill", "Bill");
        if (typeof bill !== "number") return bill;
        const tip = num(v, "tip") ?? 0;
        const n = req(v, "n", "People");
        if (typeof n !== "number") return n;
        if (bill < 0 || tip < 0) return { error: "Bill and tip cannot be negative." };
        if (!Number.isInteger(n) || n < 1 || n > 1000) return { error: "People must be a whole number 1–1000." };
        const tipAmt = (bill * tip) / 100;
        const total = bill + tipAmt;
        return {
          rows: [
            ["Per person", money(total / n)],
            ["Tip total", money(tipAmt)],
            ["Grand total", money(total)],
          ],
          note: "Split evenly. " + EDU,
        };
      }}
    />
  );
}

function NetWorthTool() {
  return (
    <Calc
      fields={[
        { key: "cash", label: "Cash & bank ($)", type: "number", def: "8000" },
        { key: "inv", label: "Investments ($)", type: "number", def: "15000" },
        { key: "prop", label: "Property value ($)", type: "number", def: "200000" },
        { key: "other", label: "Other assets ($)", type: "number", def: "5000" },
        { key: "debt", label: "Total debts ($)", type: "number", def: "150000", required: true },
      ]}
      compute={(v) => {
        let assets = 0;
        for (const k of ["cash", "inv", "prop", "other"] as const) {
          const n = num(v, k) ?? 0;
          if (n < 0) return { error: "Asset values cannot be negative." };
          assets += n;
        }
        const debt = req(v, "debt", "Total debts");
        if (typeof debt !== "number") return debt;
        if (debt < 0) return { error: "Debts cannot be negative." };
        return {
          rows: [
            ["Net worth", money(assets - debt)],
            ["Total assets", money(assets)],
            ["Total debts", money(debt)],
            ["Debt-to-asset ratio", assets === 0 ? "—" : pct((debt / assets) * 100)],
          ],
          note: "Assets minus debts. " + EDU,
        };
      }}
    />
  );
}

function TipPercentageTool() {
  return (
    <Calc
      fields={[
        { key: "bill", label: "Bill ($)", type: "number", def: "80", required: true },
        { key: "tip", label: "Cash tip left ($)", type: "number", def: "12", required: true },
        { key: "n", label: "People sharing", type: "number", def: "2" },
      ]}
      compute={(v) => {
        const bill = req(v, "bill", "Bill");
        if (typeof bill !== "number") return bill;
        const tip = req(v, "tip", "Cash tip left");
        if (typeof tip !== "number") return tip;
        const n = num(v, "n") ?? 1;
        if (bill <= 0) return { error: "Bill must be positive." };
        if (tip < 0) return { error: "Tip cannot be negative." };
        if (!Number.isInteger(n) || n < 1) return { error: "People must be a whole number ≥ 1." };
        return {
          rows: [
            ["Tip percentage", pct((tip / bill) * 100)],
            ["Total with tip", money(bill + tip)],
            ["Per-person share", money((bill + tip) / n)],
          ],
          note: EDU,
        };
      }}
    />
  );
}

function SalesTaxTool() {
  return (
    <Calc
      fields={[
        { key: "price", label: "Price before tax ($)", type: "number", def: "100", required: true },
        { key: "rate", label: "Sales-tax rate (%)", type: "number", def: "8", required: true },
      ]}
      compute={(v) => {
        const p = req(v, "price", "Price before tax");
        if (typeof p !== "number") return p;
        const r = req(v, "rate", "Sales-tax rate");
        if (typeof r !== "number") return r;
        if (p < 0 || r < 0) return { error: "Price and rate cannot be negative." };
        const tax = (p * r) / 100;
        return {
          rows: [
            ["Tax owed", money(tax)],
            ["Checkout total", money(p + tax)],
          ],
          note: EDU,
        };
      }}
    />
  );
}

function VatTool() {
  return (
    <Calc
      fields={[
        { key: "amt", label: "Amount ($)", type: "number", def: "100", required: true },
        { key: "rate", label: "VAT rate (%)", type: "number", def: "20", required: true },
        {
          key: "mode", label: "Direction", type: "select",
          options: [
            { value: "add", label: "Add VAT to net" },
            { value: "strip", label: "Extract VAT from gross" },
          ],
        },
      ]}
      compute={(v) => {
        const a = req(v, "amt", "Amount");
        if (typeof a !== "number") return a;
        const r = req(v, "rate", "VAT rate");
        if (typeof r !== "number") return r;
        if (a < 0 || r < 0) return { error: "Amount and rate cannot be negative." };
        if (v.mode === "strip") {
          const net = a / (1 + r / 100);
          return {
            rows: [["Net", money(net)], ["VAT", money(a - net)], ["Gross", money(a)]],
            note: EDU,
          };
        }
        const vat = (a * r) / 100;
        return {
          rows: [["Net", money(a)], ["VAT", money(vat)], ["Gross", money(a + vat)]],
          note: EDU,
        };
      }}
    />
  );
}

function PayRaiseTool() {
  return (
    <Calc
      fields={[
        { key: "pay", label: "Current pay ($)", type: "number", def: "60000", required: true },
        { key: "pct", label: "Raise (%)", type: "number", def: "5", required: true },
      ]}
      compute={(v) => {
        const pay = req(v, "pay", "Current pay");
        if (typeof pay !== "number") return pay;
        const p = req(v, "pct", "Raise");
        if (typeof p !== "number") return p;
        if (pay < 0) return { error: "Pay cannot be negative." };
        const inc = (pay * p) / 100;
        return {
          rows: [
            ["New salary", money(pay + inc)],
            ["Yearly increase", money(inc)],
            ["Monthly difference", money(inc / 12)],
          ],
          note: EDU,
        };
      }}
    />
  );
}

function SavingsGoalTool() {
  return (
    <Calc
      fields={[
        { key: "goal", label: "Savings goal ($)", type: "number", def: "10000", required: true },
        { key: "pmt", label: "Monthly deposit ($)", type: "number", def: "300", required: true },
        { key: "rate", label: "Annual rate (%)", type: "number", def: "4" },
      ]}
      compute={(v) => {
        const goal = req(v, "goal", "Savings goal");
        if (typeof goal !== "number") return goal;
        const pmt = req(v, "pmt", "Monthly deposit");
        if (typeof pmt !== "number") return pmt;
        const rate = num(v, "rate") ?? 0;
        if (goal <= 0 || pmt <= 0) return { error: "Goal and deposit must be positive." };
        const rm = rate / 100 / 12;
        let n: number;
        if (rm === 0) n = Math.ceil(goal / pmt);
        else {
          const inner = 1 + (goal * rm) / pmt;
          if (inner <= 1) return { error: "Deposit too small to reach the goal." };
          n = Math.ceil(Math.log(inner) / Math.log(1 + rm));
        }
        if (!Number.isFinite(n) || n > 1200) return { error: "Goal unreachable with this deposit — raise the deposit." };
        const dep = n * pmt;
        const year = new Date().getFullYear() + Math.floor(n / 12);
        return {
          rows: [
            ["Months needed", `${n} (${monthsToYm(n)})`],
            ["Total deposits", money(dep)],
            ["Interest earned (est.)", money(Math.max(0, goal - dep))],
            ["Completion year", String(year)],
          ],
          note: "Assumes deposits at each month-end. " + EDU,
        };
      }}
    />
  );
}

/* ---------- BUSINESS (22) ---------- */

function InvoiceTool() {
  return (
    <Gen
      button="Generate invoice"
      fileName="invoice.txt"
      fields={[
        { key: "seller", label: "Seller name", type: "text", placeholder: "Acme Studio", required: true },
        { key: "client", label: "Client name", type: "text", placeholder: "Client Co.", required: true },
        { key: "num", label: "Invoice no.", type: "text", def: "INV-001" },
        { key: "date", label: "Date", type: "date", required: true },
        { key: "items", label: "Line items (one per line: description, qty, price)", type: "textarea", placeholder: "Design work, 2, 150\nHosting, 1, 60", required: true },
        { key: "tax", label: "Tax (%)", type: "number", def: "0" },
        { key: "notes", label: "Notes (optional)", type: "text", placeholder: "Payment due in 14 days" },
      ]}
      generate={(v) => {
        const items = parseLineItems(v.items ?? "");
        if (items.length === 0) return { error: "Add at least one line item." };
        const { text, subtotal } = itemsTable(items);
        const taxPct = Number((v.tax ?? "").replace(/,/g, "")) || 0;
        if (taxPct < 0) return { error: "Tax cannot be negative." };
        const tax = (subtotal * taxPct) / 100;
        const total = subtotal + tax;
        return [
          `INVOICE ${(v.num ?? "").trim() || "INV-001"}`,
          `Date: ${(v.date ?? "").trim()}`,
          `From: ${(v.seller ?? "").trim()}`,
          `Bill to: ${(v.client ?? "").trim()}`,
          "",
          "Items:",
          text,
          "",
          `Subtotal: $${subtotal.toFixed(2)}`,
          `Tax (${taxPct}%): $${tax.toFixed(2)}`,
          `TOTAL DUE: $${total.toFixed(2)}`,
          (v.notes ?? "").trim() ? `\nNotes: ${(v.notes ?? "").trim()}` : "",
        ].filter((l) => l !== "").join("\n");
      }}
    />
  );
}

function ReceiptTool() {
  return (
    <Gen
      button="Generate receipt"
      fileName="receipt.txt"
      fields={[
        { key: "seller", label: "Received by", type: "text", placeholder: "Acme Studio", required: true },
        { key: "payer", label: "Received from", type: "text", placeholder: "Jane Doe", required: true },
        { key: "num", label: "Receipt no.", type: "text", def: "RCT-001" },
        { key: "date", label: "Date", type: "date", required: true },
        { key: "method", label: "Payment method", type: "text", def: "Cash" },
        { key: "items", label: "Items paid for (one per line: description, qty, price)", type: "textarea", placeholder: "Consulting, 3, 100", required: true },
        { key: "tax", label: "Tax (%)", type: "number", def: "0" },
      ]}
      generate={(v) => {
        const items = parseLineItems(v.items ?? "");
        if (items.length === 0) return { error: "Add at least one item." };
        const { text, subtotal } = itemsTable(items);
        const taxPct = Number((v.tax ?? "").replace(/,/g, "")) || 0;
        const tax = (subtotal * taxPct) / 100;
        return [
          `PAYMENT RECEIPT ${(v.num ?? "").trim() || "RCT-001"}`,
          `Date: ${(v.date ?? "").trim()}`,
          `Received from: ${(v.payer ?? "").trim()}`,
          `Received by: ${(v.seller ?? "").trim()}`,
          `Method: ${(v.method ?? "").trim() || "Cash"}`,
          "",
          "Items:",
          text,
          "",
          `Subtotal: $${subtotal.toFixed(2)}`,
          `Tax: $${tax.toFixed(2)}`,
          `TOTAL RECEIVED: $${(subtotal + tax).toFixed(2)}`,
          "",
          "Thank you for your payment.",
        ].join("\n");
      }}
    />
  );
}

function QuoteTool() {
  return (
    <Gen
      button="Generate quote"
      fileName="quote.txt"
      fields={[
        { key: "seller", label: "Your business", type: "text", placeholder: "Acme Studio", required: true },
        { key: "client", label: "Client", type: "text", placeholder: "Client Co.", required: true },
        { key: "num", label: "Quote no.", type: "text", def: "Q-001" },
        { key: "valid", label: "Valid until", type: "date", required: true },
        { key: "items", label: "Line items (one per line: description, qty, price)", type: "textarea", placeholder: "Website build, 1, 2000", required: true },
        { key: "tax", label: "Tax (%)", type: "number", def: "0" },
        { key: "terms", label: "Terms", type: "text", def: "Valid 30 days. 50% deposit to begin." },
      ]}
      generate={(v) => {
        const items = parseLineItems(v.items ?? "");
        if (items.length === 0) return { error: "Add at least one line item." };
        const { text, subtotal } = itemsTable(items);
        const taxPct = Number((v.tax ?? "").replace(/,/g, "")) || 0;
        const total = subtotal * (1 + taxPct / 100);
        return [
          `QUOTATION ${(v.num ?? "").trim() || "Q-001"}`,
          `From: ${(v.seller ?? "").trim()}  To: ${(v.client ?? "").trim()}`,
          `Valid until: ${(v.valid ?? "").trim()}`,
          "",
          "Estimate:",
          text,
          "",
          `Subtotal: $${subtotal.toFixed(2)}`,
          `Tax (${taxPct}%): $${(total - subtotal).toFixed(2)}`,
          `QUOTED TOTAL: $${total.toFixed(2)}`,
          "",
          `Terms: ${(v.terms ?? "").trim()}`,
        ].join("\n");
      }}
    />
  );
}

function PurchaseOrderTool() {
  return (
    <Gen
      button="Generate purchase order"
      fileName="purchase-order.txt"
      fields={[
        { key: "buyer", label: "Buyer", type: "text", placeholder: "Acme Studio", required: true },
        { key: "supplier", label: "Supplier", type: "text", placeholder: "Supply Co.", required: true },
        { key: "num", label: "PO number", type: "text", def: "PO-001" },
        { key: "date", label: "Date", type: "date", required: true },
        { key: "items", label: "Line items (one per line: description, qty, price)", type: "textarea", placeholder: "Paper A4, 10, 6.5", required: true },
        { key: "delivery", label: "Delivery notes", type: "text", placeholder: "Deliver to warehouse dock, Mon–Fri" },
      ]}
      generate={(v) => {
        const items = parseLineItems(v.items ?? "");
        if (items.length === 0) return { error: "Add at least one line item." };
        const { text, subtotal } = itemsTable(items);
        return [
          `PURCHASE ORDER ${(v.num ?? "").trim() || "PO-001"}`,
          `Date: ${(v.date ?? "").trim()}`,
          `Buyer: ${(v.buyer ?? "").trim()}`,
          `Supplier: ${(v.supplier ?? "").trim()}`,
          "",
          "Ordered items:",
          text,
          "",
          `ORDER TOTAL: $${subtotal.toFixed(2)}`,
          (v.delivery ?? "").trim() ? `Delivery: ${(v.delivery ?? "").trim()}` : "",
          "Authorised signature: ____________________",
        ].filter((l) => l !== "").join("\n");
      }}
    />
  );
}

function BusinessCardTool() {
  return (
    <Gen
      button="Generate card"
      fileName="business-card.txt"
      fields={[
        { key: "name", label: "Full name", type: "text", placeholder: "Jane Doe", required: true },
        { key: "role", label: "Role", type: "text", placeholder: "Designer" },
        { key: "co", label: "Company", type: "text", placeholder: "Acme Studio" },
        { key: "phone", label: "Phone", type: "text", placeholder: "+1 555 0100" },
        { key: "email", label: "Email", type: "text", placeholder: "jane@example.com" },
        { key: "web", label: "Website", type: "text", placeholder: "example.com" },
      ]}
      generate={(v) => {
        const name = (v.name ?? "").trim();
        if (!name) return { error: "Name is required." };
        const role = (v.role ?? "").trim();
        const co = (v.co ?? "").trim();
        const phone = (v.phone ?? "").trim();
        const email = (v.email ?? "").trim();
        const web = (v.web ?? "").trim();
        const bar = "+".padEnd(38, "-") + "+";
        const pad = (s: string) => `| ${s.slice(0, 34).padEnd(34)} |`;
        return [
          "CONTACT (vCard-style):",
          `FN:${name}`,
          role ? `TITLE:${role}` : "",
          co ? `ORG:${co}` : "",
          phone ? `TEL:${phone}` : "",
          email ? `EMAIL:${email}` : "",
          web ? `URL:${web}` : "",
          "",
          "Printable card layout:",
          bar,
          pad(name),
          pad(role || co || ""),
          pad(co && role ? co : ""),
          pad(phone ? `Tel: ${phone}` : ""),
          pad(email ? `Email: ${email}` : ""),
          pad(web),
          bar,
        ].filter((l) => l !== "").join("\n");
      }}
    />
  );
}

function AgendaTool() {
  return (
    <Gen
      button="Generate agenda"
      fileName="meeting-agenda.txt"
      fields={[
        { key: "title", label: "Meeting title", type: "text", placeholder: "Weekly sync", required: true },
        { key: "when", label: "Date & time", type: "text", placeholder: "Mon 10:00, Room A" },
        { key: "people", label: "Attendees (comma separated)", type: "text", placeholder: "Jane, Sam, Lee" },
        { key: "topics", label: "Topics (one per line: topic, minutes)", type: "textarea", placeholder: "Updates, 10\nRoadmap, 20\nRisks, 10", required: true },
      ]}
      generate={(v) => {
        const title = (v.title ?? "").trim();
        if (!title) return { error: "Meeting title is required." };
        const topics = (v.topics ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
        if (topics.length === 0) return { error: "Add at least one topic." };
        let total = 0;
        const rows = topics.map((t, i) => {
          const m = t.match(/([\d.]+)\s*(min|m)?\s*$/i);
          const mins = m ? Number(m[1]) : 10;
          total += Number.isFinite(mins) ? mins : 10;
          return `${i + 1}. ${t}`;
        });
        return [
          `MEETING AGENDA: ${title}`,
          (v.when ?? "").trim() ? `When: ${(v.when ?? "").trim()}` : "",
          (v.people ?? "").trim() ? `Attendees: ${(v.people ?? "").trim()}` : "",
          `Total time: ${total} min`,
          "",
          "Topics:",
          ...rows,
          "",
          "Please read any pre-shared notes before the meeting.",
        ].filter((l) => l !== "").join("\n");
      }}
    />
  );
}

function MinutesTool() {
  return (
    <Gen
      button="Generate minutes"
      fileName="meeting-minutes.txt"
      fields={[
        { key: "title", label: "Meeting title", type: "text", placeholder: "Weekly sync", required: true },
        { key: "date", label: "Date", type: "date", required: true },
        { key: "people", label: "Attendees", type: "text", placeholder: "Jane, Sam, Lee", required: true },
        { key: "notes", label: "Discussion notes (one per line)", type: "textarea", placeholder: "Agreed launch date…", required: true },
        { key: "decisions", label: "Decisions (one per line)", type: "textarea", placeholder: "Ship v2 on Friday" },
        { key: "actions", label: "Action items (one per line: who — what)", type: "textarea", placeholder: "Sam — draft release notes" },
      ]}
      generate={(v) => {
        if (!(v.title ?? "").trim()) return { error: "Meeting title is required." };
        if (!(v.notes ?? "").trim()) return { error: "Add discussion notes." };
        const list = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean).map((l, i) => `${i + 1}. ${l}`);
        const decisions = list(v.decisions ?? "");
        const actions = list(v.actions ?? "");
        return [
          `MINUTES OF MEETING: ${(v.title ?? "").trim()}`,
          `Date: ${(v.date ?? "").trim()}`,
          `Attendees: ${(v.people ?? "").trim()}`,
          "",
          "Discussion:",
          ...list(v.notes ?? ""),
          "",
          "Decisions:",
          ...(decisions.length ? decisions : ["(none recorded)"]),
          "",
          "Action items:",
          ...(actions.length ? actions : ["(none recorded)"]),
        ].join("\n");
      }}
    />
  );
}

function TimelineTool() {
  return (
    <Gen
      button="Generate timeline"
      fileName="project-timeline.txt"
      fields={[
        { key: "project", label: "Project name", type: "text", placeholder: "Website relaunch", required: true },
        { key: "start", label: "Start date", type: "date", required: true },
        { key: "miles", label: "Milestones (one per line: name, days from start)", type: "textarea", placeholder: "Kickoff, 0\nDesign done, 14\nLaunch, 45", required: true },
      ]}
      generate={(v) => {
        const project = (v.project ?? "").trim();
        if (!project) return { error: "Project name is required." };
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((v.start ?? "").trim());
        if (!m) return { error: "Enter a valid start date." };
        const start = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        const lines = (v.miles ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) return { error: "Add at least one milestone." };
        const rows: { day: number; name: string; date: Date }[] = [];
        for (const line of lines) {
          const parts = line.split(/[,|;]/).map((p) => p.trim());
          const day = Number(parts[parts.length - 1]);
          if (!Number.isFinite(day) || day < 0) return { error: `Milestone needs a day offset number: “${line}”.` };
          const name = parts.length > 1 ? parts.slice(0, -1).join(", ") : line;
          const d = new Date(start);
          d.setDate(d.getDate() + Math.round(day));
          rows.push({ day: Math.round(day), name, date: d });
        }
        rows.sort((a, b) => a.day - b.day);
        const fmt = (d: Date) => d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
        return [
          `PROJECT TIMELINE: ${project}`,
          `Start: ${fmt(start)}`,
          "",
          ...rows.map((r, i) => `${i + 1}. Day ${r.day} (week ${Math.floor(r.day / 7) + 1}) — ${r.name} — ${fmt(r.date)}`),
        ].join("\n");
      }}
    />
  );
}

function SwotTool() {
  return (
    <Gen
      button="Generate SWOT doc"
      fileName="swot-analysis.txt"
      fields={[
        { key: "biz", label: "Business / idea", type: "text", placeholder: "Coffee shop", required: true },
        { key: "s", label: "Strengths (one per line)", type: "textarea", placeholder: "Loyal regulars", required: true },
        { key: "w", label: "Weaknesses (one per line)", type: "textarea", placeholder: "Small seating area", required: true },
        { key: "o", label: "Opportunities (one per line)", type: "textarea", placeholder: "Office crowd nearby", required: true },
        { key: "t", label: "Threats (one per line)", type: "textarea", placeholder: "New chain store", required: true },
      ]}
      generate={(v) => {
        const biz = (v.biz ?? "").trim();
        if (!biz) return { error: "Business / idea is required." };
        for (const k of ["s", "w", "o", "t"] as const) {
          if (!(v[k] ?? "").trim()) return { error: "Fill in all four SWOT quadrants." };
        }
        const list = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => `- ${l}`).join("\n");
        return [
          `SWOT ANALYSIS: ${biz}`,
          `Date: ${new Date().toLocaleDateString()}`,
          "",
          "STRENGTHS (internal, positive):",
          list(v.s ?? ""),
          "",
          "WEAKNESSES (internal, negative):",
          list(v.w ?? ""),
          "",
          "OPPORTUNITIES (external, positive):",
          list(v.o ?? ""),
          "",
          "THREATS (external, negative):",
          list(v.t ?? ""),
        ].join("\n");
      }}
    />
  );
}

function ProfitLossTool() {
  return (
    <Calc
      fields={[
        { key: "rev", label: "Revenue ($)", type: "number", def: "50000", required: true },
        { key: "cogs", label: "Cost of goods ($)", type: "number", def: "20000", required: true },
        { key: "exp", label: "Operating expenses ($)", type: "number", def: "15000", required: true },
      ]}
      compute={(v) => {
        const rev = req(v, "rev", "Revenue");
        if (typeof rev !== "number") return rev;
        const cogs = req(v, "cogs", "Cost of goods");
        if (typeof cogs !== "number") return cogs;
        const exp = req(v, "exp", "Operating expenses");
        if (typeof exp !== "number") return exp;
        if (rev < 0 || cogs < 0 || exp < 0) return { error: "Values cannot be negative." };
        const gross = rev - cogs;
        const net = gross - exp;
        return {
          rows: [
            ["Gross profit", money(gross)],
            ["Net profit", money(net)],
            ["Gross margin", rev === 0 ? "—" : pct((gross / rev) * 100)],
            ["Net margin", rev === 0 ? "—" : pct((net / rev) * 100)],
          ],
          note: "Gross = revenue − COGS; net = gross − operating expenses. " + EDU,
        };
      }}
    />
  );
}

function RevenueTool() {
  return (
    <Calc
      fields={[
        { key: "price", label: "Unit price ($)", type: "number", def: "25", required: true },
        { key: "units", label: "Units sold", type: "number", def: "1000", required: true },
        { key: "disc", label: "Discount (%)", type: "number", def: "10" },
      ]}
      compute={(v) => {
        const p = req(v, "price", "Unit price");
        if (typeof p !== "number") return p;
        const u = req(v, "units", "Units sold");
        if (typeof u !== "number") return u;
        const d = num(v, "disc") ?? 0;
        if (p < 0 || u < 0 || d < 0 || d > 100) return { error: "Check price, units and discount (0–100%)." };
        const gross = p * u;
        const disc = (gross * d) / 100;
        return {
          rows: [
            ["Net revenue", money(gross - disc)],
            ["Gross sales", money(gross)],
            ["Discount given", money(disc)],
          ],
          note: EDU,
        };
      }}
    />
  );
}

function CostTool() {
  return (
    <Calc
      fields={[
        { key: "unit", label: "Unit cost ($)", type: "number", def: "8", required: true },
        { key: "qty", label: "Quantity", type: "number", def: "1000", required: true },
        { key: "oh", label: "Fixed overhead ($)", type: "number", def: "2000" },
      ]}
      compute={(v) => {
        const u = req(v, "unit", "Unit cost");
        if (typeof u !== "number") return u;
        const q = req(v, "qty", "Quantity");
        if (typeof q !== "number") return q;
        const oh = num(v, "oh") ?? 0;
        if (u < 0 || q <= 0 || oh < 0) return { error: "Quantity must be positive; costs cannot be negative." };
        const total = u * q + oh;
        return {
          rows: [
            ["Total cost", money(total)],
            ["Loaded cost per unit", money(total / q)],
            ["Variable subtotal", money(u * q)],
          ],
          note: EDU,
        };
      }}
    />
  );
}

function BreakEvenAnalysisTool() {
  return (
    <Calc
      fields={[
        { key: "fixed", label: "Fixed costs ($)", type: "number", def: "10000", required: true },
        { key: "price", label: "Price per unit ($)", type: "number", def: "25", required: true },
        { key: "var", label: "Variable cost per unit ($)", type: "number", def: "15", required: true },
        { key: "proj", label: "Projected sales (units)", type: "number", def: "1500", required: true },
      ]}
      compute={(v) => {
        const f = req(v, "fixed", "Fixed costs");
        if (typeof f !== "number") return f;
        const p = req(v, "price", "Price per unit");
        if (typeof p !== "number") return p;
        const vc = req(v, "var", "Variable cost per unit");
        if (typeof vc !== "number") return vc;
        const proj = req(v, "proj", "Projected sales");
        if (typeof proj !== "number") return proj;
        const contrib = p - vc;
        if (contrib <= 0) return { error: "Price must exceed variable cost." };
        if (proj <= 0) return { error: "Projected sales must be positive." };
        const be = f / contrib;
        const safety = ((proj - be) / proj) * 100;
        return {
          rows: [
            ["Break-even units", Math.ceil(be).toLocaleString()],
            ["Break-even revenue", money(Math.ceil(be) * p)],
            ["Margin of safety", pct(safety)],
            ["Safety units above break-even", Math.round(proj - be).toLocaleString()],
          ],
          note: EDU,
        };
      }}
    />
  );
}

function ProfitMarginTool() {
  return (
    <Calc
      fields={[
        { key: "rev", label: "Revenue ($)", type: "number", def: "1000", required: true },
        { key: "cost", label: "Cost ($)", type: "number", def: "700", required: true },
      ]}
      compute={(v) => {
        const rev = req(v, "rev", "Revenue");
        if (typeof rev !== "number") return rev;
        const cost = req(v, "cost", "Cost");
        if (typeof cost !== "number") return cost;
        if (rev <= 0 || cost < 0) return { error: "Revenue must be positive; cost cannot be negative." };
        const profit = rev - cost;
        return {
          rows: [
            ["Profit", money(profit)],
            ["Margin on sales", pct((profit / rev) * 100)],
            ["Markup on cost", cost === 0 ? "—" : pct((profit / cost) * 100)],
          ],
          note: "Margin divides by sales; markup divides by cost. " + EDU,
        };
      }}
    />
  );
}

function EmployeeCostTool() {
  return (
    <Calc
      fields={[
        { key: "sal", label: "Salary ($)", type: "number", def: "60000", required: true },
        { key: "ben", label: "Benefits ($)", type: "number", def: "12000" },
        { key: "oh", label: "Overhead ($)", type: "number", def: "6000" },
      ]}
      compute={(v) => {
        const sal = req(v, "sal", "Salary");
        if (typeof sal !== "number") return sal;
        const ben = num(v, "ben") ?? 0;
        const oh = num(v, "oh") ?? 0;
        if (sal < 0 || ben < 0 || oh < 0) return { error: "Values cannot be negative." };
        const total = sal + ben + oh;
        return {
          rows: [
            ["True annual cost", money(total)],
            ["Monthly cost", money(total / 12)],
            ["Hourly cost (2080-hr year)", money(total / 2080)],
          ],
          note: EDU,
        };
      }}
    />
  );
}

function PayrollTool() {
  return (
    <Calc
      fields={[
        { key: "gross", label: "Gross salary ($)", type: "number", def: "5000", required: true },
        { key: "tax", label: "Tax rate you enter (%)", type: "number", def: "20", required: true },
        { key: "ded", label: "Other deductions ($)", type: "number", def: "200" },
      ]}
      compute={(v) => {
        const gross = req(v, "gross", "Gross salary");
        if (typeof gross !== "number") return gross;
        const tax = req(v, "tax", "Tax rate");
        if (typeof tax !== "number") return tax;
        const ded = num(v, "ded") ?? 0;
        if (gross < 0 || tax < 0 || tax > 100 || ded < 0) return { error: "Check gross, tax rate (0–100) and deductions." };
        const taxAmt = (gross * tax) / 100;
        return {
          rows: [
            ["Net (take-home) pay", money(gross - taxAmt - ded)],
            ["Tax amount", money(taxAmt)],
            ["Total deductions", money(taxAmt + ded)],
          ],
          note: "Rough estimate from the rate you entered — not tax advice. " + EDU,
        };
      }}
    />
  );
}

function TimesheetTool() {
  return (
    <Gen
      button="Generate timesheet"
      fileName="timesheet.txt"
      fields={[
        { key: "name", label: "Employee", type: "text", placeholder: "Jane Doe" },
        { key: "week", label: "Week of", type: "text", placeholder: "Oct 6–12, 2026" },
        { key: "entries", label: "Entries (one per line: day + hours, e.g. Mon 8)", type: "textarea", placeholder: "Mon 8\nTue 8.5\nWed 8\nThu 7.5\nFri 9", required: true },
        { key: "rate", label: "Hourly rate ($, optional)", type: "number", placeholder: "20" },
      ]}
      generate={(v) => {
        const lines = (v.entries ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) return { error: "Add at least one workday line." };
        let total = 0;
        const rows: string[] = [];
        for (const line of lines) {
          const nums = line.match(/[\d.]+/g);
          const h = nums ? Number(nums[nums.length - 1]) : NaN;
          if (!Number.isFinite(h) || h < 0 || h > 24) return { error: `Could not read hours in line: “${line}”. End each line with hours (0–24).` };
          total += h;
          rows.push(`${line} → ${h.toFixed(2)} h`);
        }
        const reg = Math.min(total, 40);
        const ot = Math.max(0, total - 40);
        const rateRaw = (v.rate ?? "").trim();
        const rate = rateRaw ? Number(rateRaw.replace(/,/g, "")) : NaN;
        const payLine = rateRaw
          ? !Number.isFinite(rate) || rate < 0
            ? null
            : `Gross pay (at $${rate.toFixed(2)}/h): $${(total * rate).toFixed(2)}`
          : null;
        if (rateRaw && payLine === null) return { error: "Hourly rate must be a valid non-negative number." };
        return [
          "WEEKLY TIMESHEET",
          (v.name ?? "").trim() ? `Employee: ${(v.name ?? "").trim()}` : "",
          (v.week ?? "").trim() ? `Week: ${(v.week ?? "").trim()}` : "",
          "",
          ...rows,
          "",
          `Total hours: ${total.toFixed(2)}`,
          `Regular (≤40h): ${reg.toFixed(2)} h`,
          `Overtime (>40h): ${ot.toFixed(2)} h`,
          payLine ?? "",
        ].filter((l) => l !== "").join("\n");
      }}
    />
  );
}

function WorkingHoursTool() {
  return (
    <Calc
      fields={[
        { key: "in", label: "Clock-in (HH:MM)", type: "time", def: "09:00", required: true },
        { key: "out", label: "Clock-out (HH:MM)", type: "time", def: "17:30", required: true },
        { key: "brk", label: "Break (minutes)", type: "number", def: "30" },
      ]}
      compute={(v) => {
        const a = parseHm(v.in ?? "");
        const b = parseHm(v.out ?? "");
        if (a === null || b === null) return { error: "Enter valid clock-in and clock-out times." };
        const brk = num(v, "brk") ?? 0;
        if (brk < 0 || brk > 1440) return { error: "Break must be 0–1440 minutes." };
        let mins = b - a;
        const overnight = mins <= 0;
        if (overnight) mins += 24 * 60;
        const net = mins - brk;
        if (net < 0) return { error: "Break is longer than the shift." };
        return {
          rows: [
            ["Shift length", `${Math.floor(net / 60)}h ${net % 60}m`],
            ["Decimal hours", (net / 60).toFixed(2) + " h"],
            ["Overnight shift", overnight ? "Yes" : "No"],
          ],
        };
      }}
    />
  );
}

function OvertimeHoursTool() {
  return (
    <Calc
      fields={[
        { key: "worked", label: "Hours worked", type: "number", def: "47", required: true },
        { key: "std", label: "Standard week", type: "number", def: "40", required: true },
      ]}
      compute={(v) => {
        const w = req(v, "worked", "Hours worked");
        if (typeof w !== "number") return w;
        const s = req(v, "std", "Standard week");
        if (typeof s !== "number") return s;
        if (w < 0 || s <= 0) return { error: "Hours worked must be ≥ 0 and standard week positive." };
        const ot = Math.max(0, w - s);
        const reg = Math.min(w, s);
        return {
          rows: [
            ["Overtime hours", ot.toFixed(2)],
            ["Regular hours", reg.toFixed(2)],
            ["Overtime share", w === 0 ? "—" : pct((ot / w) * 100)],
          ],
        };
      }}
    />
  );
}

function LeaveBalanceTool() {
  return (
    <Calc
      fields={[
        { key: "ent", label: "Yearly entitlement (days)", type: "number", def: "25", required: true },
        { key: "used", label: "Used days", type: "number", def: "8", required: true },
        { key: "pend", label: "Pending days", type: "number", def: "2" },
      ]}
      compute={(v) => {
        const ent = req(v, "ent", "Yearly entitlement");
        if (typeof ent !== "number") return ent;
        const used = req(v, "used", "Used days");
        if (typeof used !== "number") return used;
        const pend = num(v, "pend") ?? 0;
        if (ent <= 0 || used < 0 || pend < 0) return { error: "Check entitlement and days used." };
        if (used + pend > ent * 3) return { error: "Used + pending looks far above entitlement." };
        const left = ent - used - pend;
        return {
          rows: [
            ["Remaining days", left.toFixed(1)],
            ["Used + pending", (used + pend).toFixed(1)],
            ["Share consumed", pct(((used + pend) / ent) * 100)],
          ],
        };
      }}
    />
  );
}

function ProductivityTool() {
  return (
    <Calc
      fields={[
        { key: "tasks", label: "Tasks completed", type: "number", def: "24", required: true },
        { key: "hrs", label: "Hours worked", type: "number", def: "8", required: true },
      ]}
      compute={(v) => {
        const t = req(v, "tasks", "Tasks completed");
        if (typeof t !== "number") return t;
        const h = req(v, "hrs", "Hours worked");
        if (typeof h !== "number") return h;
        if (t < 0 || h <= 0) return { error: "Tasks must be ≥ 0 and hours must be positive." };
        const perHour = t / h;
        const score = perHour < 1 ? "Light pace (rough)" : perHour < 3 ? "Steady pace (rough)" : perHour < 6 ? "Brisk pace (rough)" : "Very high pace (rough)";
        return {
          rows: [
            ["Tasks per hour", perHour.toFixed(2)],
            ["Minutes per task", t === 0 ? "—" : ((h * 60) / t).toFixed(1)],
            ["Rough score", score],
          ],
          note: "Honestly labelled rough rate — task difficulty varies, so compare only like-for-like work.",
        };
      }}
    />
  );
}

function HourlyRateTool() {
  return (
    <Calc
      fields={[
        { key: "fee", label: "Fee / income target ($)", type: "number", def: "5000", required: true },
        { key: "hrs", label: "Hours to deliver", type: "number", def: "80", required: true },
        { key: "oh", label: "Overhead loading (%)", type: "number", def: "20" },
      ]}
      compute={(v) => {
        const fee = req(v, "fee", "Fee / income target");
        if (typeof fee !== "number") return fee;
        const hrs = req(v, "hrs", "Hours to deliver");
        if (typeof hrs !== "number") return hrs;
        const oh = num(v, "oh") ?? 0;
        if (fee < 0 || hrs <= 0 || oh < 0) return { error: "Fee and overhead must be ≥ 0; hours must be positive." };
        const loaded = fee * (1 + oh / 100);
        return {
          rows: [
            ["Charge-out rate", money(loaded / hrs)],
            ["Loaded target", money(loaded)],
            ["Base (no overhead)", money(fee / hrs)],
          ],
          note: EDU,
        };
      }}
    />
  );
}

/* ---------- STUDENT (19) ---------- */

function GpaTool() {
  const gradeFields = [1, 2, 3, 4, 5, 6].flatMap((i) => [
    { key: `g${i}`, label: `Course ${i} grade`, type: "select" as const, options: LETTER_OPTS, def: i === 1 ? "A" : "" },
    { key: `c${i}`, label: `Course ${i} credits`, type: "number" as const, def: "3" },
  ]);
  return (
    <Calc
      fields={gradeFields}
      compute={(v) => {
        let pts = 0;
        let credits = 0;
        for (let i = 1; i <= 6; i++) {
          const g = (v[`g${i}`] ?? "").trim();
          if (!g) continue;
          const gp = gradePoint(g);
          if (gp === null) return { error: `Unknown grade “${g}” in course ${i}.` };
          const cRaw = (v[`c${i}`] ?? "").trim();
          const c = cRaw ? Number(cRaw.replace(/,/g, "")) : 0;
          if (!Number.isFinite(c) || c <= 0 || c > 12) return { error: `Course ${i} credits must be 1–12 (or skip the course).` };
          pts += gp * c;
          credits += c;
        }
        if (credits === 0) return { error: "Enter at least one course grade with credits." };
        return {
          rows: [
            ["Semester GPA", (pts / credits).toFixed(2)],
            ["Total credits", String(credits)],
            ["Quality points", pts.toFixed(1)],
          ],
          note: "Weighted GPA on the standard 4.0 scale (A+/A = 4.0).",
        };
      }}
    />
  );
}

function CgpaTool() {
  const semFields = [1, 2, 3, 4, 5, 6].flatMap((i) => [
    { key: `g${i}`, label: `Semester ${i} GPA`, type: "number" as const, def: i <= 2 ? "3.5" : "", placeholder: "e.g. 3.50" },
    { key: `c${i}`, label: `Semester ${i} credits`, type: "number" as const, def: i <= 2 ? "15" : "", placeholder: "e.g. 15" },
  ]);
  return (
    <Calc
      fields={semFields}
      compute={(v) => {
        let pts = 0;
        let credits = 0;
        for (let i = 1; i <= 6; i++) {
          const gRaw = (v[`g${i}`] ?? "").trim();
          if (!gRaw) continue;
          const g = Number(gRaw.replace(/,/g, ""));
          const cRaw = (v[`c${i}`] ?? "").trim();
          const c = cRaw ? Number(cRaw.replace(/,/g, "")) : NaN;
          if (!Number.isFinite(g) || g < 0 || g > 4.5) return { error: `Semester ${i} GPA must be 0–4.5.` };
          if (!Number.isFinite(c) || c <= 0) return { error: `Semester ${i} needs its credit load.` };
          pts += g * c;
          credits += c;
        }
        if (credits === 0) return { error: "Enter at least one semester GPA with credits." };
        return {
          rows: [
            ["Cumulative GPA", (pts / credits).toFixed(2)],
            ["Total credits", String(credits)],
          ],
          note: "Credit-weighted mean of semester GPAs — the number transcripts show.",
        };
      }}
    />
  );
}

function GradeTool() {
  return (
    <Calc
      fields={[
        { key: "s1", label: "Score 1 (%)", type: "number", def: "85", required: true },
        { key: "w1", label: "Weight 1", type: "number", def: "30", required: true },
        { key: "s2", label: "Score 2 (%)", type: "number", def: "90" },
        { key: "w2", label: "Weight 2", type: "number", def: "30" },
        { key: "s3", label: "Score 3 (%)", type: "number", def: "78" },
        { key: "w3", label: "Weight 3", type: "number", def: "40" },
      ]}
      compute={(v) => {
        const pairs: [number, number][] = [];
        for (const i of [1, 2, 3]) {
          const sRaw = (v[`s${i}`] ?? "").trim();
          const wRaw = (v[`w${i}`] ?? "").trim();
          if (!sRaw && !wRaw) continue;
          const s = Number(sRaw.replace(/,/g, ""));
          const w = Number(wRaw.replace(/,/g, ""));
          if (!Number.isFinite(s) || !Number.isFinite(w)) return { error: `Item ${i} needs a numeric score and weight.` };
          if (s < 0 || s > 150) return { error: `Score ${i} must be 0–150.` };
          if (w < 0) return { error: "Weights cannot be negative." };
          pairs.push([s, w]);
        }
        if (pairs.length === 0) return { error: "Enter at least one scored item." };
        const wSum = pairs.reduce((a, [, w]) => a + w, 0);
        if (wSum <= 0) return { error: "Total weight must be positive." };
        const avg = pairs.reduce((a, [s, w]) => a + s * w, 0) / wSum;
        const { letter, gpa } = letterForScore(avg);
        return {
          rows: [
            ["Weighted average", avg.toFixed(2) + "%"],
            ["Letter grade", letter],
            ["GPA equivalent", gpa],
          ],
        };
      }}
    />
  );
}

function PctToGradeTool() {
  return (
    <Calc
      fields={[{ key: "p", label: "Score (%)", type: "number", def: "85", required: true }]}
      compute={(v) => {
        const p = req(v, "p", "Score");
        if (typeof p !== "number") return p;
        if (p < 0 || p > 150) return { error: "Score must be 0–150." };
        const { letter, gpa } = letterForScore(p);
        return { rows: [["Letter grade", letter], ["GPA equivalent", gpa], ["Score", p.toFixed(1) + "%"]] };
      }}
    />
  );
}

function GradeToPctTool() {
  return (
    <Calc
      fields={[
        {
          key: "g", label: "Letter grade", type: "select",
          options: [
            { value: "A+", label: "A+" }, { value: "A", label: "A" }, { value: "A-", label: "A-" },
            { value: "B+", label: "B+" }, { value: "B", label: "B" }, { value: "B-", label: "B-" },
            { value: "C+", label: "C+" }, { value: "C", label: "C" }, { value: "C-", label: "C-" },
            { value: "D+", label: "D+" }, { value: "D", label: "D" }, { value: "F", label: "F" },
          ],
        },
      ]}
      compute={(v) => {
        const g = (v.g ?? "A").trim();
        if (gradePoint(g) === null) return { error: "Pick a letter grade." };
        const { range, mid } = rangeForLetter(g);
        return {
          rows: [["Typical range", range + "%"], ["Midpoint", mid + "%"], ["GPA equivalent", gradePoint(g)?.toFixed(1) ?? "—"]],
          note: "Standard scale used here — your school's cutoffs may differ.",
        };
      }}
    />
  );
}

function FinalGradeTool() {
  return (
    <Calc
      fields={[
        { key: "cur", label: "Current average (%)", type: "number", def: "82", required: true },
        { key: "w", label: "Final weight (%)", type: "number", def: "30", required: true },
        { key: "goal", label: "Target course grade (%)", type: "number", def: "85", required: true },
      ]}
      compute={(v) => {
        const cur = req(v, "cur", "Current average");
        if (typeof cur !== "number") return cur;
        const w = req(v, "w", "Final weight");
        if (typeof w !== "number") return w;
        const goal = req(v, "goal", "Target course grade");
        if (typeof goal !== "number") return goal;
        if (w <= 0 || w >= 100) return { error: "Final weight must be between 0 and 100 (exclusive)." };
        const wf = w / 100;
        const need = (goal - cur * (1 - wf)) / wf;
        const verdict = need > 100 ? "Above 100% — target out of reach at this weight" : need < 0 ? "Already secured — any non-negative final keeps the goal" : "Achievable";
        return {
          rows: [
            ["Needed on final", need.toFixed(1) + "%"],
            ["Verdict", verdict],
          ],
        };
      }}
    />
  );
}

function ExamScoreTool() {
  return (
    <Calc
      fields={[
        { key: "ok", label: "Correct answers", type: "number", def: "42", required: true },
        { key: "tot", label: "Total questions", type: "number", def: "50", required: true },
      ]}
      compute={(v) => {
        const ok = req(v, "ok", "Correct answers");
        if (typeof ok !== "number") return ok;
        const tot = req(v, "tot", "Total questions");
        if (typeof tot !== "number") return tot;
        if (!Number.isInteger(ok) || !Number.isInteger(tot) || tot <= 0 || ok < 0 || ok > tot) {
          return { error: "Enter whole numbers with correct ≤ total and total ≥ 1." };
        }
        const p = (ok / tot) * 100;
        const { letter } = letterForScore(p);
        return {
          rows: [
            ["Percentage", p.toFixed(1) + "%"],
            ["Letter grade", letter],
            ["Marks lost", String(tot - ok)],
          ],
        };
      }}
    />
  );
}

function AttendanceTool() {
  return (
    <Calc
      fields={[
        { key: "att", label: "Classes attended", type: "number", def: "36", required: true },
        { key: "held", label: "Classes held", type: "number", def: "45", required: true },
      ]}
      compute={(v) => {
        const att = req(v, "att", "Classes attended");
        if (typeof att !== "number") return att;
        const held = req(v, "held", "Classes held");
        if (typeof held !== "number") return held;
        if (held <= 0 || att < 0 || att > held) return { error: "Held must be positive and attended must be 0–held." };
        const p = (att / held) * 100;
        return {
          rows: [
            ["Attendance", p.toFixed(1) + "%"],
            ["75% benchmark", p >= 75 ? "Met ✓" : `Short by ${(75 - p).toFixed(1)} pts`],
            ["Missed", String(held - att)],
          ],
          note: "Judged against the common 75% requirement — your institution may differ.",
        };
      }}
    />
  );
}

function RequiredAttendanceTool() {
  return (
    <Calc
      fields={[
        { key: "att", label: "Attended", type: "number", def: "30", required: true },
        { key: "held", label: "Held", type: "number", def: "40", required: true },
        { key: "need", label: "Required (%)", type: "number", def: "75", required: true },
      ]}
      compute={(v) => {
        const att = req(v, "att", "Attended");
        if (typeof att !== "number") return att;
        const held = req(v, "held", "Held");
        if (typeof held !== "number") return held;
        const need = req(v, "need", "Required");
        if (typeof need !== "number") return need;
        if (held <= 0 || att < 0 || att > held) return { error: "Attended must be 0–held." };
        if (need <= 0 || need >= 100) return { error: "Required percent must be 1–99." };
        const r = need / 100;
        const cur = att / held;
        if (cur >= r) {
          const miss = Math.floor((att - r * held) / r);
          return {
            rows: [
              ["Status", `Safe (${((cur) * 100).toFixed(1)}%)`],
              ["May safely miss", `${Math.max(0, miss)} class${miss === 1 ? "" : "es"}`],
            ],
          };
        }
        const must = Math.ceil((r * held - att) / (1 - r));
        return {
          rows: [
            ["Status", `Below (${(cur * 100).toFixed(1)}%)`],
            ["Must attend consecutively", `${must} class${must === 1 ? "" : "es"}`],
          ],
        };
      }}
    />
  );
}

function StudyTimeTool() {
  return (
    <Calc
      fields={[
        { key: "topics", label: "Topics", type: "number", def: "12", required: true },
        { key: "mins", label: "Minutes per topic", type: "number", def: "45", required: true },
        { key: "days", label: "Days available", type: "number", def: "7", required: true },
      ]}
      compute={(v) => {
        const t = req(v, "topics", "Topics");
        if (typeof t !== "number") return t;
        const m = req(v, "mins", "Minutes per topic");
        if (typeof m !== "number") return m;
        const d = req(v, "days", "Days available");
        if (typeof d !== "number") return d;
        if (t <= 0 || m <= 0 || d <= 0) return { error: "All values must be positive." };
        const total = t * m;
        const daily = total / d;
        return {
          rows: [
            ["Total prep time", `${total} min (${(total / 60).toFixed(1)} h)`],
            ["Daily target", `${Math.ceil(daily)} min/day`],
            ["Per-day hours", (daily / 60).toFixed(2) + " h/day"],
          ],
        };
      }}
    />
  );
}

function WordGoalTool() {
  return (
    <Calc
      fields={[
        { key: "goal", label: "Word-count goal", type: "number", def: "3000", required: true },
        { key: "days", label: "Days", type: "number", def: "6", required: true },
        { key: "sess", label: "Sessions per day", type: "number", def: "2", required: true },
      ]}
      compute={(v) => {
        const goal = req(v, "goal", "Word-count goal");
        if (typeof goal !== "number") return goal;
        const days = req(v, "days", "Days");
        if (typeof days !== "number") return days;
        const sess = req(v, "sess", "Sessions per day");
        if (typeof sess !== "number") return sess;
        if (goal <= 0 || days <= 0 || sess <= 0) return { error: "All values must be positive." };
        const perDay = goal / days;
        return {
          rows: [
            ["Words per day", Math.ceil(perDay).toLocaleString()],
            ["Words per session", Math.ceil(perDay / sess).toLocaleString()],
            ["Total sessions", String(Math.round(days * sess))],
          ],
        };
      }}
    />
  );
}

function CitationTool() {
  return (
    <Gen
      button="Generate citations"
      fileName="citations.txt"
      fields={[
        { key: "author", label: "Author (e.g. Jane Doe)", type: "text", placeholder: "Jane Doe", required: true },
        { key: "year", label: "Year", type: "number", def: "2024", required: true },
        { key: "title", label: "Title", type: "text", placeholder: "A Study of Study Habits", required: true },
        { key: "pub", label: "Publisher / source", type: "text", placeholder: "Academic Press" },
      ]}
      generate={(v) => {
        const author = (v.author ?? "").trim();
        const title = (v.title ?? "").trim();
        const year = (v.year ?? "").trim();
        const pub = (v.pub ?? "").trim() || "n.p.";
        if (!author || !title || !year) return { error: "Author, year and title are required." };
        if (!/^\d{4}$/.test(year)) return { error: "Year must be four digits (e.g. 2024)." };
        return [
          "CITATIONS (template patterns — always verify against your style guide):",
          "",
          `APA (7th): ${author} (${year}). ${title}. ${pub}.`,
          `MLA (9th): ${author}. ${title}. ${pub}, ${year}.`,
          `Chicago (bibliography): ${author}. ${title}. ${pub}, ${year}.`,
          "",
          "Tip: replace with initials/italics per your guide; check capitalization rules.",
        ].join("\n");
      }}
    />
  );
}

function ApaTool() {
  return (
    <Gen
      button="Format APA citation"
      fileName="apa-citation.txt"
      fields={[
        { key: "author", label: "Author", type: "text", placeholder: "Doe, J.", required: true },
        { key: "year", label: "Year", type: "number", def: "2024", required: true },
        { key: "title", label: "Title", type: "text", placeholder: "Book title", required: true },
        { key: "pub", label: "Publisher", type: "text", placeholder: "Academic Press" },
      ]}
      generate={(v) => {
        const author = (v.author ?? "").trim();
        const title = (v.title ?? "").trim();
        const year = (v.year ?? "").trim();
        const pub = (v.pub ?? "").trim() || "n.p.";
        if (!author || !title || !year) return { error: "Author, year and title are required." };
        if (!/^\d{4}$/.test(year)) return { error: "Year must be four digits." };
        return `APA 7th reference:\n${author} (${year}). ${title}. ${pub}.\n\nPattern: Author, A. (Year). Title in sentence case. Publisher. Always verify against the APA manual.`;
      }}
    />
  );
}

function MlaTool() {
  return (
    <Gen
      button="Format MLA citation"
      fileName="mla-citation.txt"
      fields={[
        { key: "author", label: "Author", type: "text", placeholder: "Doe, Jane", required: true },
        { key: "title", label: "Title", type: "text", placeholder: "Book Title", required: true },
        { key: "pub", label: "Publisher", type: "text", placeholder: "Academic Press" },
        { key: "year", label: "Year", type: "number", def: "2024", required: true },
      ]}
      generate={(v) => {
        const author = (v.author ?? "").trim();
        const title = (v.title ?? "").trim();
        const pub = (v.pub ?? "").trim() || "n.p.";
        const year = (v.year ?? "").trim();
        if (!author || !title || !year) return { error: "Author, title and year are required." };
        if (!/^\d{4}$/.test(year)) return { error: "Year must be four digits." };
        return `MLA 9th works-cited entry:\n${author}. ${title}. ${pub}, ${year}.\n\nPattern: Last, First. Title in headline case. Publisher, Year. Always verify against the MLA handbook.`;
      }}
    />
  );
}

function ChicagoTool() {
  return (
    <Gen
      button="Format Chicago citation"
      fileName="chicago-citation.txt"
      fields={[
        { key: "author", label: "Author", type: "text", placeholder: "Jane Doe", required: true },
        { key: "title", label: "Title", type: "text", placeholder: "Book Title", required: true },
        { key: "pub", label: "Publisher", type: "text", placeholder: "Academic Press" },
        { key: "year", label: "Year", type: "number", def: "2024", required: true },
      ]}
      generate={(v) => {
        const author = (v.author ?? "").trim();
        const title = (v.title ?? "").trim();
        const pub = (v.pub ?? "").trim() || "n.p.";
        const year = (v.year ?? "").trim();
        if (!author || !title || !year) return { error: "Author, title and year are required." };
        if (!/^\d{4}$/.test(year)) return { error: "Year must be four digits." };
        return `Chicago bibliography entry:\n${author}. ${title}. ${pub}, ${year}.\n\nPattern: First Last. Title. Place: Publisher, Year (place optional here). Always verify against the Chicago Manual.`;
      }}
    />
  );
}

interface Card {
  front: string;
  back: string;
}

function parseCards(text: string): Card[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const eq = l.indexOf("=");
      if (eq > 0) return { front: l.slice(0, eq).trim(), back: l.slice(eq + 1).trim() };
      const col = l.indexOf(":");
      if (col > 0) return { front: l.slice(0, col).trim(), back: l.slice(col + 1).trim() };
      return { front: l, back: "" };
    })
    .filter((c) => c.front && c.back)
    .slice(0, 200);
}

function FlashcardTool() {
  const [text, setText] = useState("photosynthesis = process by which plants convert light to energy\nmitosis = cell division producing two identical cells");
  const [idx, setIdx] = useState(0);
  const [flip, setFlip] = useState(false);
  const cards = useMemo(() => parseCards(text), [text]);
  const safeIdx = cards.length === 0 ? 0 : Math.min(idx, cards.length - 1);
  const shuffle = () => {
    const arr = parseCards(text);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i] as Card;
      arr[i] = arr[j] as Card;
      arr[j] = t;
    }
    setText(arr.map((c) => `${c.front} = ${c.back}`).join("\n"));
    setIdx(0);
    setFlip(false);
  };
  const cur = cards[safeIdx];
  return (
    <div>
      <FieldLabel htmlFor="fc-in">Cards (one per line: term = definition)</FieldLabel>
      <Textarea id="fc-in" value={text} onChange={(e) => { setText(e.target.value); setIdx(0); setFlip(false); }} placeholder="term = definition" />
      <p role="status" className="mt-2 text-xs text-(--muted)">{cards.length} cards loaded</p>
      {cur && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setFlip((f) => !f)}
            aria-label={flip ? "Show term" : "Show definition"}
            className="min-h-[140px] w-full rounded-2xl bg-(--surface-2) px-5 py-8 text-center text-xl font-bold text-(--foreground)"
          >
            {flip ? cur.back : cur.front}
          </button>
          <p className="mt-2 text-center text-sm text-(--muted)" aria-live="polite">
            Card {safeIdx + 1} of {cards.length} — {flip ? "definition shown" : "term shown, tap to flip"}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => { setIdx((i) => (i - 1 + cards.length) % cards.length); setFlip(false); }}>← Prev</Button>
            <Button type="button" onClick={() => setFlip((f) => !f)}>{flip ? "Show term" : "Flip"}</Button>
            <Button type="button" variant="secondary" onClick={() => { setIdx((i) => (i + 1) % cards.length); setFlip(false); }}>Next →</Button>
            <Button type="button" variant="ghost" onClick={shuffle}>Shuffle</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuizTool() {
  const [text, setText] = useState("Capital of France? = Paris\n2 + 2? = 4\nLargest planet? = Jupiter");
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(false);
  const [known, setKnown] = useState(0);
  const [missed, setMissed] = useState(0);
  const cards = useMemo(() => parseCards(text), [text]);
  const safeIdx = cards.length === 0 ? 0 : Math.min(idx, cards.length - 1);
  const cur = cards[safeIdx];
  const next = () => {
    setIdx((i) => (cards.length === 0 ? 0 : (i + 1) % cards.length));
    setShow(false);
  };
  return (
    <div>
      <FieldLabel htmlFor="qz-in">Questions (one per line: question = answer)</FieldLabel>
      <Textarea id="qz-in" value={text} onChange={(e) => { setText(e.target.value); setIdx(0); setShow(false); setKnown(0); setMissed(0); }} placeholder="question = answer" />
      <div className="mt-2 grid grid-cols-3 gap-3" role="status">
        <Stat label="Question" value={cards.length === 0 ? "—" : `${safeIdx + 1}/${cards.length}`} />
        <Stat label="Knew" value={String(known)} />
        <Stat label="Missed" value={String(missed)} />
      </div>
      {cur && (
        <div className="mt-3 rounded-2xl bg-(--surface-2) px-5 py-5 text-center">
          <p className="text-lg font-bold text-(--foreground)">{cur.front}</p>
          {show ? (
            <p className="mt-2 text-[15px] font-medium text-emerald-700" aria-live="polite">Answer: {cur.back}</p>
          ) : (
            <p className="mt-2 text-sm text-(--muted)">Answer hidden — say it, then reveal.</p>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button type="button" variant="secondary" onClick={() => setShow((s) => !s)}>{show ? "Hide answer" : "Reveal answer"}</Button>
            <Button type="button" onClick={() => { setKnown((k) => k + 1); next(); }}>I knew it</Button>
            <Button type="button" variant="secondary" onClick={() => { setMissed((m) => m + 1); next(); }}>I missed it</Button>
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const arr = [...cards];
                for (let i = arr.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  const t = arr[i] as Card;
                  arr[i] = arr[j] as Card;
                  arr[j] = t;
                }
                setText(arr.map((c) => `${c.front} = ${c.back}`).join("\n"));
                setIdx(0);
                setShow(false);
              }}
            >
              Shuffle
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setKnown(0); setMissed(0); setIdx(0); setShow(false); }}>Reset score</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionGenTool() {
  return (
    <Gen
      button="Generate questions"
      fileName="study-questions.txt"
      outLabel="Study prompts (template-based, not AI)"
      fields={[
        { key: "topic", label: "Study topic", type: "text", placeholder: "Photosynthesis", required: true },
        { key: "level", label: "Level", type: "select", options: [{ value: "school", label: "School" }, { value: "college", label: "College" }, { value: "general", label: "General" }] },
        { key: "n", label: "How many (4–12)", type: "number", def: "8" },
      ]}
      generate={(v) => {
        const topic = (v.topic ?? "").trim();
        if (!topic) return { error: "Enter a study topic." };
        const nRaw = Number((v.n ?? "").replace(/,/g, ""));
        const n = Number.isFinite(nRaw) ? Math.min(12, Math.max(4, Math.round(nRaw))) : 8;
        const level = (v.level ?? "general").trim();
        const templates = [
          `Define the key terms of ${topic} in your own words.`,
          `Summarize ${topic} in 5 sentences for a ${level} student.`,
          `List 3 causes and 3 effects within ${topic} and explain each.`,
          `Compare and contrast two viewpoints on ${topic}.`,
          `What are common misconceptions about ${topic}? Correct each one.`,
          `Create a timeline of the key developments in ${topic}.`,
          `Apply ${topic} to a real-world example and explain the link.`,
          `Write 5 short-answer exam questions on ${topic}, then answer them.`,
          `Argue for and against one claim about ${topic} (2 paragraphs each).`,
          `Draw and label a diagram that explains ${topic}.`,
          `Explain ${topic} as if teaching a friend — then note what confused you.`,
          `Predict 3 future developments in ${topic} and justify each.`,
        ];
        return [`STUDY PROMPTS: ${topic} (template-based — not AI-generated)`, `Level: ${level}`, "", ...templates.slice(0, n).map((t, i) => `${i + 1}. ${t}`), "", "Work through each prompt by hand; check answers against your course materials."].join("\n");
      }}
    />
  );
}

function StudyPlannerTool() {
  return (
    <Gen
      button="Generate study plan"
      fileName="study-plan.txt"
      fields={[
        { key: "subs", label: "Subjects (one per line: subject, hours/week)", type: "textarea", placeholder: "Math, 5\nPhysics, 4\nEnglish, 3", required: true },
        { key: "days", label: "Study days per week", type: "number", def: "5", required: true },
        { key: "hrs", label: "Hours per study day", type: "number", def: "3", required: true },
      ]}
      generate={(v) => {
        const lines = (v.subs ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) return { error: "List at least one subject." };
        const days = Number((v.days ?? "").replace(/,/g, ""));
        const hrs = Number((v.hrs ?? "").replace(/,/g, ""));
        if (!Number.isFinite(days) || days < 1 || days > 7) return { error: "Study days must be 1–7." };
        if (!Number.isFinite(hrs) || hrs <= 0 || hrs > 16) return { error: "Hours per day must be 1–16." };
        const subs: { name: string; want: number }[] = [];
        for (const line of lines) {
          const parts = line.split(/[,|;]/).map((p) => p.trim());
          const want = Number(parts[parts.length - 1]);
          if (!Number.isFinite(want) || want <= 0) return { error: `Give weekly hours for: “${line}” (e.g. “Math, 5”).` };
          subs.push({ name: parts.length > 1 ? parts.slice(0, -1).join(", ") : line, want });
        }
        const totalWant = subs.reduce((a, s) => a + s.want, 0);
        const capacity = days * hrs;
        const scale = totalWant > capacity ? capacity / totalWant : 1;
        const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].slice(0, Math.round(days));
        const perDay: string[][] = dayNames.map(() => []);
        let di = 0;
        for (const s of subs) {
          const alloc = Math.max(1, Math.round(s.want * scale));
          for (let k = 0; k < alloc; k++) {
            perDay[di % perDay.length]?.push(`${s.name} (1h block)`);
            di++;
          }
        }
        return [
          "WEEKLY STUDY PLAN (balanced rotation — deterministic template)",
          `Capacity: ${capacity}h/week across ${days} days x ${hrs}h; requested ${totalWant}h${scale < 1 ? ` — scaled to fit (x${scale.toFixed(2)})` : ""}.`,
          "",
          ...dayNames.map((d, i) => `${d}: ${(perDay[i] ?? []).join(" + ") || "Rest / review"}`),
          "",
          "Tip: rotate subjects daily, end each block with 5-minute recall, and keep one rest day.",
        ].join("\n");
      }}
    />
  );
}
