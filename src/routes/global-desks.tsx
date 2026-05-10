import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Globe,
  Clock,
  Users,
  Activity,
  Sun,
  Moon,
  Sunrise,
  TrendingUp,
  Award,
  Shield,
  Briefcase,
  Database,
  ShieldCheck,
  Route as RouteIcon,
  MessageSquare,
  ArrowRight,
  Layers,
  CheckCircle2,
  Mail,
  Eye,
} from "lucide-react";
import { SiteLayout, SplitHero, Section, StatRow } from "@/components/site/SiteLayout";
import worldMap from "@/assets/world-map-desks.jpg";
import cityNY from "@/assets/city-newyork.jpg";
import cityLDN from "@/assets/city-london.jpg";
import citySG from "@/assets/city-singapore.jpg";

export const Route = createFileRoute("/global-desks")({
  head: () => ({
    meta: [
      { title: "Global Desks — Hudson Crest Capital" },
      {
        name: "description",
        content:
          "Three strategic hubs. One unified platform. A 24-hour follow-the-sun trading operation across New York, London, and Singapore.",
      },
      { property: "og:title", content: "Global Desks — Hudson Crest Capital" },
      {
        property: "og:description",
        content: "Global presence. Local expertise. Unified execution.",
      },
      { property: "og:image", content: worldMap },
    ],
  }),
  component: GlobalDesksPage,
});

const DESKS = [
  {
    img: cityNY,
    city: "NEW YORK",
    role: "Execution Hub",
    tz: "EST | UTC -5",
    desc: "Our New York desk leads equity, options and cross-asset execution for the Americas, leveraging deep liquidity and market microstructure expertise.",
    focus: ["Equities & Options", "Fixed Income", "Derivatives", "Algorithmic Execution"],
    pros: "50+",
    aum: "$6.2B",
    hours: "8:00am – 5:00pm",
  },
  {
    img: cityLDN,
    city: "LONDON",
    role: "Macro & FX Hub",
    tz: "GMT | UTC +0",
    desc: "Our London desk drives global macro, FX and rates strategies with a strong focus on risk management and capital efficiency.",
    focus: ["Global Macro", "FX & Rates", "Commodities", "Risk Management"],
    pros: "40+",
    aum: "$4.1B",
    hours: "7:00am – 4:00pm",
  },
  {
    img: citySG,
    city: "SINGAPORE",
    role: "Asia Markets Hub",
    tz: "SGT | UTC +8",
    desc: "Our Singapore desk covers Asia Pacific markets, sourcing alpha from regional equities, credit and emerging markets.",
    focus: ["Asia Equities", "Credit & EM", "Quant Strategies", "Market Analytics"],
    pros: "60+",
    aum: "$2.4B",
    hours: "9:00am – 6:00pm",
  },
];

const SESSIONS = [
  {
    icon: Sunrise,
    t: "Asia Session",
    who: "Singapore Leads",
    h: "9:00 PM – 5:00 AM EST",
    d: "Our Singapore desk starts the day, identifying opportunities in Asia markets and setting the tone for global markets.",
  },
  {
    icon: Sun,
    t: "Europe Session",
    who: "London Leads",
    h: "3:00 AM – 12:00 PM EST",
    d: "London picks up momentum, executing macro, FX and rates strategies as European markets come online.",
  },
  {
    icon: Moon,
    t: "US Session",
    who: "New York Leads",
    h: "8:00 AM – 5:00 PM EST",
    d: "New York drives liquidity and execution across the Americas, closing the loop and handing off back to Asia.",
  },
];

const ACTIVITY = [
  {
    time: "09:15 AM",
    city: "SINGAPORE",
    text: "Asian equity momentum signal detected in technology sector",
  },
  { time: "02:32 AM", city: "LONDON", text: "Macro model update: EUR/USD volatility spike" },
  { time: "09:47 AM", city: "NEW YORK", text: "Large options flow detected in S&P 500 index" },
];

