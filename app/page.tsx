import { buildMetadata, faqJsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { categories } from "@/data/categories";
import { availableTools, freeTools, newTools, popularTools, tools } from "@/data/tools";
import { CategoryGrid } from "@/components/categories/CategoryCard";
import { ToolGrid } from "@/components/tools/ToolCard";
import { ToolSearchCombobox } from "@/components/tools/ToolSearch";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Faq } from "@/components/ui/Faq";
import { Badge } from "@/components/ui/Badge";
import { AdSlot } from "@/components/ui/Monetization";
import { JsonLd } from "@/components/seo/JsonLd";
import { ToolIcon } from "@/components/ui/ToolIcon";

export const metadata = buildMetadata({
  title: "Toolora — 100+ Free Online Tools for Everyday Work",
  description:
    "100+ fast, simple and privacy-conscious tools for images, PDFs, text, developers, calculations and more. Free tools work instantly, no sign-up.",
  path: "/",
  keywords: ["free online tools", "100+ tools", "image tools", "pdf tools", "word counter", "calculators", "developer tools"],
});

const HOME_FAQ = [
  {
    question: "Is Toolora free to use?",
    answer:
      "Yes — completely free. Every working tool is free with no account, no subscriptions and no payments.",
  },
  {
    question: "Do I need to create an account?",
    answer:
      "No. There are no accounts on Toolora — no signup, no login. All working tools run instantly and anonymously.",
  },
  {
    question: "Is my data private?",
    answer:
      "Yes. Working tools like converters, calculators and text utilities process everything in your browser — nothing is uploaded or stored. Each tool page documents exactly where processing happens.",
  },
  {
    question: "Which tools actually work today?",
    answer:
      `${availableTools.length} tools are fully functional, from word counting and JSON formatting to calculators and QR codes. Every other tool page honestly says “Coming soon” until its processing logic is implemented — we never fake functionality.`,
  },
  {
    question: "Does Toolora work on mobile?",
    answer:
      "Absolutely. Every page is designed mobile-first and tested from 320px phones up to large desktop monitors.",
  },
];

const WHY = [
  { icon: "check", title: "Fast", text: "Lightweight pages and on-device processing. No bloat, no waiting rooms." },
  { icon: "spark", title: "Simple", text: "One job per tool, clear steps, no manuals required." },
  { icon: "lock", title: "Privacy-conscious", text: "Client-side first. Your text and files stay on your device." },
  { icon: "resize", title: "Mobile friendly", text: "Designed for thumbs and small screens, scales to desktop." },
  { icon: "hash", title: "Free tools available", text: "Dozens of genuinely useful tools, no account needed." },
  { icon: "wrench", title: "No unnecessary complexity", text: "No installs, no plugins, no clutter — open a tool and get it done." },
];

