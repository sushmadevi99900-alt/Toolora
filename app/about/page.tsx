import { buildMetadata } from "@/lib/seo";
import { ProsePage } from "@/components/ui/Prose";
import { ButtonLink } from "@/components/ui/Button";

export const metadata = buildMetadata({
  title: "About Toolora — Simple Tools, Better Productivity",
  description:
    "Learn what Toolora is: fast, private, mobile-friendly online tools for everyday work. Completely free — no accounts, no signup.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <ProsePage
      crumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
      title="About Toolora"
      intro="Toolora is a growing collection of fast, simple online tools — built for real work, not demo screenshots."
    >
      <h2>What Toolora is</h2>
      <p>
        Toolora provides small, dependable utilities for images, PDFs, text, developers, calculators
        and everyday conversions. Each tool does one job well: open it, get a result, move on.
      </p>
      <h2>Our principles</h2>
      <ul>
        <li><strong>Fast</strong> — lightweight pages that work on low-end phones and slow networks.</li>
        <li><strong>Simple</strong> — clear steps, honest states, no clutter.</li>
        <li><strong>Privacy-conscious</strong> — client-side processing wherever possible.</li>
        <li><strong>Honest</strong> — tools say “Coming soon” until they genuinely work.</li>
      </ul>
      <h2>Free, with no accounts</h2>
      <p>
        Toolora is a completely free website. There are no user accounts, no subscriptions and no
        payments — open any working tool and use it immediately. Tools marked “Coming soon” are
        honest placeholders: the page stays up until the real processing logic is implemented,
        because we never fake functionality.
      </p>
      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
        <ButtonLink href="/tools">Explore tools</ButtonLink>
        <ButtonLink href="/contact" variant="secondary">Contact us</ButtonLink>
      </div>
    </ProsePage>
  );
}
