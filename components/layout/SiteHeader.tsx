"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "../layout/Logo";
import { ThemeToggle } from "../theme/ThemeToggle";
import { categories } from "@/data/categories";
import { getToolsByCategory, popularTools } from "@/data/tools";
import { ToolIcon } from "../ui/ToolIcon";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Tools", href: "/tools", menu: "tools" },
  { label: "Categories", href: "/categories", menu: "categories" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [mega, setMega] = useState<"tools" | "categories" | null>(null);
  const closeTimer = useRef<number | null>(null);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
    setMega(null);
  }

  const openMega = (m: "tools" | "categories") => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setMega(m);
  };
  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setMega(null), 150);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    }, 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMega(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-(--border) bg-(--header-bg) backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Toolora home" className="mr-1 shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex" onMouseLeave={scheduleClose}>
          {NAV.map((item) => (
            <div key={item.href} className="relative" onMouseEnter={() => ("menu" in item && item.menu ? openMega(item.menu) : setMega(null))}>
              <Link
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                aria-expanded={"menu" in item && item.menu ? mega === item.menu : undefined}
                aria-haspopup={"menu" in item && item.menu ? "true" : undefined}
                onFocus={() => ("menu" in item && item.menu ? openMega(item.menu) : setMega(null))}
                className={cn(
                  "rounded-lg px-3 py-2 text-[15px] font-medium transition-colors",
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "text-brand-700 dark:text-brand-300"
                    : "text-(--muted) hover:bg-(--surface-2) hover:text-(--foreground)",
                )}
              >
                {item.label}
                {"menu" in item && item.menu && <span aria-hidden="true" className="ml-1 text-xs">▾</span>}
              </Link>
            </div>
          ))}
          {mega && (
            <div className="absolute top-full right-0 left-0" onMouseEnter={() => openMega(mega)} onMouseLeave={scheduleClose}>
              <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div role="menu" aria-label={mega === "tools" ? "Tools menu" : "Categories menu"}
                  className="animate-menu-in mt-1 overflow-hidden rounded-2xl border border-(--border) bg-(--surface) shadow-2xl">
                  {mega === "tools" ? <ToolsMegaMenu onNavigate={() => setMega(null)} /> : <CategoriesMegaMenu onNavigate={() => setMega(null)} />}
                </div>
              </div>
            </div>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/search"
            aria-label="Search tools"
            className="grid h-11 w-11 place-items-center rounded-xl text-(--muted) transition-colors hover:bg-(--surface-2) hover:text-(--foreground)"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </Link>
          <div className="hidden md:block">
            <ThemeToggle compact />
          </div>
          <Link
            href="/tools"
            className="hidden min-h-[40px] items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 sm:inline-flex"
          >
            Browse Tools
          </Link>
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-11 w-11 place-items-center rounded-xl text-(--foreground) transition-colors hover:bg-(--surface-2) lg:hidden"
          >
            <span aria-hidden="true" className="relative block h-5 w-5">
              <span className={cn("absolute top-0.5 left-0 h-0.5 w-5 rounded bg-current transition-all", open && "top-2 rotate-45")} />
              <span className={cn("absolute top-2 left-0 h-0.5 w-5 rounded bg-current transition-all", open && "opacity-0")} />
              <span className={cn("absolute bottom-0.5 left-0 h-0.5 w-5 rounded bg-current transition-all", open && "bottom-2 -rotate-45")} />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-black/40" aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="animate-menu-in absolute top-0 right-0 left-0 max-h-[92dvh] overflow-y-auto rounded-b-3xl border-b border-(--border) bg-(--surface) p-4 shadow-2xl sm:right-4 sm:left-auto sm:w-[380px] sm:rounded-3xl sm:border"
          >
            <MobileMenuContent onNavigate={() => setOpen(false)} onClose={() => { setOpen(false); buttonRef.current?.focus(); }} />
          </div>
        </div>
      )}
    </header>
  );
}

function ToolsMegaMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[1fr_1.4fr]">
      <div>
        <p className="text-xs font-bold tracking-widest text-(--muted) uppercase">Popular</p>
        <ul className="mt-3 space-y-1">
          {popularTools.slice(0, 5).map((t) => (
            <li key={t.slug}>
              <Link href={`/tools/${t.slug}`} onClick={onNavigate} role="menuitem"
                className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-(--surface-2)">
                <ToolIcon icon={t.icon} category={t.category} size={32} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-(--foreground)">{t.name}</span>
                  <span className="block truncate text-xs text-(--muted)">{t.shortDescription}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/tools" onClick={onNavigate} className="mt-3 inline-block px-2 text-sm font-bold text-brand-700 hover:underline dark:text-brand-300">
          View all tools →
        </Link>
      </div>
      <div>
        <p className="text-xs font-bold tracking-widest text-(--muted) uppercase">By category</p>
        <ul className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {categories.map((c) => {
            const featured = getToolsByCategory(c.slug).filter((t) => t.status === "available").slice(0, 2);
            return (
              <li key={c.slug} className="rounded-xl px-2 py-2 hover:bg-(--surface-2)">
                <Link href={`/category/${c.slug}`} onClick={onNavigate} role="menuitem" className="flex items-center gap-2.5">
                  <ToolIcon icon={c.icon} accent={c.accent} size={32} />
                  <span className="text-sm font-bold text-(--foreground)">{c.shortTitle}</span>
                </Link>
                <p className="mt-1 truncate pl-[42px] text-xs text-(--muted)">
                  {featured.length > 0 ? featured.map((t) => t.name).join(" · ") : `${getToolsByCategory(c.slug).length} tools`}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function CategoriesMegaMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 p-6 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((c) => (
        <Link key={c.slug} href={`/category/${c.slug}`} onClick={onNavigate} role="menuitem"
          className="flex items-start gap-3 rounded-xl p-3 hover:bg-(--surface-2)">
          <ToolIcon icon={c.icon} accent={c.accent} size={40} />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-(--foreground)">{c.title}</span>
            <span className="clamp-2 mt-0.5 block text-xs text-(--muted)">{c.description}</span>
            <span className="mt-1 block text-xs font-semibold text-(--muted)">{getToolsByCategory(c.slug).length} tools</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

const MOBILE_LINKS = [
  { label: "Home", href: "/" },
  { label: "All Tools", href: "/tools" },
  { label: "Popular Tools", href: "/tools?filter=popular" },
  { label: "New Tools", href: "/tools?filter=new" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

function MobileMenuContent({ onNavigate, onClose }: { onNavigate: () => void; onClose: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between px-1">
        <Logo compact />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="grid h-11 w-11 place-items-center rounded-xl text-(--foreground) hover:bg-(--surface-2)"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <nav aria-label="Mobile" className="mt-2">
        <ul className="space-y-1">
          {MOBILE_LINKS.map((l) => (
            <li key={l.href + l.label}>
              <Link
                href={l.href}
                onClick={onNavigate}
                className="flex min-h-[48px] items-center rounded-xl px-3 text-[16px] font-medium text-(--foreground) transition-colors hover:bg-(--surface-2)"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 px-3 text-xs font-bold tracking-widest text-(--muted) uppercase">Categories</p>
        <ul className="mt-1 grid grid-cols-2 gap-1">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/category/${c.slug}`}
                onClick={onNavigate}
                className="flex min-h-[48px] items-center gap-2 rounded-xl px-3 text-[15px] font-medium text-(--foreground) hover:bg-(--surface-2)"
              >
                <ToolIcon icon={c.icon} accent={c.accent} size={28} />
                {c.shortTitle}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-(--surface-2) px-3 py-2">
        <span className="text-sm font-semibold text-(--muted)">Theme</span>
        <ThemeToggle compact />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 pb-2">
        <Link
          href="/tools"
          onClick={onNavigate}
          className="flex min-h-[48px] items-center justify-center rounded-xl bg-brand-600 px-4 text-[15px] font-semibold text-white hover:bg-brand-700"
        >
          Browse Tools
        </Link>
        <Link
          href="/contact"
          onClick={onNavigate}
          className="flex min-h-[48px] items-center justify-center rounded-xl border border-(--border) px-4 text-[15px] font-semibold text-(--foreground)"
        >
          Contact
        </Link>
      </div>
    </div>
  );
}
