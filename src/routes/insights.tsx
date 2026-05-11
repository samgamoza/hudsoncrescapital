import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Newspaper,
  Brain,
  Globe,
  Download,
  TrendingUp,
  BarChart3,
  Activity,
  Coins,
  Calendar,
  Mail,
} from "lucide-react";
import { SiteLayout, Section } from "@/components/site/SiteLayout";
import neural from "@/assets/neural-network.jpg";
import cityNY from "@/assets/city-newyork.jpg";
import cityLDN from "@/assets/city-london.jpg";
import citySG from "@/assets/city-singapore.jpg";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights | Hudson Crest Capital" },
      {
        name: "description",
        content:
          "Intelligence. Informed decisions. Better outcomes. Global macro perspective, AI analytics, and on-the-ground market expertise.",
      },
      { property: "og:title", content: "Insights | Hudson Crest Capital" },
      { property: "og:description", content: "Intelligence. Informed decisions. Better outcomes." },
      { property: "og:image", content: neural },
    ],
  }),
  component: InsightsPage,
});

const CATEGORIES = [
  "All Insights",
  "Macro Outlook",
  "AI Intelligence",
  "Equity Markets",
  "Fixed Income",
  "FX & Commodities",
  "Crypto",
  "Event-Driven",
];

const INSIGHTS = [
  {
    tag: "Macro Outlook",
    img: neural,
    t: "Inflation Revisited: Divergence Across Developed Markets",
    d: "Disinflation is not uniform. We explore why the inflation path is diverging between the U.S., Europe, and Asia, and what it means for portfolios.",
    date: "May 13, 2024",
    read: "6 min",
  },
  {
    tag: "AI Intelligence",
    img: neural,
    t: "AI Signal Update: Momentum Recovery in Global Equities",
    d: "Our proprietary AI models detect a regime shift in momentum patterns across global equity markets.",
    date: "May 10, 2024",
    read: "5 min",
  },
  {
    tag: "Equity Markets",
    img: cityNY,
    t: "Earnings Season Takeaways: Quality Beats Growth",
    d: "A deep dive into Q1 earnings and where we see resilient business models outperforming high-growth narratives.",
    date: "May 8, 2024",
    read: "7 min",
  },
  {
    tag: "FX & Commodities",
    img: cityLDN,
    t: "Commodity Cycle in Focus: What Comes Next?",
    d: "We analyze supply dynamics, China demand, and geopolitics to map the next phase of the commodity cycle.",
    date: "May 6, 2024",
    read: "6 min",
  },
];

const FEED = [
  {
    time: "09:42 AM",
    tag: "MACRO",
    icon: Globe,
    text: "AI model detects rising inflation risk in Eurozone over next 3 months. Confidence: 78%",
  },
  {
    time: "09:31 AM",
    tag: "EQUITIES",
    icon: BarChart3,
    text: "Momentum shift detected in U.S. mid-cap technology sector. Confidence: 82%",
  },
  {
    time: "09:18 AM",
    tag: "FX",
    icon: Activity,
    text: "USD weakening trend likely to continue against JPY based on yield differentials. Confidence: 75%",
  },
  {
    time: "09:05 AM",
    tag: "COMMODITIES",
    icon: Coins,
    text: "Crude oil inventory drawdown accelerating. Bullish signal strength increasing. Confidence: 81%",
  },
  {
    time: "08:51 AM",
    tag: "EVENT-DRIVEN",
    icon: Calendar,
    text: "Merger arbitrage opportunity identified in healthcare sector. Risk adjusted return attractive.",
  },
];

const PUBS = [
  {
    t: "Monthly Market Outlook, May 2024",
    d: "Our comprehensive take on global markets, key themes, and portfolio positioning.",
    img: neural,
  },
  {
    t: "AI in Asset Management: From Hype to Edge",
    d: "A deep dive into how artificial intelligence creates sustainable advantages in investing.",
    img: neural,
  },
  {
    t: "Quarterly Investment Review, Q1 2024",
    d: "Performance review, key trades, and lessons learned from the quarter.",
    img: cityNY,
  },
];

const PERSPECTIVES = [
  {
    city: "NEW YORK",
    role: "Execution Hub",
    img: cityNY,
    d: "U.S. growth remains resilient, but breadth is narrowing. We focus on quality, balance sheet strength, and secular themes.",
  },
  {
    city: "LONDON",
    role: "Macro & FX Hub",
    img: cityLDN,
    d: "European growth is improving, but ECB policy remains data-dependent. FX volatility presents selective opportunities.",
  },
  {
    city: "SINGAPORE",
    role: "Asia Markets Hub",
    img: citySG,
    d: "Asia ex-Japan is seeing earnings upgrades. China policy support and AI adoption are key upside drivers.",
  },
];

