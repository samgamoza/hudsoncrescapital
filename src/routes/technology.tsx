import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Cpu,
  Database,
  Activity,
  Shield,
  Zap,
  Brain,
  Layers,
  AlertTriangle,
  Lightbulb,
  Cloud,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Network,
  GitBranch,
  Eye,
} from "lucide-react";
import { SiteLayout, SplitHero, Section, StatRow } from "@/components/site/SiteLayout";
import techStack from "@/assets/tech-stack.jpg";
import worldMap from "@/assets/world-map-desks.jpg";

export const Route = createFileRoute("/technology")({
  head: () => ({
    meta: [
      { title: "Technology | Hudson Crest Capital" },
      {
        name: "description",
        content:
          "Intelligence at scale. Built for an unfair advantage. Proprietary AI, advanced analytics, and high-performance infrastructure powering institutional alpha.",
      },
      { property: "og:title", content: "Technology | Hudson Crest Capital" },
      {
        property: "og:description",
        content: "Intelligence at scale. Built for an unfair advantage.",
      },
      { property: "og:image", content: techStack },
    ],
  }),
  component: TechnologyPage,
});

const EDGE = [
  {
    icon: Brain,
    t: "Proprietary AI Models",
    d: "Machine learning and deep learning models designed to predict, adapt and evolve with the market.",
  },
  {
    icon: Database,
    t: "Alternative Data",
    d: "We aggregate and analyze unstructured data from thousands of sources in real time.",
  },
  {
    icon: Zap,
    t: "High Performance",
    d: "Ultra low latency infrastructure built for speed, scale and reliability.",
  },
  {
    icon: Shield,
    t: "Risk Intelligence",
    d: "AI powered risk systems identify and mitigate risk before it impacts performance.",
  },
  {
    icon: Lightbulb,
    t: "Continuous Innovation",
    d: "We invest heavily in R&D to stay ahead of the curve and ahead of the market.",
  },
];

const STACK = [
  {
    t: "Data Ingestion",
    d: "Real time and batch data from diverse global sources.",
    icon: Database,
  },
  {
    t: "Data Engineering",
    d: "Cleansing, normalization and feature generation at scale.",
    icon: GitBranch,
  },
  {
    t: "AI & Modeling",
    d: "Research, develop and train proprietary predictive models.",
    icon: Brain,
  },
  {
    t: "Signal Generation",
    d: "Convert insights into actionable trading signals.",
    icon: Activity,
  },
  { t: "Execution", d: "Smart order routing and institutional grade execution.", icon: Zap },
  { t: "Monitoring & Feedback", d: "Real time monitoring and model feedback loop.", icon: Eye },
];

const CAPS = [
  {
    t: "Natural Language Processing",
    d: "Extract insights from news, research, filings and social media in real time.",
    score: "—",
    scoreLabel: "Sentiment Score",
  },
  {
    t: "Anomaly Detection",
    d: "Identify market inefficiencies and unusual patterns before the market reacts.",
    score: "—",
    scoreLabel: "Anomaly Score",
  },
  {
    t: "Predictive Modeling",
    d: "Forecast price movements, volatility and correlations across multiple horizons.",
    score: "—",
    scoreLabel: "Prediction Confidence",
  },
  {
    t: "Reinforcement Learning",
    d: "Continuously optimize trading strategies through self learning systems.",
    score: "—",
    scoreLabel: "Reward (YTD)",
  },
  {
    t: "Causal Inference",
    d: "Understand what drives market outcomes to make better, more robust decisions.",
    score: "—",
    scoreLabel: "Causal Impact",
  },
];

