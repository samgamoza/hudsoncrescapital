import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Brain,
  User,
  Shield,
  ArrowRight,
  TrendingUp,
  Users,
  Globe,
  Award,
  Target,
  LineChart,
  BarChart3,
  Crosshair,
  Repeat,
  ShieldCheck,
  Activity,
  Layers,
  Beaker,
  Building,
} from "lucide-react";
import { SiteLayout, SplitHero, Section, StatRow, CtaBanner } from "@/components/site/SiteLayout";
import heroWave from "@/assets/hero-wave.jpg";

export const Route = createFileRoute("/approach")({
  head: () => ({
    meta: [
      { title: "Our Approach — Hudson Crest Capital" },
      {
        name: "description",
        content:
          "A disciplined fusion of human expertise, quantitative models, and artificial intelligence — engineered for superior outcomes.",
      },
      { property: "og:title", content: "Our Approach — Hudson Crest Capital" },
      { property: "og:description", content: "Intelligence. Discipline. Superior Outcomes." },
      { property: "og:image", content: heroWave },
    ],
  }),
  component: ApproachPage,
});

const STRATEGIES = [
  {
    icon: TrendingUp,
    t: "Macro Strategies",
    d: "Global macroeconomic analysis to identify long-term trends and market dislocations.",
  },
  {
    icon: BarChart3,
    t: "Quantitative Strategies",
    d: "Data-driven models and machine learning to generate alpha across asset classes.",
  },
  {
    icon: Crosshair,
    t: "Event-Driven Strategies",
    d: "Capitalizing on corporate events, mergers, earnings, and other market catalysts.",
  },
  {
    icon: Repeat,
    t: "Relative Value & Arb",
    d: "Exploiting pricing inefficiencies through statistical arbitrage and relative value trades.",
  },
];

const STEPS = [
  {
    t: "Data Ingestion",
    d: "We aggregate and process structured and unstructured data from traditional and alternative sources.",
  },
  {
    t: "AI Analysis",
    d: "Proprietary AI models identify patterns, anomalies, and high-probability trade opportunities.",
  },
  {
    t: "Signal Generation",
    d: "The AI generates actionable signals with confidence scores and scenario outlooks.",
  },
  {
    t: "Human Validation",
    d: "Portfolio managers review signals, apply judgment, and construct optimal portfolios.",
  },
  {
    t: "Execution",
    d: "Trades are executed through smart order routing and AI-driven execution algorithms.",
  },
  {
    t: "Monitoring & Learning",
    d: "Continuous monitoring, performance attribution, and model learning improve outcomes.",
  },
];

const RISK_ITEMS = [
  {
    icon: ShieldCheck,
    t: "Pre-Trade Risk",
    d: "Real-time risk checks, exposure limits, and scenario analysis before execution.",
  },
  {
    icon: BarChart3,
    t: "Portfolio Risk",
    d: "Continuous monitoring of VaR, stress scenarios, and correlation exposures.",
  },
  {
    icon: Globe,
    t: "Firm-Wide Risk",
    d: "Aggregated risk oversight across strategies, desks, and counterparties.",
  },
  {
    icon: Activity,
    t: "Liquidity Management",
    d: "Proprietary liquidity models to ensure we can trade in any market condition.",
  },
  {
    icon: Beaker,
    t: "Stress Testing",
    d: "AI-driven stress tests across historical and hypothetical events.",
  },
  {
    icon: Building,
    t: "Governance",
    d: "Independent risk committee, robust controls, and strong compliance culture.",
  },
];

