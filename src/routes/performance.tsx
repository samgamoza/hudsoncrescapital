import { createFileRoute, Link } from "@tanstack/react-router";
import {
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Award,
  Activity,
  Lightbulb,
  Search,
  PieChart,
  Target,
  ShieldCheck,
  Mail,
  Download,
  BarChart3,
} from "lucide-react";
import { SiteLayout, SplitHero, Section } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Performance | Hudson Crest Capital" },
      {
        name: "description",
        content:
          "Consistent returns. Disciplined risk. Built for the long term. Hudson Crest Capital's data-driven, AI enhanced approach across market cycles.",
      },
      { property: "og:title", content: "Performance | Hudson Crest Capital" },
      {
        property: "og:description",
        content: "Consistent returns. Disciplined risk. Built for the long term.",
      },
    ],
  }),
  component: PerformancePage,
});

const HEADLINE = [
  { l: "Net Return (Since Inception)", v: "12.74%", s: "Annualized", tone: "brand" },
  { l: "Sharpe Ratio", v: "1.81", s: "Since Inception", tone: "brand" },
  { l: "Sortino Ratio", v: "2.95", s: "Since Inception", tone: "brand" },
  { l: "Max Drawdown", v: "-6.21%", s: "Since Inception", tone: "danger" },
  { l: "Volatility (Annualized)", v: "8.76%", s: "", tone: "brand" },
  { l: "Win Rate", v: "62.3%", s: "", tone: "brand" },
  { l: "Calmar Ratio", v: "2.24", s: "", tone: "brand" },
  { l: "Best Month", v: "5.83%", s: "Nov 2023", tone: "success" },
  { l: "Months Positive", v: "74%", s: "", tone: "brand" },
  { l: "Months Negative", v: "26%", s: "", tone: "brand" },
  { l: "Positive Months (Avg)", v: "1.72%", s: "", tone: "brand" },
  { l: "Negative Months (Avg)", v: "-1.24%", s: "", tone: "danger" },
];

const ANNUAL = [
  ["2024 YTD", "6.21%", "3.18%", "+3.03%"],
  ["2023", "11.34%", "6.28%", "+5.06%"],
  ["2022", "-2.41%", "-7.74%", "+5.33%"],
  ["2021", "13.87%", "4.90%", "+8.97%"],
  ["2020", "9.52%", "2.63%", "+6.89%"],
  ["2019", "10.81%", "6.06%", "+4.75%"],
  ["2018", "-1.13%", "-3.04%", "+1.91%"],
  ["2017", "8.67%", "5.07%", "+3.60%"],
  ["2016", "5.28%", "1.95%", "+3.33%"],
];

const RISK = [
  ["Standard Deviation (Ann.)", "8.76%"],
  ["Downside Deviation (Ann.)", "5.02%"],
  ["Max Drawdown", "-6.21%"],
  ["VaR (95%, 1-Day)", "-1.42%"],
  ["CVaR (95%, 1-Day)", "-2.35%"],
  ["Beta to S&P 500", "0.37"],
  ["Correlation to S&P 500", "0.28"],
  ["Correlation to Bloomberg Agg", "0.06"],
  ["Information Ratio", "1.32"],
  ["Treynor Ratio", "0.98"],
];

const HEATMAP = [
  ["2024", 1.24, 0.95, 1.32, -0.21, 1.62, 1.06, null, null, null, null, null, null, 6.21],
  ["2023", 2.18, 1.24, -1.03, 0.92, 1.74, 2.21, 1.08, -0.36, 1.33, -0.35, 1.86, 2.92, 11.34],
  ["2022", -1.89, -0.76, 0.82, -1.35, 0.63, -2.1, 1.32, -0.34, -1.52, 1.15, -0.58, 0.21, -2.41],
  ["2021", -0.21, 1.52, 2.01, 1.16, 1.02, 1.91, -0.05, 0.83, 1.74, 2.25, 1.01, 1.37, 13.87],
  ["2020", -0.19, -1.03, -8.61, 3.21, 1.48, 1.02, 0.56, -0.81, -0.23, 5.83, 3.07, 4.13, 9.52],
  ["2019", 2.14, 1.61, 0.31, 1.26, 1.19, 2.03, -1.02, 1.44, 0.87, 0.62, 0.82, 0.1, 10.81],
  ["2018", 0.73, -1.35, -0.68, 1.21, 0.32, -0.07, 1.02, -0.69, -0.46, -0.42, -0.04, -1.45, -1.13],
  ["2017", 1.01, 0.83, -0.12, 1.46, 0.72, 1.08, 0.53, 0.21, 0.62, 1.34, -0.41, 1.38, 8.67],
];

