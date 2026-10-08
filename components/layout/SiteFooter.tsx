import Link from "next/link";
import { Logo } from "./Logo";
import { categories } from "@/data/categories";

const COMPANY = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Pricing", href: "/pricing" },
];

const LEGAL = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "Disclaimer", href: "/disclaimer" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-(--border) bg-(--surface)">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" aria-label="Toolora home">
              <Logo />
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-(--muted)">
              Simple tools. Better productivity. Fast, private, mobile-friendly utilities for everyday work.
            </p>
          </div>
          <nav aria-label="Tool categories">
            <h2 className="text-sm font-bold tracking-wide text-(--foreground) uppercase">Categories</h2>
            <ul className="mt-3 space-y-2">
              {categories.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`} className="text-sm text-(--muted) hover:text-brand-600 hover:underline dark:hover:text-brand-300">
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Company">
            <h2 className="text-sm font-bold tracking-wide text-(--foreground) uppercase">Company</h2>
            <ul className="mt-3 space-y-2">
              {COMPANY.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-(--muted) hover:text-brand-600 hover:underline dark:hover:text-brand-300">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/tools" className="text-sm text-(--muted) hover:text-brand-600 hover:underline dark:hover:text-brand-300">
                  All Tools
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-sm text-(--muted) hover:text-brand-600 hover:underline dark:hover:text-brand-300">
                  Search
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Legal">
            <h2 className="text-sm font-bold tracking-wide text-(--foreground) uppercase">Legal</h2>
            <ul className="mt-3 space-y-2">
              {LEGAL.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-(--muted) hover:text-brand-600 hover:underline dark:hover:text-brand-300">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-(--border) pt-6 sm:flex-row">
          {/* Static year: keeps the footer prerender-safe under Cache Components. */}
          <p className="text-sm text-(--muted)">© 2026 Toolora. All rights reserved.</p>
          <p className="text-xs text-(--muted)">100% free · No signup needed</p>
        </div>
      </div>
    </footer>
  );
}
