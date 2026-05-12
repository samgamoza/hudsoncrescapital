import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Globe,
  Brain,
  Calendar,
  Repeat,
  TrendingUp,
  Award,
  Users,
  Briefcase,
  LineChart,
  BarChart3,
  PieChart,
  Coins,
  ArrowRight,
  Database,
  Target,
  Cpu,
  Activity,
  ShieldCheck,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { SiteLayout, SplitHero, Section } from "@/components/site/SiteLayout";
import worldMap from "@/assets/world-map-desks.jpg";

export const Route = createFileRoute("/strategies")({
  head: () => ({
    meta: [
      { title: "Investment Strategies | Hudson Crest Capital" },
      {
        name: "description",
        content:
          "A diversified, multi strategy platform designed to capture opportunities across global markets, powered by AI, guided by deep market expertise.",
      },
      { property: "og:title", content: "Investment Strategies | Hudson Crest Capital" },
      { property: "og:description", content: "Diverse strategies. Unified by intelligence." },
      { property: "og:image", content: worldMap },
    ],
  }),
  component: StrategiesPage,
});

const STRATEGIES = [
  {
    icon: Globe,
    n: "1",
    t: "Macro Strategies",
    d: "Top-down analysis of global economic trends, central bank policy, interest rates, and geopolitical developments to position across asset classes.",
    f: [
      "Global economic research",
      "Interest rate & currency positioning",
      "Cross asset allocation",
      "Risk-on / Risk-off rotation",
    ],
  },
  {
    icon: Brain,
    n: "2",
    t: "AI Quantitative Strategies",
    d: "AI and machine learning models discover patterns, generate alpha signals, and execute trades with speed, precision, and consistency.",
    f: [
      "ML signal generation",
      "High-frequency & low-latency systems",
      "Cross-sectional & time-series models",
      "Dynamic factor investing",
    ],
  },
  {
    icon: Calendar,
    n: "3",
    t: "Event-Driven Strategies",
    d: "Capitalizing on corporate events such as mergers, acquisitions, earnings, restructurings, and spin-offs to generate alpha.",
    f: [
      "M&A arbitrage",
      "Earnings & guidance reactions",
      "Corporate restructurings",
      "Special situations",
    ],
  },
  {
    icon: Repeat,
    n: "4",
    t: "Relative Value & Arbitrage",
    d: "Exploiting pricing inefficiencies across related instruments, markets, and assets with a hedge against market direction.",
    f: [
      "Statistical arbitrage",
      "Pairs & spread trading",
      "Convertible arbitrage",
      "FX & rates arbitrage",
    ],
  },
];

const ASSET_CLASSES = [
  { icon: BarChart3, t: "Equities", d: "Global developed & emerging markets" },
  { icon: LineChart, t: "Fixed Income", d: "Rates, credit & structured products" },
  { icon: PieChart, t: "Forex", d: "G10, emerging & exotic currencies" },
  { icon: Target, t: "Commodities", d: "Energy, metals & agricultural" },
  { icon: Coins, t: "Digital Assets", d: "Crypto & blockchain investments" },
  { icon: Activity, t: "Derivatives", d: "Options, futures & structured derivatives" },
];

const AI_PIPELINE = [
  {
    icon: Database,
    t: "Data Ingestion",
    d: "Real time market data, alternative data, news, sentiment and on chain information.",
  },
  {
    icon: Brain,
    t: "AI Signal Generation",
    d: "Machine learning models identify patterns, anomalies and opportunities with high probability.",
  },
  {
    icon: PieChart,
    t: "Portfolio Construction",
    d: "Optimization models balance return potential with risk, liquidity and correlation.",
  },
  {
    icon: Target,
    t: "Execution",
    d: "Smart order routing and algorithmic execution to minimize market impact.",
  },
  {
    icon: ShieldCheck,
    t: "Risk Management",
    d: "AI driven risk monitoring, stress testing & scenario analysis in real time.",
  },
  {
    icon: TrendingUp,
    t: "Performance Review",
    d: "Continuous learning loop improves models and adapts to changing market dynamics.",
  },
];