function ApproachPage() {
  return (
    <SiteLayout>
      <SplitHero
        eyebrow="Our Approach"
        title="Intelligence. Discipline."
        highlight="Superior Outcomes."
        description="At Hudson Crest Capital, we combine the power of artificial intelligence with institutional expertise and rigorous risk management to navigate global markets and generate risk-adjusted returns."
        image={heroWave}
        imageAlt="AI-driven decision intelligence"
        cta={
          <Link
            to="/strategies"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-5 py-3 text-sm font-semibold text-brand-foreground shadow-glow"
          >
            Explore Our Process <ArrowRight className="h-4 w-4" />
          </Link>
        }
        side={
          <StatRow
            items={[
              { icon: TrendingUp, value: "$12.74B", label: "Assets Under Management" },
              { icon: Users, value: "60+", label: "Investment Professionals" },
              { icon: Globe, value: "3", label: "Global Trading Desks" },
              { icon: Award, value: "10+ Years", label: "Track Record" },
              { icon: Target, value: "Institutional", label: "Client Focused" },
            ]}
          />
        }
      />

      <Section>
        <div className="surface-card grid gap-10 p-8 lg:grid-cols-[1.05fr_1fr] lg:p-10">
          <div>
            <div className="eyebrow">Our Investment Philosophy</div>
            <h2 className="mt-4 text-3xl font-bold leading-tight text-foreground">
              The Intersection of Human Judgment and Machine Intelligence
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Markets are constantly evolving. Our approach integrates advanced AI capabilities with
              the experience and judgment of seasoned professionals to identify opportunities,
              manage risk, and deliver consistent, long-term value.
            </p>
            <div className="mt-7 grid gap-5 sm:grid-cols-3">
              {[
                {
                  icon: Brain,
                  t: "AI-Powered Insights",
                  d: "Proprietary models analyze massive datasets in real time to uncover high-probability opportunities.",
                },
                {
                  icon: User,
                  t: "Human Expertise",
                  d: "Experienced investors provide context, conviction, and oversight to refine decisions.",
                },
                {
                  icon: Shield,
                  t: "Risk Discipline",
                  d: "Robust risk management ensures capital preservation and consistent, risk-adjusted performance.",
                },
              ].map((c) => (
                <div key={c.t}>
                  <c.icon className="h-6 w-6 text-brand" />
                  <div className="mt-2 text-sm font-semibold text-foreground">{c.t}</div>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative flex items-center justify-center rounded-2xl border border-border bg-background/40 p-8">
            <div className="absolute inset-0 grid-bg opacity-30 rounded-2xl" />
            <div className="relative grid w-full grid-cols-3 items-center gap-4 text-center">
              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="text-[11px] font-bold uppercase tracking-widest text-brand">
                  Machine Intelligence
                </div>
                <div>Data Processing</div>
                <div>Pattern Recognition</div>
                <div>Predictive Modeling</div>
                <div>Signal Generation</div>
              </div>
              <div className="relative aspect-square">
                <div className="absolute inset-0 rounded-full border-2 border-brand/60" />
                <div className="absolute inset-2 rounded-full border border-brand/30" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-brand">
                    AI + Human
                  </div>
                  <div className="text-sm font-bold text-foreground">Advantage</div>
                </div>
              </div>
              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="text-[11px] font-bold uppercase tracking-widest text-brand">
                  Human Intelligence
                </div>
                <div>Context & Experience</div>
                <div>Critical Thinking</div>
                <div>Scenario Analysis</div>
                <div>Final Decision</div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card p-8 lg:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_2fr]">
            <div>
              <div className="eyebrow">Our Multi-Strategy Framework</div>
              <h2 className="mt-4 text-2xl font-bold text-foreground">
                Diversified Strategies. Aligned Objective.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                We deploy a diversified set of complementary strategies across global markets to
                capture opportunities in different environments while maintaining a strong focus on
                risk management.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STRATEGIES.map((s) => (
                <div key={s.t} className="rounded-xl border border-border bg-background/40 p-5">
                  <s.icon className="h-6 w-6 text-brand" />
                  <div className="mt-3 text-sm font-semibold text-foreground">{s.t}</div>
                  <p className="mt-2 text-xs leading-snug text-muted-foreground">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-6 text-xs">
            <span className="font-bold uppercase tracking-widest text-brand">Global Markets</span>
            {["Equities", "Fixed Income", "FX", "Commodities", "Digital Assets", "Derivatives"].map(
              (m) => (
                <span key={m} className="text-muted-foreground">
                  {m}
                </span>
              ),
            )}
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="eyebrow">Our AI Trading Process</div>
        <h2 className="mt-3 text-3xl font-bold text-foreground">
          A Data-Driven, AI-Enhanced Investment Process
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {STEPS.map((s, i) => (
            <div key={s.t} className="surface-card relative p-5 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 border-brand bg-background text-sm font-bold text-brand">
                {i + 1}
              </div>
              <div className="mt-3 text-sm font-semibold text-foreground">{s.t}</div>
              <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{s.d}</p>
              {i < STEPS.length - 1 && (
                <ArrowRight className="absolute -right-2 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-brand lg:block" />
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_2fr]">
            <div>
              <div className="eyebrow">Our Risk Management Framework</div>
              <h2 className="mt-4 text-2xl font-bold text-foreground">
                Protecting Capital. Enabling Growth.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Risk management is embedded in everything we do. Our multi-layered framework ensures
                we manage risk proactively across portfolio, strategy, and firm levels.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {RISK_ITEMS.map((r) => (
                <div key={r.t} className="flex gap-3">
                  <r.icon className="h-5 w-5 shrink-0 text-brand" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{r.t}</div>
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">{r.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <CtaBanner
        icon={Layers}
        title="Our approach is simple: combine AI with the discipline of institutional investing."
        description="Deliver consistent, risk-adjusted returns for our clients."
        actionLabel="Partner With Us →"
        to="/contact"
      />
    </SiteLayout>
  );
}
