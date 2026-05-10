import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, Section } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — Hudson Crest Capital" },
      {
        name: "description",
        content:
          "Terms governing use of the Hudson Crest Capital website, investor portal, and related services.",
      },
      { property: "og:title", content: "Terms of Use — Hudson Crest Capital" },
      {
        property: "og:description",
        content: "Terms governing use of Hudson Crest Capital services.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <SiteLayout>
      <Section>
        <div className="mx-auto max-w-3xl">
          <div className="eyebrow">Legal</div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground">Terms of Use</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: May 1, 2026</p>

          <div className="prose prose-invert mt-8 max-w-none text-sm leading-relaxed text-muted-foreground">
            <h2 className="mt-8 text-xl font-semibold text-foreground">1. Acceptance</h2>
            <p className="mt-2">
              By accessing this website or the Hudson Crest investor portal, you agree to these
              Terms of Use. If you do not agree, do not use the service.
            </p>

            <h2 className="mt-8 text-xl font-semibold text-foreground">
              2. No Offer or Solicitation
            </h2>
            <p className="mt-2">
              Content on this site is for informational purposes only and does not constitute an
              offer to sell or a solicitation to buy any security or fund interest in any
              jurisdiction where such offer or solicitation would be unlawful.
            </p>

            <h2 className="mt-8 text-xl font-semibold text-foreground">3. Eligibility</h2>
            <p className="mt-2">
              The investor portal is restricted to qualified institutional clients and accredited
              investors who have completed onboarding and suitability checks.
            </p>

            <h2 className="mt-8 text-xl font-semibold text-foreground">4. Intellectual Property</h2>
            <p className="mt-2">
              All content, trademarks, and software are owned by Hudson Crest Capital or its
              licensors and may not be reproduced without prior written consent.
            </p>

            <h2 className="mt-8 text-xl font-semibold text-foreground">
              5. Limitation of Liability
            </h2>
            <p className="mt-2">
              To the fullest extent permitted by law, Hudson Crest Capital is not liable for any
              indirect, incidental, or consequential damages arising from use of this site or
              reliance on its content.
            </p>

            <h2 className="mt-8 text-xl font-semibold text-foreground">6. Governing Law</h2>
            <p className="mt-2">
              These Terms are governed by the laws of the State of New York, without regard to
              conflict of laws principles.
            </p>

            <h2 className="mt-8 text-xl font-semibold text-foreground">7. Contact</h2>
            <p className="mt-2">
              Questions about these Terms? Email{" "}
              <a className="text-brand" href="mailto:legal@hudsoncrest.example">
                legal@hudsoncrest.example
              </a>
              .
            </p>
          </div>
        </div>
      </Section>
    </SiteLayout>
  );
}
