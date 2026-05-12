import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Newspaper,
  Brain,
  Globe,
  Download,
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

const INSIGHTS: {
  tag: string;
  img: string;
  t: string;
  d: string;
  date: string;
  read: string;
}[] = [];

const FEED: { time: string; tag: string; icon: typeof Globe; text: string }[] = [];

const PUBS: { t: string; d: string; img: string }[] = [];

const PERSPECTIVES = [
  {
    city: "NEW YORK",
    role: "Execution Hub",
    img: cityNY,
    d: "Americas-focused execution and cross-asset coverage. Commentary is shared with clients directly.",
  },
  {
    city: "LONDON",
    role: "Macro & FX Hub",
    img: cityLDN,
    d: "Macro, FX, and rates coverage for European and overlapping sessions. Views are not published as a live feed here.",
  },
  {
    city: "SINGAPORE",
    role: "Asia Markets Hub",
    img: citySG,
    d: "Asia-Pacific coverage and regional liquidity. Reach out for current desk notes relevant to you.",
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
              alt=""
              className="h-48 w-full object-cover"
              loading="lazy"
            />
            <div className="p-6">
              <div className="eyebrow">Featured Insight</div>
              <p className="mt-3 text-sm text-muted-foreground">
                Long-form research and letters will appear here when published. Subscribe via{" "}
                <Link to="/contact" className="text-brand hover:underline">
                  Contact
                </Link>{" "}
                to hear when new pieces are released.
              </p>
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
          {INSIGHTS.length === 0 ? (
            <p className="text-sm text-muted-foreground sm:col-span-2 xl:col-span-4">
              No published articles yet.
            </p>
          ) : (
            INSIGHTS.map((i) => (
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
            ))
          )}
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
              {FEED.length === 0 ? (
                <li className="text-xs text-muted-foreground">
                  Intelligence feed items are not published on the public site.
                </li>
              ) : (
                FEED.map((f) => (
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
                ))
              )}
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
              {PUBS.length === 0 ? (
                <li className="text-xs text-muted-foreground">No publications listed yet.</li>
              ) : (
                PUBS.map((p) => (
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
                ))
              )}
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
