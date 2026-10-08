import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "./site";

interface PageSeoOptions {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
  type?: "website" | "article";
}

/** Build complete, unique metadata for any indexable page. */
export function buildMetadata({
  title,
  description,
  path,
  keywords,
  noIndex,
  type = "website",
}: PageSeoOptions): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      siteName: siteConfig.siteName,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.siteName,
    url: siteConfig.siteUrl,
    description: siteConfig.description,
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.siteName,
    url: siteConfig.siteUrl,
    logo: absoluteUrl("/icons/icon.svg"),
    sameAs: [siteConfig.social.twitter, siteConfig.social.github],
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqJsonLd(faq: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function softwareAppJsonLd(opts: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: opts.name,
    url: absoluteUrl(opts.path),
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    description: opts.description,
  };
}
