"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { gaPageView, trackToolUseClient } from "@/lib/analytics/ga4";

/** Loads GA4 only when a measurement ID is configured. Otherwise renders nothing. */
export function Ga4Script() {
  const id = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "").trim();
  if (!id) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}

/**
 * Reports page views on Next.js client-side navigations. The initial page
 * load is already counted by the `gtag('config', …)` above, so the first
 * render is skipped to avoid a duplicate `page_view` event.
 */
export function Ga4PageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const query = searchParams?.toString();
    gaPageView(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  return null;
}

/**
 * Fires one anonymous `tool_used` event when a tool workspace mounts.
 * Rendered by ToolWorkspace — the central tool execution point — so every
 * functional tool is tracked without per-tool changes.
 */
export function ToolUseTracker({ slug, category }: { slug: string; category: string }) {
  useEffect(() => {
    trackToolUseClient(slug, category);
  }, [slug, category]);
  return null;
}
