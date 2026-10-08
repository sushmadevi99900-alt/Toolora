import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider, themeInitScript } from "@/components/theme/ThemeProvider";
import { Ga4PageViews, Ga4Script } from "@/components/analytics/Analytics";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { siteConfig } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: "Toolora — Free Online Tools for Everyday Work",
    // Identity template: every page already provides its full unique title.
    template: "%s",
  },
  description: siteConfig.description,
  icons: { icon: "/icons/icon.svg" },
  alternates: { canonical: siteConfig.siteUrl },
  openGraph: {
    type: "website",
    siteName: siteConfig.siteName,
    title: "Toolora — Free Online Tools for Everyday Work",
    description: siteConfig.description,
    url: siteConfig.siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Toolora — Free Online Tools for Everyday Work",
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-full flex-col antialiased`}
      >
        <ThemeProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to main content
          </a>
          <SiteHeader />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </ThemeProvider>
        <Ga4Script />
        <Suspense fallback={null}>
          <Ga4PageViews />
        </Suspense>
      </body>
    </html>
  );
}
