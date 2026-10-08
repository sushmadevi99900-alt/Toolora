import { buildMetadata } from "@/lib/seo";
import { ProsePage } from "@/components/ui/Prose";

export const metadata = buildMetadata({
  title: "Disclaimer | Toolora",
  description: "Important limits on Toolora tool outputs: estimators and general information, not professional advice.",
  path: "/disclaimer",
});

export default function DisclaimerPage() {
  return (
    <ProsePage
      crumbs={[{ label: "Home", href: "/" }, { label: "Disclaimer" }]}
      title="Disclaimer"
      intro="Last updated: October 2026. Requires legal review before commercial launch."
    >
      <h2>General information only</h2>
      <p>
        All Toolora tools provide general information and estimates. Outputs from calculators (EMI, GST,
        percentages, age and date math) are planning aids computed from standard formulas — they are not
        financial, tax, legal or medical advice.
      </p>
      <h2>Verify important decisions</h2>
      <p>
        Always confirm critical numbers with a qualified professional or your service provider before acting
        (borrowing, filing taxes, signing contracts). We make no guarantees about completeness or fitness
        for any particular purpose.
      </p>
      <h2>File tools</h2>
      <p>Keep backups of original files before converting, compressing or editing them with any online tool.</p>
    </ProsePage>
  );
}
