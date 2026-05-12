import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { SiteLayout, SplitHero, Section } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Performance | Hudson Crest Capital" },
      {
        name: "description",
        content:
          "Disciplined process and risk-aware investing. Verified performance materials are provided to prospective clients under appropriate confidentiality.",
      },
      { property: "og:title", content: "Performance | Hudson Crest Capital" },
      {
        property: "og:description",
        content:
          "Disciplined process and risk-aware investing. Materials available through Investor Relations.",
      },
    ],
  }),
  component: PerformancePage,
});

function PerformancePage() {
  return (
    <SiteLayout>
      <SplitHero
        eyebrow="Performance"
        title="Consistent Returns. Disciplined Risk."
        highlight="Built for the Long Term."
        description="We invest with a repeatable process and rigorous risk controls. Historical composites, benchmarks, and other quantitative materials are not published on this site; they are shared with qualified prospective clients through Investor Relations."
        side={
          <div className="surface-card p-6 text-sm leading-relaxed text-muted-foreground">
            Nothing on this page is an offer or solicitation. Past performance is not indicative of
            future results. Request formal materials and data room access through{" "}
            <Link to="/contact" className="text-brand hover:underline">
              Investor Relations
            </Link>
            .
          </div>
        }
      />

      <Section>
        <div className="surface-card p-8 lg:p-10">
          <div className="eyebrow">Reporting</div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The firm does not display simulated curves, heatmaps, or headline performance figures on
            the public website. Account-specific reporting for approved investors is available in the
            client portal where applicable.
          </p>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="surface-card p-6">
            <div className="eyebrow">Our Performance Philosophy</div>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                "Focus on risk-adjusted outcomes, not headline numbers in isolation",
                "Diversify across uncorrelated sources of return where appropriate",
                "Use data and models to support judgment, not replace it",
                "Maintain disciplined risk limits and escalation paths",
                "Stay patient and let process compound",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="surface-card p-6">
            <div className="eyebrow">Our Disciplined Process</div>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>Idea generation grounded in research and risk budget</li>
              <li>Validation, sizing, and documentation before risk is taken</li>
              <li>Execution with operational controls and best-efforts best execution</li>
              <li>Ongoing monitoring, review, and learning</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card flex flex-col items-start justify-between gap-5 border-brand/30 bg-brand/5 p-8 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <Mail className="h-9 w-9 text-brand" />
            <div>
              <h3 className="text-xl font-semibold text-foreground">
                Request verified performance materials.
              </h3>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Our team can walk you through reporting scope, definitions, and regulatory context.
              </p>
            </div>
          </div>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-glow"
          >
            Contact Investor Relations <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Section>
    </SiteLayout>
  );
}