function StrategiesPage() {
  return (
    <SiteLayout>
      <SplitHero
        eyebrow="Our Strategies"
        title="Diverse Strategies. Unified by"
        highlight="Intelligence."
        description="Hudson Crest Capital deploys a disciplined, multi strategy approach powered by artificial intelligence and guided by deep market expertise. Our strategies are designed to generate consistent, risk adjusted returns across market cycles and asset classes."
        image={worldMap}
        imageAlt="Global trading network"
        side={
          <div className="surface-card p-5 text-sm leading-relaxed text-muted-foreground">
            Live quotes and tape-style views are not simulated on this page. Use{" "}
            <Link to="/markets" className="text-brand hover:underline">
              Markets
            </Link>{" "}
            for streaming public-market widgets where configured.
          </div>
        }
      />

      <Section>
        <div className="text-center">
          <div className="text-xl font-bold uppercase tracking-widest text-foreground">
            Core Investment Strategies
          </div>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            A complementary set of strategies designed to capture opportunities and manage risk in
            all market environments.
          </p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {STRATEGIES.map((s) => (
            <div key={s.t} className="surface-card flex flex-col p-6">
              <s.icon className="h-7 w-7 text-brand" />
              <div className="mt-3 text-base font-semibold text-foreground">
                {s.n}. {s.t}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{s.d}</p>
              <div className="mt-5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-brand">
                  Key Features
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {s.f.map((x) => (
                    <li key={x} className="flex gap-2">
                      <span className="mt-1 h-1 w-1 rounded-full bg-brand" /> {x}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Strategy-level returns are not published here. Past performance is not indicative of future
          results.
        </p>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card p-8 lg:p-10">
          <div className="text-center">
            <div className="text-xl font-bold uppercase tracking-widest text-foreground">
              Broad Asset Class Coverage
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {ASSET_CLASSES.map((a) => (
              <div
                key={a.t}
                className="rounded-xl border border-border bg-background/40 p-5 text-center"
              >
                <a.icon className="mx-auto h-6 w-6 text-brand" />
                <div className="mt-3 text-sm font-semibold text-foreground">{a.t}</div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{a.d}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_2fr]">
            <div>
              <div className="eyebrow">AI Advantage Across the Strategy Stack</div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Our proprietary AI platform enhances every stage of the investment process, from
                research and signal generation to execution and risk management.
              </p>
              <Link
                to="/technology"
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-brand/40 px-4 py-2 text-sm font-medium text-brand"
              >
                Explore Technology <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {AI_PIPELINE.map((p, i) => (
                <div key={p.t} className="rounded-xl border border-border bg-background/40 p-4">
                  <div className="flex items-center justify-between">
                    <p.icon className="h-5 w-5 text-brand" />
                    <span className="text-[10px] font-mono text-muted-foreground">0{i + 1}</span>
                  </div>
                  <div className="mt-3 text-xs font-bold uppercase tracking-wider text-foreground">
                    {p.t}
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{p.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="surface-card p-6">
            <div className="eyebrow">Our Performance Philosophy</div>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                "Focus on long term, risk adjusted returns",
                "Protect capital in down markets",
                "Leverage technology and human expertise",
                "Stay disciplined. Remove emotion. Follow process.",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="surface-card flex flex-col items-center justify-center p-6 text-center">
            <Target className="h-12 w-12 text-brand" />
            <div className="mt-4 text-sm font-bold uppercase tracking-widest text-brand">
              Risk adjusted Returns Are Our North Star
            </div>
          </div>

          <div className="surface-card p-6">
            <div className="eyebrow">Firm-level metrics</div>
            <p className="mt-4 text-sm text-muted-foreground">
              Aggregate portfolio statistics are not displayed on the public site. Prospective
              institutional clients can request materials through{" "}
              <Link to="/contact" className="text-brand hover:underline">
                Contact
              </Link>
              .
            </p>
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card flex flex-col items-start justify-between gap-5 border-brand/30 bg-brand/5 p-8 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <Mail className="h-9 w-9 text-brand" />
            <div>
              <div className="eyebrow">Partner With Hudson Crest Capital</div>
              <h3 className="mt-2 text-xl font-semibold text-foreground">
                Institutional solutions tailored to your investment objectives.
              </h3>
            </div>
          </div>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-glow"
          >
            Contact Our Team <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Section>
    </SiteLayout>
  );
}
