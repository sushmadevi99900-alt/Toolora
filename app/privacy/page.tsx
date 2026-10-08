import { buildMetadata } from "@/lib/seo";
import { ProsePage } from "@/components/ui/Prose";

export const metadata = buildMetadata({
  title: "Privacy Policy | Toolora",
  description: "How Toolora handles your data: anonymous free use with no accounts, on-device processing and Google Analytics for aggregate traffic stats.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <ProsePage
      crumbs={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]}
      title="Privacy Policy"
      intro="Last updated: October 2026. Requires legal review before commercial launch."
    >
      <h2>Overview</h2>
      <p>
        Toolora is designed to minimise data collection. There are no user accounts, no login and
        no signup — every visitor is anonymous. We do not maintain a database of visitors.
      </p>
      <h2>No accounts, no user database</h2>
      <ul>
        <li><strong>No signup, no login.</strong> Toolora has no authentication system and stores no usernames, passwords or profiles.</li>
        <li><strong>No names, no emails.</strong> We never ask for personal details and keep no visitor records.</li>
        <li><strong>No payment data.</strong> There are no subscriptions, no checkout and no payment provider — nothing can be purchased, so nothing payment-related is collected.</li>
      </ul>
      <h2>Your files stay on your device</h2>
      <ul>
        <li><strong>Tool inputs stay on your device.</strong> Text, images and PDFs are processed locally in your browser — they are never uploaded to our servers.</li>
        <li><strong>No document contents collected.</strong> We never see, store or transmit what you type, paste or upload into a tool.</li>
      </ul>
      <h2>Google Analytics</h2>
      <p>
        Toolora uses Google Analytics 4 (GA4) to understand aggregate website traffic — for example,
        how many visitors came this month, which pages and tools are popular, and which countries and
        devices visitors use. Google Analytics provides the analytics dashboard; Toolora keeps no
        separate analytics database.
      </p>
      <ul>
        <li><strong>Aggregate only.</strong> We look at totals and trends, never at identified individuals.</li>
        <li><strong>Anonymous tool events.</strong> When a tool is used, only the tool name and its category are reported (for example, “word-counter” in “text”) — never your input text, files or personal information.</li>
        <li><strong>IP anonymisation.</strong> Analytics requests are sent with IP anonymisation enabled.</li>
        <li><strong>Google&apos;s mechanisms.</strong> Google Analytics may use its own cookies and measurement mechanisms as described in Google&apos;s documentation. The site works the same whether or not analytics loads.</li>
      </ul>
      <h2>What we do not do</h2>
      <ul>
        <li>No advertising trackers.</li>
        <li>No selling or sharing of personal data.</li>
        <li>No user accounts or visitor database.</li>
        <li>No passwords or credentials of any kind.</li>
        <li>No collection of tool inputs or uploaded file contents.</li>
      </ul>
      <h2>Contact</h2>
      <p>For privacy questions, email us via the <a href="/contact">contact page</a>.</p>
    </ProsePage>
  );
}
