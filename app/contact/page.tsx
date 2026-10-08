import { buildMetadata } from "@/lib/seo";
import { ProsePage } from "@/components/ui/Prose";
import { Card } from "@/components/ui/Card";
import { siteConfig } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Contact Toolora",
  description: "Contact the Toolora team with feedback, tool requests or questions.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <ProsePage
      crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      title="Contact us"
      intro="Questions, feedback or a tool you would like us to build? We would like to hear from you."
    >
      <Card className="p-6">
        <h2 className="!mt-0 text-lg font-extrabold">Email</h2>
        <p>
          <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>
        </p>
        <h2 className="text-lg font-extrabold">What to include</h2>
        <ul>
          <li>The tool or page you are writing about (a link helps).</li>
          <li>Your device and browser, if reporting a problem.</li>
          <li>What you expected vs what happened.</li>
        </ul>
      </Card>
      <p className="text-sm">
        Note: contact forms with a backend arrive in a later release. Email is the supported channel for now.
      </p>
    </ProsePage>
  );
}
