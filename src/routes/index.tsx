import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Activity, Globe, Shield, Brain, Zap, Cpu, LineChart } from "lucide-react";
import { SiteLayout, Section, FeatureCard } from "@/components/site/SiteLayout";
import heroGlobe from "@/assets/hero-globe.png";
import heroCityscape from "@/assets/hero-cityscape.jpg";
import heroTradingFloor from "@/assets/hero-trading-floor.jpg";
import heroCommodities from "@/assets/hero-commodities-v2.jpg";
import deskNewYork from "@/assets/desk-newyork.jpg";
import deskLondon from "@/assets/desk-london.jpg";
import deskSingapore from "@/assets/desk-singapore.jpg";

type HeroSlide = {
  src: string;
  alt: string;
  /** Globe art has office labels at edges — cover crops them on common laptop widths; contain keeps them visible. */
  objectFit?: "cover" | "contain";
};

const HERO_SLIDES: HeroSlide[] = [
  {
    src: heroCityscape,
    alt: "Global financial city skyline at night with connected trading desks",
  },
  { src: heroGlobe, alt: "Interactive global trading network", objectFit: "contain" },
  { src: heroTradingFloor, alt: "Institutional trading floor with live market data" },
  { src: heroCommodities, alt: "Commodities investment — gold, silver, copper and energy markets" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hudson Crest Capital — Capital, Enhanced by Intelligence" },
      {
        name: "description",
        content:
          "AI-driven institutional trading across global markets. Disciplined execution, engineered intelligence, and consistent risk-adjusted returns.",
      },
      { property: "og:title", content: "Hudson Crest Capital — Capital, Enhanced by Intelligence" },
      {
        property: "og:description",
        content: "AI-driven institutional trading across global markets.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSlide((s) => (s + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <SiteLayout>
      {/* HERO — full viewport */}
      <section className="relative overflow-hidden border-b border-border min-h-[calc(100vh-6rem)] flex items-center">
        <div className="absolute inset-0 bg-background pointer-events-none">
          {/* Carousel background — cross-fade */}
          {HERO_SLIDES.map((s, i) => {
            const fit = s.objectFit === "contain" ? "object-contain" : "object-cover";
            return (
              <img
                key={s.src}
                src={s.src}
                alt={i === slide ? s.alt : ""}
                className={`absolute inset-0 m-auto h-full w-full ${fit} object-center transition-opacity duration-[1500ms] ease-in-out ${
                  i === slide ? "opacity-60" : "opacity-0"
                }`}
                loading={i === 0 ? "eager" : "lazy"}
              />
            );
          })}
          {/* Left edge fade so text stays legible */}
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/60 to-background/10" />
          {/* Top + bottom vignette into background */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* Carousel indicators */}
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              aria-label={`Show slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === slide ? "w-8 bg-brand" : "w-4 bg-foreground/30 hover:bg-foreground/50"
              }`}
            />
          ))}
        </div>

        <div className="relative mx-auto w-full max-w-7xl px-6 py-16 lg:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              MARKET STATUS: <span className="text-success">LIVE</span>
            </div>
            <h1
              className="mt-6 font-bold uppercase leading-[1.05] tracking-tight text-foreground break-words"
              style={{ fontSize: "clamp(2.5rem, 8vw + 0.5rem, 6rem)" }}
            >
              Capital,
              <br />
              Enhanced by <span className="text-gradient-brand">Intelligence.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Hudson Crest Capital integrates artificial intelligence with institutional trading
              strategies across global markets, engineered for disciplined, risk-adjusted
              performance.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/approach"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-5 py-3 text-sm font-semibold text-brand-foreground shadow-glow transition-transform hover:-translate-y-0.5"
              >
                Our Approach <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/markets"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-5 py-3 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:bg-surface-elevated"
              >
                Live Markets
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* KPI BAR */}
      <section className="border-b border-border bg-surface/40">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden md:grid-cols-5">
          {[
            { label: "AUM", value: "$48.2B", sub: "+3.27% YTD" },
            { label: "Daily P&L", value: "$28.63M", sub: "+0.74%" },
            { label: "AI Confidence", value: "Bullish 62%", sub: "24H Outlook" },
            { label: "Portfolio VaR (95%)", value: "$21.42M", sub: "-2.18%" },
            { label: "Risk Status", value: "Low", sub: "Within Limits" },
          ].map((k) => (
            <div key={k.label} className="bg-background px-6 py-6">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {k.label}
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{k.value}</div>
              <div className="mt-1 text-xs text-success">{k.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* AI POWERED */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="eyebrow">AI-Powered. Human-Led.</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Engineered intelligence at every layer of the trade lifecycle.
            </h2>
            <p className="mt-5 text-muted-foreground">
              Our proprietary AI systems analyze billions of data points in real time to identify
              opportunities, manage risk, and enhance execution, empowering our traders to perform
              with precision and conviction.
            </p>
            <Link
              to="/technology"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand hover:opacity-90"
            >
              Explore the Technology <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="lg:col-span-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <FeatureCard
              icon={Brain}
              title="Market Intelligence"
              description="AI scans alternative data, news and market signals in real time."
            />
            <FeatureCard
              icon={Cpu}
              title="Predictive Analytics"
              description="Machine learning forecasts price movements and regime shifts."
            />
            <FeatureCard
              icon={Zap}
              title="Smart Execution"
              description="AI optimizes order routing for best price and minimal market impact."
            />
            <FeatureCard
              icon={Shield}
              title="Risk Management"
              description="Advanced models stress test portfolios across scenarios."
            />
            <FeatureCard
              icon={Activity}
              title="Continuous Learning"
              description="Systems evolve, adapting to changing market dynamics."
            />
            <FeatureCard
              icon={LineChart}
              title="Signal Generation"
              description="High-conviction signals across asset classes and time horizons."
            />
          </div>
        </div>
      </Section>

      {/* GLOBAL DESKS */}
      <Section className="border-t border-border">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              city: "New York",
              role: "Core Execution Hub",
              desc: "Equities, options and cross-asset execution for the Americas.",
              img: deskNewYork,
            },
            {
              city: "London",
              role: "Macro & FX Desk",
              desc: "Global macro, FX and rates with disciplined risk management.",
              img: deskLondon,
            },
            {
              city: "Singapore",
              role: "Asia Liquidity Desk",
              desc: "Asia-Pacific equities, digital assets and emerging markets.",
              img: deskSingapore,
            },
          ].map((d) => (
            <div key={d.city} className="surface-card group relative overflow-hidden">
              <div className="relative h-44 overflow-hidden">
                <img
                  src={d.img}
                  alt={`${d.city} skyline`}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                  width={1024}
                  height={640}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
              </div>
              <div className="p-7">
                <Globe className="h-6 w-6 text-brand" />
                <h3 className="mt-4 text-xl font-semibold text-foreground">{d.city}</h3>
                <div className="text-sm text-brand">{d.role}</div>
                <p className="mt-3 text-sm text-muted-foreground">{d.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <section className="border-t border-border bg-gradient-to-r from-surface to-surface-elevated">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-12 lg:flex-row lg:items-center">
          <div>
            <div className="eyebrow">Partner with Hudson Crest</div>
            <h3 className="mt-2 text-2xl font-semibold text-foreground">
              Institutional solutions tailored to your investment objectives.
            </h3>
          </div>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-glow"
          >
            Contact Our Team <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
