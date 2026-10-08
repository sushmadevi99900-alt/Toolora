import { buildMetadata } from "@/lib/seo";
import { ProsePage } from "@/components/ui/Prose";

export const metadata = buildMetadata({
  title: "Cookie Policy | Toolora",
  description: "How Toolora uses cookies and browser storage: theme choice and optional analytics.",
  path: "/cookie-policy",
});

export default function CookiePolicyPage() {
  return (
    <ProsePage
      crumbs={[{ label: "Home", href: "/" }, { label: "Cookie Policy" }]}
      title="Cookie Policy"
      intro="Last updated: October 2026. Requires legal review before commercial launch."
    >
      <h2>What we store</h2>
      <ul>
        <li><strong>Theme preference</strong> (<code>toolora-theme</code> in localStorage) — stays on your device, remembers light/dark/system.</li>
        <li><strong>Google Analytics</strong> — only if enabled; standard GA4 cookies for aggregate traffic measurement. Toolora itself keeps no visitor database.</li>
      </ul>
      <h2>No advertising cookies</h2>
      <p>Toolora sets no advertising or cross-site tracking cookies.</p>
      <h2>Managing storage</h2>
      <p>You can clear site data at any time in your browser settings — the only effect is resetting the theme choice.</p>
    </ProsePage>
  );
}