function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export default function HomePage() {
  const featured = popularTools.slice(0, 8);
  const newest = newTools.slice(0, 4);
  const free = freeTools.filter((t) => t.status === "available").slice(0, 8);

  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={faqJsonLd(HOME_FAQ)} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-100/70 via-transparent to-transparent dark:from-brand-500/10" />
        <Container className="relative py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="brand" className="mb-4">
              {tools.length}+ tools · {availableTools.length} working now · {freeTools.length} free
            </Badge>
            <h1 className="text-4xl leading-[1.08] font-extrabold tracking-tight text-balance text-(--foreground) sm:text-5xl lg:text-6xl">
              100+ tools for everyday work.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-pretty text-(--muted)">
              Fast, simple and privacy-conscious tools for images, PDFs, text, developers, calculations and more.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/tools" size="lg">
                Explore All Tools
              </ButtonLink>
              <ButtonLink href="/categories" size="lg" variant="secondary">
                Browse Categories
              </ButtonLink>
            </div>
            <div className="mx-auto mt-7 max-w-xl">
              <ToolSearchCombobox size="lg" />
              <p className="mt-2 text-sm text-(--muted)">
                Try “word counter”, “pdf” or “emi” — press Enter to search.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Popular tools */}
      <section aria-labelledby="popular-tools" className="py-10 sm:py-14">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="popular-tools" className="text-2xl font-extrabold tracking-tight text-(--foreground) sm:text-3xl">
                Popular tools
              </h2>
              <p className="mt-1 text-[15px] text-(--muted)">The utilities people reach for most.</p>
            </div>
            <ButtonLink href="/tools?filter=popular" variant="ghost" size="sm">
              View popular →
            </ButtonLink>
          </div>
          <div className="stagger mt-6">
            <ToolGrid tools={featured} />
          </div>
        </Container>
      </section>

      {/* Categories */}
      <section aria-labelledby="categories" className="bg-(--surface) py-10 sm:py-14">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="categories" className="text-2xl font-extrabold tracking-tight text-(--foreground) sm:text-3xl">
                Tool categories
              </h2>
              <p className="mt-1 max-w-2xl text-[15px] text-(--muted)">
                Eight focused collections. Pick a category to see every tool inside — live ones and what is coming next.
              </p>
            </div>
            <ButtonLink href="/categories" variant="ghost" size="sm">
              All categories →
            </ButtonLink>
          </div>
          <div className="stagger mt-6">
            <CategoryGrid categories={categories} />
          </div>
        </Container>
      </section>

      {/* Free tools */}
      <section aria-labelledby="free-tools" className="py-10 sm:py-14">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="free-tools" className="text-2xl font-extrabold tracking-tight text-(--foreground) sm:text-3xl">
                Free tools that work now
              </h2>
              <p className="mt-1 text-[15px] text-(--muted)">No account, no paywall — open and use.</p>
            </div>
            <ButtonLink href="/tools?filter=free" variant="ghost" size="sm">
              View all free →
            </ButtonLink>
          </div>
          <div className="mt-6">
            <ToolGrid tools={free} />
          </div>
        </Container>
      </section>

      {/* Why Toolora */}
      <section aria-labelledby="why" className="bg-(--surface) py-10 sm:py-14">
        <Container>
          <h2 id="why" className="text-center text-2xl font-extrabold tracking-tight text-(--foreground) sm:text-3xl">
            Why Toolora?
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-[15px] text-(--muted)">
            Built like a product you rely on every day — not a link farm.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHY.map((w) => (
              <Card key={w.title} className="p-6">
                <ToolIcon icon={w.icon} size={40} />
                <h3 className="mt-3 text-lg font-bold text-(--foreground)">{w.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-(--muted)">{w.text}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* New tools */}
      <section aria-labelledby="new-tools" className="py-10 sm:py-14">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="new-tools" className="text-2xl font-extrabold tracking-tight text-(--foreground) sm:text-3xl">
                Recently added
              </h2>
              <p className="mt-1 text-[15px] text-(--muted)">Fresh tools and freshly planned additions.</p>
            </div>
            <ButtonLink href="/tools?filter=new" variant="ghost" size="sm">
              See what is new →
            </ButtonLink>
          </div>
          <div className="mt-6">
            <ToolGrid tools={newest} />
          </div>
        </Container>
      </section>

      {/* Free forever */}
      <section aria-labelledby="free" className="bg-(--surface) py-10 sm:py-14">
        <Container>
          <Card className="overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-8 sm:p-10">
                <Badge tone="free">100% free</Badge>
                <h2 id="free" className="mt-3 text-2xl font-extrabold tracking-tight text-(--foreground) sm:text-3xl">
                  Free. No signup. No catch.
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-(--muted)">
                  Every working tool is free for everyone, with no accounts and no payments.
                  Your files are processed in your browser — nothing is uploaded or stored.
                </p>
                <ul className="mt-4 space-y-2 text-[15px] text-(--foreground)">
                  {["No signup or login", "No subscriptions or paywalls", "Private, on-device processing", "Mobile-friendly and fast"].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <ButtonLink href="/tools">Start using tools</ButtonLink>
                  <ButtonLink href="/pricing" variant="secondary">Why it is free</ButtonLink>
                </div>
              </div>
              <div className="flex items-center bg-gradient-to-br from-brand-600 via-brand-700 to-fuchsia-700 p-8 text-white sm:p-10">
                <div>
                  <p className="text-sm font-bold tracking-widest uppercase opacity-80">Pricing</p>
                  <p className="mt-2 text-4xl font-extrabold">₹0 <span className="text-base font-medium opacity-80">forever</span></p>
                  <p className="mt-2 text-[15px] leading-relaxed opacity-90">
                    Free for every tool, for everyone. No accounts, no subscriptions, no checkout.
                  </p>
                </div>
              </div>
            </div>
          </Card>
          <div className="mt-6">
            <AdSlot />
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="py-10 sm:py-14">
        <Container>
          <div className="mx-auto max-w-3xl">
            <h2 id="faq" className="text-center text-2xl font-extrabold tracking-tight text-(--foreground) sm:text-3xl">
              Frequently asked questions
            </h2>
            <div className="mt-6">
              <Faq items={HOME_FAQ} headingLevel={3} />
            </div>
          </div>
        </Container>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="cta" className="bg-(--surface) py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl rounded-3xl border border-(--border) bg-(--surface) p-8 text-center shadow-sm sm:p-12">
            <h2 id="cta" className="text-2xl font-extrabold tracking-tight text-(--foreground) sm:text-3xl">
              Find the tool you need.
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-[15px] text-(--muted)">
              Browse {tools.length} tools across {categories.length} categories — {availableTools.length} working now, free to try, no sign-up required.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/tools" size="lg">Explore All Tools</ButtonLink>
              <ButtonLink href="/search" size="lg" variant="secondary">Search tools</ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
