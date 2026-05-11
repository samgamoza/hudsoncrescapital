import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, Section } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Hudson Crest Capital" },
      {
        name: "description",
        content:
          "How Hudson Crest Capital collects, uses, and protects personal data across its global investment platform.",
      },
      { property: "og:title", content: "Privacy Policy | Hudson Crest Capital" },
      {
        property: "og:description",
        content: "How Hudson Crest Capital collects, uses, and protects personal data.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <SiteLayout>
      <Section>
        <div className="mx-auto max-w-3xl">
          <div className="eyebrow">Legal</div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: May 1, 2026</p>

          <div className="prose prose-invert mt-8 max-w-none text-sm leading-relaxed text-muted-foreground">
            <h2 className="mt-8 text-xl font-semibold text-foreground">
              1. Information We Collect
            </h2>
            <p className="mt-2">
              Hudson Crest Capital ("we", "our") collects information you provide directly,
              including name, email, organization, and inquiry details, together with technical
              data such as IP address, browser, and usage analytics when you visit our website or
              investor portal.
            </p>

            <h2 className="mt-8 text-xl font-semibold text-foreground">
              2. How We Use Information
            </h2>
            <p className="mt-2">
              We use personal data to operate our investor portal, respond to inquiries, comply with
              regulatory obligations, prevent fraud, and improve our services. We do not sell
              personal data.
            </p>

            <h2 className="mt-8 text-xl font-semibold text-foreground">3. Data Sharing</h2>
            <p className="mt-2">
              We share information with regulated service providers (custody, fund administration,
              identity verification, hosting) under contractual confidentiality, and with regulators
              where required by law.
            </p>

            <h2 className="mt-8 text-xl font-semibold text-foreground">
              4. International Transfers
            </h2>
            <p className="mt-2">
              As a global firm with desks in New York, London, and Singapore, data may be
              transferred across borders. Transfers rely on Standard Contractual Clauses or
              equivalent safeguards.
            </p>

            <h2 className="mt-8 text-xl font-semibold text-foreground">5. Your Rights</h2>
            <p className="mt-2">
              Depending on jurisdiction (GDPR, UK GDPR, CCPA), you may request access, correction,
              deletion, or portability of your personal data. Contact{" "}
              <a className="text-brand" href="mailto:privacy@hudsoncrestcapital.com">
                privacy@hudsoncrestcapital.com
              </a>
              .
            </p>

            <h2 className="mt-8 text-xl font-semibold text-foreground">6. Security</h2>
            <p className="mt-2">
              We employ encryption in transit and at rest, role-based access controls, and
              continuous monitoring. No method is 100% secure, but we apply institutional grade
              controls.
            </p>

            <h2 className="mt-8 text-xl font-semibold text-foreground">7. Updates</h2>
            <p className="mt-2">
              We may update this policy. Material changes will be posted on this page with a revised
              "Last updated" date.
            </p>
          </div>
        </div>
      </Section>
    </SiteLayout>
  );
}