const MONTH_LABELS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
  "YEAR",
];

function heatColor(v: number | null): string {
  if (v === null) return "bg-surface-elevated/40 text-muted-foreground";
  if (v > 1.5) return "bg-success/30 text-success";
  if (v > 0.5) return "bg-success/20 text-success";
  if (v > 0) return "bg-success/10 text-foreground";
  if (v > -0.5) return "bg-danger/10 text-foreground";
  if (v > -1.5) return "bg-danger/20 text-danger";
  return "bg-danger/30 text-danger";
}

function PerformancePage() {
  return (
    <SiteLayout>
      <SplitHero
        eyebrow="Performance"
        title="Consistent Returns. Disciplined Risk."
        highlight="Built for the Long Term."
        description="Our data-driven, AI enhanced approach is designed to deliver consistent, risk adjusted returns across market cycles. We focus on what we can control: our process, our risk, and our discipline."
        side={
          <div className="surface-card p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {HEADLINE.slice(0, 8).map((m) => (
                <div key={m.l}>
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                    {m.l}
                  </div>
                  <div
                    className={`mt-1 text-lg font-semibold ${m.tone === "danger" ? "text-danger" : m.tone === "success" ? "text-success" : "text-gradient-brand"}`}
                  >
                    {m.v}
                  </div>
                  {m.s && <div className="text-[9px] text-muted-foreground">{m.s}</div>}
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
              {HEADLINE.slice(8).map((m) => (
                <div key={m.l}>
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                    {m.l}
                  </div>
                  <div
                    className={`mt-1 text-lg font-semibold ${m.tone === "danger" ? "text-danger" : "text-gradient-brand"}`}
                  >
                    {m.v}
                  </div>
                </div>
              ))}
            </div>
          </div>
        }
      />

      <Section>
        <div className="surface-card p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div>
              <div className="flex items-center justify-between">
                <div className="eyebrow">Performance Overview</div>
                <div className="flex gap-1 rounded-lg border border-border p-1">
                  {["Since Inception", "5Y", "3Y", "1Y", "YTD"].map((p, i) => (
                    <button
                      key={p}
                      className={`rounded-md px-3 py-1 text-xs ${i === 0 ? "bg-brand/15 text-brand border border-brand/30" : "text-muted-foreground"}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full bg-brand" />
                    <span className="text-muted-foreground">Hudson Crest Composite (Net)</span>
                  </div>
                  <div className="mt-1 text-2xl font-bold text-foreground">153.62%</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                    <span className="text-muted-foreground">Benchmark (HFRI FWC)</span>
                  </div>
                  <div className="mt-1 text-2xl font-bold text-muted-foreground">58.91%</div>
                </div>
              </div>

              <div className="mt-6 h-64 rounded-lg border border-border bg-background/40 p-4">
                <svg viewBox="0 0 600 220" className="h-full w-full">
                  <defs>
                    <linearGradient id="brandGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.65 0.22 255)" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="oklch(0.65 0.22 255)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[40, 80, 120, 160, 200].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      x2="600"
                      y1={y}
                      y2={y}
                      stroke="oklch(0.30 0.025 260 / 0.4)"
                      strokeDasharray="2 4"
                    />
                  ))}
                  <path
                    d="M0,200 L40,195 L80,180 L120,170 L160,155 L200,145 L240,120 L280,135 L320,100 L360,80 L400,90 L440,60 L480,70 L520,40 L560,50 L600,30 L600,220 L0,220 Z"
                    fill="url(#brandGrad)"
                  />
                  <path
                    d="M0,200 L40,195 L80,180 L120,170 L160,155 L200,145 L240,120 L280,135 L320,100 L360,80 L400,90 L440,60 L480,70 L520,40 L560,50 L600,30"
                    fill="none"
                    stroke="oklch(0.65 0.22 255)"
                    strokeWidth="2"
                  />
                  <path
                    d="M0,210 L40,208 L80,205 L120,200 L160,202 L200,195 L240,190 L280,185 L320,180 L360,175 L400,170 L440,168 L480,160 L520,158 L560,155 L600,150"
                    fill="none"
                    stroke="oklch(0.68 0.02 250)"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                </svg>
                <div className="-mt-2 flex justify-between text-[10px] font-mono text-muted-foreground">
                  {["2016", "2018", "2020", "2022", "2024"].map((y) => (
                    <span key={y}>{y}</span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="eyebrow">Key Highlights</div>
              <ul className="mt-5 space-y-4 text-sm">
                {[
                  { icon: TrendingUp, t: "Outperformed benchmark in 8 of the last 9 years" },
                  { icon: ShieldCheck, t: "Lower risk with higher risk adjusted returns" },
                  { icon: Activity, t: "Positive returns in 74% of all months" },
                  { icon: BarChart3, t: "Consistent execution across market cycles" },
                ].map((h) => (
                  <li key={h.t} className="flex items-start gap-3">
                    <h.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                    <span className="text-foreground">{h.t}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7 rounded-xl border border-brand/30 bg-brand/5 p-4 text-xs">
                <div className="text-2xl font-bold text-gradient-brand">12.74%</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Annualized Return
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="surface-card p-6 lg:col-span-1">
            <div className="eyebrow">Annual Performance (%)</div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="py-2">Year</th>
                    <th className="py-2">Hudson Crest</th>
                    <th className="py-2">Bench</th>
                    <th className="py-2">Outperf.</th>
                  </tr>
                </thead>
                <tbody>
                  {ANNUAL.map((row) => (
                    <tr key={row[0]} className="border-b border-border/40">
                      <td className="py-2 font-medium text-foreground">{row[0]}</td>
                      <td
                        className={`py-2 font-mono ${row[1].startsWith("-") ? "text-danger" : "text-success"}`}
                      >
                        {row[1]}
                      </td>
                      <td
                        className={`py-2 font-mono ${row[2].startsWith("-") ? "text-danger" : "text-muted-foreground"}`}
                      >
                        {row[2]}
                      </td>
                      <td className="py-2 font-mono text-success">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[10px] text-muted-foreground">
              Composite inception: January 1, 2016. Past performance is not indicative of future
              results.
            </p>
          </div>

          <div className="surface-card p-6">
            <div className="eyebrow">Strategy Contribution</div>
            <p className="mt-1 text-[11px] text-muted-foreground">Contribution to Return (YTD)</p>
            <div className="mt-6 flex items-center justify-center">
              <div className="relative h-40 w-40">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="transparent"
                    stroke="oklch(0.30 0.025 260 / 0.4)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="transparent"
                    stroke="oklch(0.65 0.22 255)"
                    strokeWidth="3"
                    strokeDasharray="35 100"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="transparent"
                    stroke="oklch(0.72 0.18 150)"
                    strokeWidth="3"
                    strokeDasharray="32 100"
                    strokeDashoffset="-35"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="transparent"
                    stroke="oklch(0.70 0.18 220)"
                    strokeWidth="3"
                    strokeDasharray="21 100"
                    strokeDashoffset="-67"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="transparent"
                    stroke="oklch(0.78 0.18 250)"
                    strokeWidth="3"
                    strokeDasharray="12 100"
                    strokeDashoffset="-88"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-xl font-bold text-foreground">6.21%</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Total Return
                  </div>
                </div>
              </div>
            </div>
            <ul className="mt-5 space-y-2 text-xs">
              {[
                ["Macro Strategies", "2.15%", "oklch(0.65 0.22 255)"],
                ["AI Quantitative Strategies", "2.01%", "oklch(0.72 0.18 150)"],
                ["Event-Driven Strategies", "1.28%", "oklch(0.70 0.18 220)"],
                ["Relative Value & Arbitrage", "0.77%", "oklch(0.78 0.18 250)"],
              ].map(([l, v, c]) => (
                <li key={l} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} /> {l}
                  </span>
                  <span className="font-mono text-foreground">{v}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface-card p-6">
            <div className="eyebrow">Risk Metrics (Since Inception)</div>
            <ul className="mt-4 space-y-2 text-xs">
              {RISK.map(([l, v]) => (
                <li
                  key={l}
                  className="flex items-center justify-between border-b border-border/40 pb-2"
                >
                  <span className="text-muted-foreground">{l}</span>
                  <span
                    className={`font-mono ${v.startsWith("-") ? "text-danger" : "text-foreground"}`}
                  >
                    {v}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card p-6 lg:p-8">
          <div className="eyebrow">Monthly Returns Heatmap (%)</div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="py-2 pr-2"></th>
                  {MONTH_LABELS.map((m) => (
                    <th key={m} className="py-2 px-1 text-center">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HEATMAP.map((row) => {
                  const year = row[0] as string;
                  const months = row.slice(1, 13) as (number | null)[];
                  const total = row[13] as number;
                  return (
                    <tr key={year}>
                      <td className="py-1 pr-2 text-xs font-semibold text-foreground">{year}</td>
                      {months.map((v, i) => (
                        <td key={i} className="py-1 px-1">
                          <div className={`rounded text-center font-mono py-1.5 ${heatColor(v)}`}>
                            {v === null ? "—" : v.toFixed(2)}
                          </div>
                        </td>
                      ))}
                      <td className="py-1 px-1">
                        <div
                          className={`rounded bg-brand/15 py-1.5 text-center font-mono font-semibold text-brand`}
                        >
                          {total.toFixed(2)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>Negative</span>
            <div className="h-2 flex-1 max-w-xs rounded-full bg-gradient-to-r from-danger via-foreground/20 to-success" />
            <span>Positive</span>
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="surface-card p-6">
            <div className="eyebrow">Our Performance Philosophy</div>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                "Focus on risk adjusted returns, not just returns",
                "Diversify across uncorrelated strategies",
                "Leverage AI and data to find durable edges",
                "Maintain disciplined risk management",
                "Stay patient and let compounding work",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="surface-card p-6">
            <div className="eyebrow">Our Disciplined Process</div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: Lightbulb, t: "Idea Generation" },
                { icon: Search, t: "Research & Validation" },
                { icon: PieChart, t: "Portfolio Construction" },
                { icon: Target, t: "Execution" },
                { icon: ShieldCheck, t: "Risk Management" },
                { icon: Activity, t: "Monitoring" },
              ].map((s) => (
                <div key={s.t} className="rounded-lg border border-border bg-background/40 p-3">
                  <s.icon className="mx-auto h-5 w-5 text-brand" />
                  <div className="mt-2 text-[10px] font-semibold text-foreground">{s.t}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-6">
            <div className="eyebrow">Performance Reports</div>
            <ul className="mt-4 space-y-3">
              {[
                ["Monthly Performance Report", "May 2024"],
                ["Quarterly Investor Letter", "Q1 2024"],
                ["Annual Performance Review", "2023"],
              ].map(([t, d]) => (
                <li
                  key={t}
                  className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3"
                >
                  <div>
                    <div className="text-xs font-semibold text-foreground">{t}</div>
                    <div className="text-[10px] text-muted-foreground">{d}</div>
                  </div>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:opacity-80"
                  >
                    Download <Download className="h-3 w-3" />
                  </Link>
                </li>
              ))}
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
                We are committed to transparency and accountability.
              </h3>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Contact our Investor Relations team to learn more.
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