function InsightsPage() {
  return (
    <SiteLayout>
      {/* Hero with featured insight */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_1.2fr] lg:py-20">
          <div>
            <div className="eyebrow">Insights</div>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-foreground sm:text-5xl">
              Intelligence.
              <br />
              Informed Decisions.
              <br />
              <span className="text-gradient-brand">Better Outcomes.</span>
            </h1>
            <p className="mt-6 max-w-md text-sm text-muted-foreground sm:text-base">
              Our insights combine global macro perspective, proprietary AI analytics, and
              on-the-ground market expertise to help investors navigate complexity and uncover
              opportunity.
            </p>
            <Link
              to="/contact"
              className="mt-7 inline-flex items-center gap-2 rounded-lg border border-brand/40 px-5 py-2.5 text-sm font-medium text-brand hover:bg-brand/10"
            >
              Subscribe to Insights <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="surface-card overflow-hidden">
            <img
              src={neural}
              alt="AI & Liquidity"
              className="h-48 w-full object-cover"
              loading="lazy"
            />
            <div className="p-6">
              <div className="eyebrow">Featured Insight</div>
              <h2 className="mt-3 text-2xl font-bold leading-snug text-foreground">
                AI & Liquidity: The New Market Regime
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                How AI driven market structure analysis is reshaping liquidity dynamics and creating
                opportunities across asset classes.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Dr. Michael Zhang</span>
                <span>Chief Investment Officer</span>
                <span>·</span>
                <span>May 15, 2024</span>
                <span>·</span>
                <span>8 min read</span>
                <span>·</span>
                <span className="rounded bg-brand/10 px-2 py-0.5 text-brand">Macro Outlook</span>
              </div>
              <Link
                to="/contact"
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand hover:opacity-80"
              >
                Read More <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Section>
        <div className="flex items-center justify-between">
          <div className="eyebrow">Latest Insights</div>
          <Link
            to="/contact"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:opacity-80"
          >
            View All Insights <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {CATEGORIES.map((c, i) => (
            <button
              key={c}
              className={`rounded-full px-4 py-1.5 text-xs font-medium ${i === 0 ? "border border-brand/40 bg-brand/15 text-brand" : "border border-border text-muted-foreground hover:text-foreground"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {INSIGHTS.map((i) => (
            <article
              key={i.t}
              className="surface-card flex flex-col overflow-hidden transition-all hover:border-brand/40"
            >
              <div className="relative h-36">
                <img src={i.img} alt={i.t} className="h-full w-full object-cover" loading="lazy" />
                <span className="absolute left-3 top-3 rounded-md bg-background/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-brand backdrop-blur">
                  {i.tag}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-base font-semibold leading-snug text-foreground">{i.t}</h3>
                <p className="mt-2 flex-1 text-xs text-muted-foreground">{i.d}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>
                    {i.date} · {i.read}
                  </span>
                  <ArrowRight className="h-4 w-4 text-brand" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="surface-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-brand" />
                <h3 className="text-base font-bold uppercase tracking-widest text-foreground">
                  AI Intelligence Feed
                </h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> LIVE
              </span>
            </div>
            <ul className="mt-5 space-y-4">
              {FEED.map((f) => (
                <li
                  key={f.text}
                  className="grid grid-cols-[auto_auto_1fr_auto] items-start gap-3 border-b border-border/40 pb-4 text-xs last:border-0"
                >
                  <f.icon className="h-5 w-5 text-brand" />
                  <div>
                    <div className="font-mono text-[10px] text-muted-foreground">{f.time}</div>
                    <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand">
                      {f.tag}
                    </span>
                  </div>
                  <span className="text-muted-foreground">{f.text}</span>
                  <Link
                    to="/contact"
                    className="text-[10px] font-medium text-brand whitespace-nowrap hover:opacity-80"
                  >
                    View Analysis →
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              to="/contact"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand/40 px-4 py-2.5 text-xs font-medium text-brand hover:bg-brand/10"
            >
              View All Intelligence <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="surface-card p-6">
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-brand" />
              <h3 className="text-base font-bold uppercase tracking-widest text-foreground">
                Research & Publications
              </h3>
            </div>
            <ul className="mt-5 space-y-4">
              {PUBS.map((p) => (
                <li
                  key={p.t}
                  className="grid grid-cols-[1fr_auto] gap-4 rounded-xl border border-border bg-background/40 p-4"
                >
                  <div>
                    <div className="text-sm font-semibold text-foreground">{p.t}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{p.d}</p>
                    <Link
                      to="/contact"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-brand/40 px-3 py-1.5 text-[11px] font-medium text-brand hover:bg-brand/10"
                    >
                      <Download className="h-3 w-3" /> Download PDF
                    </Link>
                  </div>
                  <img
                    src={p.img}
                    alt={p.t}
                    className="h-16 w-20 rounded-md object-cover"
                    loading="lazy"
                  />
                </li>
              ))}
            </ul>
            <Link
              to="/contact"
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:opacity-80"
            >
              View All Reports & Publications <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="eyebrow">Perspectives From Our Global Desks</div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {PERSPECTIVES.map((p) => (
            <div key={p.city} className="surface-card overflow-hidden">
              <div className="grid grid-cols-[120px_1fr]">
                <img
                  src={p.img}
                  alt={p.city}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="p-5">
                  <div className="text-sm font-bold tracking-wider text-foreground">{p.city}</div>
                  <div className="text-xs font-medium text-brand">{p.role}</div>
                  <p className="mt-3 text-xs leading-snug text-muted-foreground">{p.d}</p>
                  <Link
                    to="/global-desks"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:opacity-80"
                  >
                    Read Perspective <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card flex flex-col items-start justify-between gap-5 border-brand/30 bg-brand/5 p-8 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <Mail className="h-9 w-9 text-brand" />
            <div>
              <h3 className="text-xl font-semibold text-foreground">Stay ahead of the curve.</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Get our latest insights delivered to your inbox.
              </p>
            </div>
          </div>
          <form
            className="flex w-full gap-2 md:w-auto"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.assign("/contact");
            }}
          >
            <input
              type="email"
              placeholder="Enter your email address"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none md:w-72"
            />
            <button
              type="submit"
              className="rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-glow"
            >
              Subscribe
            </button>
          </form>
        </div>
      </Section>
    </SiteLayout>
  );
}
