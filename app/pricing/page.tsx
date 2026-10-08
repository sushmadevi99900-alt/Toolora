import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Faq } from "@/components/ui/Faq";
import { ButtonLink } from "@/components/ui/Button";

export const metadata = buildMetadata({
  title: "Pricing — Everything Is Free | Toolora",
  description:
    "Toolora is completely free: every working tool is free with no account, no signup and no payments.",
  path: "/pricing",
  keywords: ["toolora pricing", "free plan", "free tools"],
});

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Pricing" }]} />
      <div className="mx-auto mt-3 max-w-2xl text-center">
        <Badge tone="free">100% free</Badge>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-(--foreground) sm:text-4xl">
          Simple, honest pricing: free
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-(--muted)">
          Every working tool is free. No account, no signup, no card, no payments — open a tool and use it.
        </p>
      </div>
      <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="flex flex-col p-6">
          <h2 className="text-lg font-extrabold text-(--foreground)">Every tool</h2>
          <p className="mt-2">
            <span className="text-4xl font-extrabold tracking-tight text-(--foreground)">₹0</span>
            <span className="text-sm font-medium text-(--muted)"> forever</span>
          </p>
          <p className="mt-1 text-sm text-(--muted)">All working tools, unlimited use.</p>
          <ul className="mt-4 flex-1 space-y-2 text-[15px] text-(--muted)">
            {["All working tools", "No account needed", "Mobile-friendly", "Private by design"].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-0.5 text-emerald-600 dark:text-emerald-400">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <ButtonLink href="/tools" variant="primary" className="mt-6 w-full">
            Start using tools
          </ButtonLink>
        </Card>
        <Card className="flex flex-col p-6">
          <h2 className="text-lg font-extrabold text-(--foreground)">No signup</h2>
          <p className="mt-2">
            <span className="text-4xl font-extrabold tracking-tight text-(--foreground)">₹0</span>
            <span className="text-sm font-medium text-(--muted)"> no account</span>
          </p>
          <p className="mt-1 text-sm text-(--muted)">Anonymous use, nothing to remember.</p>
          <ul className="mt-4 flex-1 space-y-2 text-[15px] text-(--muted)">
            {["No login or passwords", "No email collection", "No user database", "Just open and work"].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-0.5 text-emerald-600 dark:text-emerald-400">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <ButtonLink href="/tools" variant="secondary" className="mt-6 w-full">
            Browse tools
          </ButtonLink>
        </Card>
        <Card className="flex flex-col p-6">
          <h2 className="text-lg font-extrabold text-(--foreground)">No payments</h2>
          <p className="mt-2">
            <span className="text-4xl font-extrabold tracking-tight text-(--foreground)">₹0</span>
            <span className="text-sm font-medium text-(--muted)"> no checkout</span>
          </p>
          <p className="mt-1 text-sm text-(--muted)">There is nothing to buy, ever.</p>
          <ul className="mt-4 flex-1 space-y-2 text-[15px] text-(--muted)">
            {["No subscriptions", "No payment provider", "No card details", "No paywalls"].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-0.5 text-emerald-600 dark:text-emerald-400">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <ButtonLink href="/about" variant="secondary" className="mt-6 w-full">
            About Toolora
          </ButtonLink>
        </Card>
      </div>
      <div className="mx-auto mt-8 max-w-3xl">
        <h2 className="text-xl font-extrabold text-(--foreground)">Pricing FAQs</h2>
        <div className="mt-3">
          <Faq
            items={[
              { question: "Is Toolora really free?", answer: "Yes. Every working tool is free with no account and no payments. There are no subscriptions, no premium tiers and no checkout." },
              { question: "Do I need an account?", answer: "No. Toolora has no user accounts, no login and no signup. Open any tool and use it immediately." },
              { question: "Are there usage limits or paywalls?", answer: "No paywalls. Some tools show practical file-size guidance for your browser, but nothing is locked behind a payment." },
              { question: "Will free tools stay free?", answer: "Yes. Toolora is a free website — all working tools remain free." },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
