import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, Section } from "@/components/site/SiteLayout";
import { LiveMarket } from "@/components/site/LiveMarket";

export const Route = createFileRoute("/markets")({
  head: () => ({
    meta: [
      { title: "Live Markets & AI Sentiment — Hudson Crest Capital" },
      {
        name: "description",
        content:
          "Real-time market quotes and AI-driven news sentiment across global asset classes.",
      },
      { property: "og:title", content: "Live Markets & AI Sentiment — Hudson Crest Capital" },
      {
        property: "og:description",
        content: "Real-time quotes and AI news sentiment across global markets.",
      },
    ],
  }),
  component: MarketsPage,
});

function MarketsPage() {
  return (
    <SiteLayout>
      <Section>
        <div className="max-w-2xl">
          <div className="eyebrow">Live Intelligence</div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Live Markets & AI Sentiment
          </h1>
          <p className="mt-4 text-muted-foreground">
            Real-time quotes across major instruments alongside AI-classified news sentiment,
            updated continuously throughout the trading day.
          </p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          <LiveMarket />
        </div>
      </Section>
    </SiteLayout>
  );
}
