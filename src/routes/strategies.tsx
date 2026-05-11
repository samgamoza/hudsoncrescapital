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

const PULSE = [
  { t: "S&P 500", v: "5,325.18", c: "+0.62%", up: true },
  { t: "NASDAQ 100", v: "18,921.73", c: "+0.81%", up: true },
  { t: "DOW JONES", v: "39,872.99", c: "+0.45%", up: true },
  { t: "EUR / USD", v: "1.0887", c: "-0.12%", up: false },
  { t: "BTC / USD", v: "67,143.25", c: "+1.35%", up: true },
  { t: "VIX", v: "14.28", c: "-2.11%", up: false },
];

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
    perf: { ytd: "6.21%", y1: "11.34%", si: "8.72%" },
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
    perf: { ytd: "8.93%", y1: "16.87%", si: "12.65%" },
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
    perf: { ytd: "5.47%", y1: "9.12%", si: "7.10%" },
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
    perf: { ytd: "4.68%", y1: "7.89%", si: "6.23%" },
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

function MiniSpark({ up }: { up: boolean }) {
  const stroke = up ? "oklch(0.72 0.18 150)" : "oklch(0.65 0.22 25)";
  const path = up
    ? "M0,18 L8,15 L16,17 L24,12 L32,13 L40,8 L48,10 L56,4"
    : "M0,4 L8,7 L16,5 L24,10 L32,9 L40,14 L48,12 L56,18";
  return (
    <svg viewBox="0 0 56 22" className="h-5 w-14">
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}

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
          <div className="surface-card p-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="text-xs font-bold uppercase tracking-widest text-foreground">
                Market Pulse
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> LIVE
              </span>
            </div>
            <ul className="mt-3 space-y-2.5 text-sm">
              {PULSE.map((p) => (
                <li key={p.t} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3">
                  <span className="text-xs font-semibold text-foreground">{p.t}</span>
                  <span className="font-mono text-xs text-muted-foreground">{p.v}</span>
                  <span className={`font-mono text-xs ${p.up ? "text-success" : "text-danger"}`}>
                    {p.c}
                  </span>
                  <MiniSpark up={p.up} />
                </li>
              ))}
            </ul>
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
              <div className="mt-5 border-t border-border pt-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-brand">
                  Strategy Performance (Net)
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["YTD", s.perf.ytd],
                    ["1Y", s.perf.y1],
                    ["SI (Ann.)", s.perf.si],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {k}
                      </div>
                      <div className="text-sm font-mono text-success">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Performance illustrative. Net of fees. Past performance is not indicative of future
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
            <div className="eyebrow">Portfolio Snapshot (Firm Level)</div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              {[
                ["YTD Return (Net)", "7.28%", "success"],
                ["1Y Return (Net)", "13.92%", "success"],
                ["Sharpe Ratio (1Y)", "1.81", "fg"],
                ["Max Drawdown (1Y)", "-6.21%", "danger"],
                ["Volatility (1Y)", "8.76%", "fg"],
                ["Win Rate", "62.3%", "success"],
                ["Calmar Ratio (1Y)", "2.24", "fg"],
                ["Sortino Ratio (1Y)", "2.95", "success"],
              ].map(([l, v, tone]) => (
                <div key={l}>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {l}
                  </div>
                  <div
                    className={`mt-1 font-mono text-base ${tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-foreground"}`}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
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
