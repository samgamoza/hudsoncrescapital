import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, Section } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/disclosures")({
  head: () => ({
    meta: [
      { title: "Disclosures | Hudson Crest Capital" },
      {
        name: "description",
        content:
          "Regulatory disclosures, risk warnings, and performance disclaimers for Hudson Crest Capital.",
      },
      { property: "og:title", content: "Disclosures | Hudson Crest Capital" },
      { property: "og:description", content: "Regulatory disclosures and risk disclaimers." },
    ],
  }),
  component: DisclosuresPage,
});

function DisclosuresPage() {
  return (
    <SiteLayout>
      <Section>
        <div className="mx-auto max-w-3xl">
          <div className="eyebrow">Legal</div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground">Disclosures</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: May 1, 2026</p>

          <div className="prose prose-invert mt-8 max-w-none text-sm leading-relaxed text-muted-foreground">
            <h2 className="mt-8 text-xl font-semibold text-foreground">Regulatory Status</h2>
            <p className="mt-2">
              Hudson Crest Capital is a registered investment adviser with the U.S. Securities and
              Exchange Commission ("SEC"). Affiliates may be authorised by the UK Financial Conduct
              Authority and the Monetary Authority of Singapore where applicable. Registration does
              not imply a particular level of skill or training.
            </p>

            <h2 className="mt-8 text-xl font-semibold text-foreground">Performance Disclaimer</h2>
            <p className="mt-2">
              Past performance is not indicative of future results. Investment returns and principal
              value will fluctuate and an investor's shares, when redeemed, may be worth more or
              less than their original cost. All performance figures shown are net of fees unless
              otherwise stated.
            </p>

            <h2 className="mt-8 text-xl font-semibold text-foreground">Risk Warning</h2>
            <p className="mt-2">
              Investments in alternative strategies involve a high degree of risk, including the
              possible loss of all capital invested. They may employ leverage, derivatives, and
              short selling, and may be illiquid. They are suitable only for investors who can bear
              such risks.
            </p>

            <h2 className="mt-8 text-xl font-semibold text-foreground">
              Forward-Looking Statements
            </h2>
            <p className="mt-2">
              Statements regarding market outlook, AI signals, or strategy positioning are
              forward-looking and based on current views. Actual outcomes may differ materially.
            </p>

            <h2 className="mt-8 text-xl font-semibold text-foreground">Form ADV & Brochure</h2>
            <p className="mt-2">
              Our Form ADV Part 2A brochure is available on request. Contact{" "}
              <a className="text-brand" href="mailto:compliance@hudsoncrest.example">
                compliance@hudsoncrest.example
              </a>{" "}
              for a copy.
            </p>

            <h2 className="mt-8 text-xl font-semibold text-foreground">Jurisdictional Notice</h2>
            <p className="mt-2">
              Information on this site is not directed at any person in any jurisdiction where its
              publication or availability is prohibited.
            </p>
          </div>
        </div>
      </Section>
    </SiteLayout>
  );
}