function TechnologyPage() {
  return (
    <SiteLayout>
      <SplitHero
        eyebrow="Our Technology"
        title="Intelligence at Scale."
        highlight="Built for an Unfair Advantage."
        description="Hudson Crest Capital leverages proprietary AI, advanced analytics, and high-performance infrastructure to transform data into actionable insight and consistent alpha."
        image={techStack}
        imageAlt="AI technology stack"
        side={
          <StatRow
            items={[
              { icon: Database, value: "—", label: "Data at institutional scale" },
              { icon: Cloud, value: "—", label: "Model development cadence" },
              { icon: Zap, value: "—", label: "Execution latency (environment-specific)" },
              { icon: CheckCircle2, value: "—", label: "Operational availability" },
            ]}
          />
        }
      />

      <Section>
        <div className="surface-card p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_2fr]">
            <div>
              <div className="eyebrow">Our Technology Edge</div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                A unique combination of data, AI, and engineering drives every investment decision.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {EDGE.map((e) => (
                <div key={e.t}>
                  <e.icon className="h-6 w-6 text-brand" />
                  <div className="mt-3 text-sm font-semibold text-foreground">{e.t}</div>
                  <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{e.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card p-8 lg:p-10">
          <div className="eyebrow">Our Technology Stack</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Enterprise grade infrastructure purpose built for systematic investing.
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="space-y-2">
              {STACK.map((s, i) => (
                <div
                  key={s.t}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${i === 2 ? "border-brand/40 bg-brand/10" : "border-border bg-background/40"}`}
                >
                  <s.icon
                    className={`mt-0.5 h-5 w-5 ${i === 2 ? "text-brand" : "text-muted-foreground"}`}
                  />
                  <div>
                    <div
                      className={`text-sm font-semibold ${i === 2 ? "text-brand" : "text-foreground"}`}
                    >
                      {s.t}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  h: "Data Sources",
                  items: [
                    "Market Data",
                    "News & NLP",
                    "Social & Sentiment",
                    "Macro Economic",
                    "Corporate Filings",
                    "Alternative Data",
                    "Geospatial Data",
                    "Supply Chain",
                    "Web & IoT Data",
                  ],
                },
                {
                  h: "Data Platform",
                  items: [
                    "Ingestion Layer",
                    "Stream Processing",
                    "Data Lake",
                    "Feature Store",
                    "Metadata & Lineage",
                  ],
                },
                {
                  h: "AI & Analytics Engine",
                  items: [
                    "Machine Learning",
                    "Deep Learning / NLP Engine",
                    "Scenario Analysis",
                    "Graph Analytics",
                    "Reinforcement Learning",
                  ],
                },
                {
                  h: "Portfolio & Risk",
                  items: [
                    "Portfolio Construction",
                    "Risk Modeling",
                    "Scenario Analysis",
                    "Stress Testing",
                    "Attribution & Explainability",
                  ],
                },
                {
                  h: "Execution & OMS",
                  items: [
                    "Smart Order Routing",
                    "Algo Execution",
                    "TCA & Analytics",
                    "Compliance Checks",
                    "Post Trade Analysis",
                  ],
                },
                {
                  h: "Markets",
                  items: [
                    "Equities",
                    "Options",
                    "Futures",
                    "FX",
                    "Commodities",
                    "Fixed Income",
                    "Digital Assets",
                  ],
                },
              ].map((col) => (
                <div key={col.h} className="rounded-xl border border-border bg-background/30 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-brand">
                    {col.h}
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {col.items.map((it) => (
                      <li key={it} className="text-xs text-muted-foreground">
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card p-8 lg:p-10">
          <div className="eyebrow">AI Capabilities Powering Alpha</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Our AI systems are designed to learn, adapt and generate edge across market cycles.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {CAPS.map((c) => (
              <div key={c.t} className="rounded-xl border border-border bg-background/40 p-5">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-brand" />
                  <div className="text-sm font-semibold text-foreground">{c.t}</div>
                </div>
                <p className="mt-3 text-xs leading-snug text-muted-foreground">{c.d}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {c.scoreLabel}
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">{c.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card grid gap-8 p-8 lg:grid-cols-[1.4fr_1fr] lg:p-10">
          <div>
            <div className="eyebrow">Security, Scalability & Reliability</div>
            <p className="mt-3 text-sm text-muted-foreground">
              Built with institutional grade security and designed to scale without limits.
            </p>
            <div className="mt-7 grid gap-6 sm:grid-cols-2">
              {[
                {
                  icon: Shield,
                  t: "Bank grade security",
                  d: "Multi layer encryption, zero trust architecture and rigorous access controls.",
                },
                {
                  icon: Cloud,
                  t: "Scalable cloud native",
                  d: "Elastic infrastructure across multi cloud environments for maximum scalability.",
                },
                {
                  icon: RefreshCw,
                  t: "Disaster Recovery",
                  d: "Active-active architecture with real time replication and automated failover.",
                },
                {
                  icon: AlertTriangle,
                  t: "Compliance First",
                  d: "SOC 2 Type II, ISO 27001, GDPR compliant and SEC cybersecurity aligned.",
                },
              ].map((c) => (
                <div key={c.t} className="flex gap-3">
                  <c.icon className="h-5 w-5 shrink-0 text-brand" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{c.t}</div>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{c.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-border">
            <img
              src={worldMap}
              alt="Global infrastructure"
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute bottom-4 right-4 grid grid-cols-2 gap-4 rounded-lg bg-background/70 p-4 text-center backdrop-blur">
              <div>
                <div className="text-2xl font-bold text-foreground">—</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Data Centers Worldwide
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">—</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Regions Covered
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card flex flex-col items-start justify-between gap-5 border-brand/30 bg-brand/5 p-8 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <Network className="h-9 w-9 text-brand" />
            <div>
              <h3 className="text-2xl font-semibold text-foreground">Technology is our edge.</h3>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Intelligence is our advantage. Partner with Hudson Crest Capital.
              </p>
            </div>
          </div>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-glow"
          >
            Schedule a Technology Overview <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Section>
    </SiteLayout>
  );
}
