import { buildMetadata } from "@/lib/seo";
import { ProsePage } from "@/components/ui/Prose";

export const metadata = buildMetadata({
  title: "Terms of Service | Toolora",
  description: "The basic terms for using Toolora's free online tools.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <ProsePage
      crumbs={[{ label: "Home", href: "/" }, { label: "Terms of Service" }]}
      title="Terms of Service"
      intro="Last updated: October 2026. Foundation terms — requires legal review before commercial launch."
    >
      <h2>Using Toolora</h2>
      <p>
        Toolora provides free online utilities for general informational and productivity purposes.
        By using the site you agree to use the tools lawfully and not to abuse, disrupt or attempt to
        compromise the service.
      </p>
      <h2>Free tools — no account needed</h2>
      <p>
        Free tools are anonymous: no signup, no login, no personal information. They are provided
        “as is”, without warranties of any kind. Calculations (percentages, EMI,
        GST, age estimates) are planning aids — not professional financial, tax or legal advice.
      </p>
      <h2>No accounts</h2>
      <p>
        Toolora has no user accounts: no signup, no login and no passwords. Every tool is free and
        anonymous. Do not attempt to disrupt the service or misrepresent tool outputs as
        professional advice.
      </p>
      <h2>File tools</h2>
      <p>
        Images and PDFs are processed locally in your browser. Keep backups of originals before
        converting or editing. Do not upload files you have no right to process, and respect the
        size limits shown on each tool.
      </p>
      <h2>Intellectual property</h2>
      <p>
        The Toolora name, design and content belong to Toolora. You may use tool outputs for personal and
        commercial work unless a specific tool page says otherwise.
      </p>
      <h2>Changes</h2>
      <p>These terms may be updated from time to time — and legally reviewed — as Toolora evolves.</p>
    </ProsePage>
  );
}