function GlobalDesksPage() {
  return (
    <SiteLayout>
      <SplitHero
        eyebrow="Global Desks"
        title="Global Presence."
        highlight="Local Expertise."
        description="Our global trading desks operate as one integrated network, combining local market knowledge with centralized intelligence to identify opportunities, manage risk, and generate consistent returns across all market cycles."
        image={worldMap}
        imageAlt="Hudson Crest global trading network"
        side={
          <StatRow
            items={[
              { icon: TrendingUp, value: "$12.74B", label: "Assets Under Management" },
              { icon: Users, value: "60+", label: "Investment Professionals" },
              { icon: Globe, value: "20+", label: "Countries Covered" },
              { icon: Award, value: "10+ Years", label: "Track Record" },
              { icon: Shield, value: "Institutional", label: "Client Focused" },
            ]}
          />
        }
      />

      <Section>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: Globe, v: "3", l: "Global Trading Desks" },
            { icon: Clock, v: "24/5", l: "Market Coverage Follow-the-Sun" },
            { icon: Users, v: "150+", l: "Investment Professionals" },
            { icon: Activity, v: "Real-Time", l: "Global Collaboration & Execution" },
          ].map((m) => (
            <div key={m.l} className="surface-card p-5">
              <m.icon className="h-6 w-6 text-brand" />
              <div className="mt-3 text-2xl font-bold text-foreground">{m.v}</div>
              <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                {m.l}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="eyebrow">Our Global Trading Desks</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Three strategic hubs. One unified platform. Seamless execution across time zones.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {DESKS.map((d) => (
            <div key={d.city} className="surface-card overflow-hidden">
              <div className="relative h-40">
                <img
                  src={d.img}
                  alt={d.city}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <div className="text-lg font-bold tracking-wider text-foreground">{d.city}</div>
                  <div className="text-xs font-medium text-brand">{d.role}</div>
                </div>
              </div>
              <div className="p-6">
                <div className="text-[11px] font-mono text-muted-foreground">{d.tz}</div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{d.desc}</p>
                <div className="mt-5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-brand">
                    Focus Areas
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {d.focus.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="mt-1 h-1 w-1 rounded-full bg-brand" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
                  <div>
                    <div className="font-mono text-base text-brand">{d.pros}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Professionals
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-base text-brand">{d.aum}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      AUM Allocated
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-base text-brand">{d.hours}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Local Market Hours
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card p-8 lg:p-10">
          <div className="eyebrow">Follow-the-Sun Model</div>
          <p className="mt-2 text-sm text-muted-foreground">
            A seamless 24-hour investment cycle that enables continuous market coverage and
            opportunity capture.
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {SESSIONS.map((s) => (
              <div key={s.t} className="rounded-xl border border-border bg-background/40 p-6">
                <s.icon className="h-7 w-7 text-brand" />
                <div className="mt-3 text-sm font-bold uppercase tracking-widest text-foreground">
                  {s.t}
                </div>
                <div className="mt-1 text-sm font-semibold text-brand">{s.who}</div>
                <div className="mt-1 text-xs font-mono text-muted-foreground">{s.h}</div>
                <p className="mt-3 text-xs leading-snug text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-center gap-3 rounded-xl border border-brand/30 bg-brand/5 px-6 py-4 text-sm text-foreground">
            <Clock className="h-5 w-5 text-brand" />
            One global team. One platform. 24 hours a day, aligned in purpose.
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="surface-card p-6">
            <div className="eyebrow">Unified by Technology</div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              All desks operate on our proprietary, AI-powered platform, enabling real-time data
              sharing, risk monitoring and execution across the globe.
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                {
                  icon: Database,
                  t: "Unified Data Layer",
                  d: "Real-time market data and alternative signals accessible to all desks.",
                },
                {
                  icon: ShieldCheck,
                  t: "Centralized Risk Engine",
                  d: "Firm-wide risk monitoring with real-time limits and stress testing.",
                },
                {
                  icon: RouteIcon,
                  t: "Smart Order Routing",
                  d: "AI-driven execution across global venues for best price and minimal market impact.",
                },
                {
                  icon: MessageSquare,
                  t: "Seamless Collaboration",
                  d: "Instant communication and idea sharing across time zones.",
                },
              ].map((u) => (
                <li key={u.t} className="flex gap-3">
                  <u.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{u.t}</div>
                    <p className="text-[11px] leading-snug text-muted-foreground">{u.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface-card p-6">
            <div className="eyebrow">Real-Time Global Collaboration</div>
            <p className="mt-3 text-xs text-muted-foreground">
              Ideas, insights and execution — shared instantly.
            </p>
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <img
                src={worldMap}
                alt="Live activity map"
                className="h-40 w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                  Live Desk Activity
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> LIVE
                </span>
              </div>
              <ul className="mt-3 space-y-3">
                {ACTIVITY.map((a) => (
                  <li key={a.time} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">{a.time}</span>
                      <span className="rounded bg-brand/10 px-1.5 text-[10px] font-bold uppercase text-brand">
                        {a.city}
                      </span>
                    </div>
                    <div className="mt-1 text-muted-foreground">{a.text}</div>
                  </li>
                ))}
              </ul>
              <Link
                to="/contact"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:opacity-80"
              >
                View All Activity <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="surface-card p-6">
            <div className="eyebrow">Global Impact</div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              A truly global perspective drives better outcomes for our clients.
            </p>
            <ul className="mt-5 space-y-4 text-sm">
              {[
                {
                  icon: Layers,
                  l: "Markets Monitored",
                  v: "150+",
                  d: "Across Equities, Fixed Income, FX, Commodities & Derivatives",
                },
                {
                  icon: Activity,
                  l: "Daily Signals Processed",
                  v: "10,000+",
                  d: "Generated by AI & Quant Models",
                },
                {
                  icon: TrendingUp,
                  l: "Trades Executed Daily",
                  v: "5,000+",
                  d: "Across 200+ Venues Globally",
                },
                {
                  icon: Eye,
                  l: "Average Execution Speed",
                  v: "< 2.5ms",
                  d: "For Electronic Strategies",
                },
                {
                  icon: ShieldCheck,
                  l: "Risk Events Monitored",
                  v: "24/7",
                  d: "Across All Portfolios",
                },
              ].map((g) => (
                <li key={g.l} className="flex items-start gap-3">
                  <g.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-foreground">{g.l}</span>
                      <span className="font-mono text-sm text-brand">{g.v}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{g.d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card flex flex-col items-start justify-between gap-5 border-brand/30 bg-brand/5 p-8 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <Globe className="h-9 w-9 text-brand" />
            <div>
              <h3 className="text-xl font-semibold text-foreground">
                Global reach. Local insight. Unified execution.
              </h3>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Discover how our global desks can help you achieve your investment objectives.
              </p>
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
