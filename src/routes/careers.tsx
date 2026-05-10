import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Brain,
  Globe,
  TrendingUp,
  Users,
  Lightbulb,
  Code2,
  Shield,
  Heart,
  GraduationCap,
  Award,
  Briefcase,
  ArrowRight,
  Play,
  Crown,
  Compass,
  Handshake,
  CheckCircle2,
  Rocket,
} from "lucide-react";
import { SiteLayout, Section } from "@/components/site/SiteLayout";
import tradingFloor from "@/assets/trading-floor.jpg";
import officeView from "@/assets/office-view.jpg";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers — Hudson Crest Capital" },
      {
        name: "description",
        content:
          "Build the future of global markets, together. Join a team at the intersection of finance, technology, and AI.",
      },
      { property: "og:title", content: "Careers — Hudson Crest Capital" },
      { property: "og:description", content: "Build the future of global markets. Together." },
      { property: "og:image", content: tradingFloor },
    ],
  }),
  component: CareersPage,
});

const VALUES_TOP = [
  {
    icon: Brain,
    t: "AI-Driven Edge",
    d: "Proprietary models and real-time intelligence power our decisions.",
  },
  {
    icon: Globe,
    t: "Global Impact",
    d: "Operate across major markets with a truly global perspective.",
  },
  {
    icon: TrendingUp,
    t: "Performance Culture",
    d: "Merit, ownership, and curiosity drive everything we do.",
  },
  {
    icon: Users,
    t: "Continuous Growth",
    d: "Learn from the best. Work on hard problems. Make your mark.",
  },
];

const CULTURE = [
  {
    icon: Lightbulb,
    t: "Curiosity",
    d: "We question constantly and seek to understand the why behind everything.",
  },
  {
    icon: Code2,
    t: "Innovation",
    d: "We build, test, and refine — leveraging AI and data to create unique advantages.",
  },
  {
    icon: Users,
    t: "Collaboration",
    d: "Great outcomes come from trust, transparency, and teamwork.",
  },
  {
    icon: Shield,
    t: "Integrity",
    d: "We act with the highest ethical standards in every decision.",
  },
  {
    icon: Globe,
    t: "Global Perspective",
    d: "Local expertise. Global thinking. One integrated platform.",
  },
  {
    icon: Crown,
    t: "Ownership",
    d: "We take initiative, deliver results, and act like owners of the business.",
  },
];

const DEPTS = [
  "All Departments",
  "Investment",
  "Quantitative Research",
  "Engineering & Data",
  "Risk Management",
  "Operations",
  "Corporate",
];

const ROLES: Array<{ role: string; dept: string; loc: string; type: string }> = [
  { role: "Equity Portfolio Manager", dept: "Investment", loc: "New York", type: "Full-time" },
  { role: "Quantitative Researcher", dept: "Quant Research", loc: "New York", type: "Full-time" },
  { role: "ML Engineer", dept: "Engineering & Data", loc: "New York / Remote", type: "Full-time" },
  { role: "Risk Analyst", dept: "Risk Management", loc: "London", type: "Full-time" },
  { role: "Data Engineer", dept: "Engineering & Data", loc: "Singapore", type: "Full-time" },
  { role: "Operations Associate", dept: "Operations", loc: "New York", type: "Full-time" },
];

const BENEFITS = [
  {
    icon: Award,
    t: "Competitive Compensation",
    d: "Industry-leading pay and performance-based bonuses.",
  },
  {
    icon: Heart,
    t: "Health & Wellbeing",
    d: "Comprehensive medical, dental, vision, and wellness programs.",
  },
  {
    icon: GraduationCap,
    t: "Learning & Development",
    d: "Invest in your growth with courses, workshops, and conferences.",
  },
  { icon: Briefcase, t: "Flexible Work", d: "Hybrid opportunities and flexible schedules." },
  {
    icon: Globe,
    t: "Global Opportunities",
    d: "Work across our global desks and collaborate worldwide.",
  },
  {
    icon: Rocket,
    t: "Make an Impact",
    d: "Your work directly contributes to our performance and clients' success.",
  },
];

const PEOPLE = [
  {
    name: "Kevin L.",
    role: "Quantitative Researcher",
    tenure: "2 years at Hudson Crest",
    quote:
      "The culture here is unmatched — smart, humble, and incredibly driven people solving meaningful problems together.",
  },
  {
    name: "Sophie M.",
    role: "Portfolio Manager",
    tenure: "3 years at Hudson Crest",
    quote:
      "I love the sense of ownership. You're trusted to make an impact from day one and supported every step of the way.",
  },
  {
    name: "Arjun P.",
    role: "ML Engineer",
    tenure: "1 year at Hudson Crest",
    quote:
      "The combination of cutting-edge technology and world-class talent is what sets Hudson Crest apart.",
  },
];

function CareersPage() {
  return (
    <SiteLayout>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          <img
            src={tradingFloor}
            alt="Hudson Crest trading floor"
            className="h-full w-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="max-w-2xl">
            <div className="eyebrow">Careers</div>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
              Build the Future of Global Markets.
              <br />
              <span className="text-gradient-brand">Together.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              At Hudson Crest Capital, we combine human ingenuity with artificial intelligence to
              make better decisions, faster. Join a team of exceptional thinkers driving
              performance, innovation, and impact at scale.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#open-roles"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-5 py-3 text-sm font-semibold text-brand-foreground shadow-glow"
              >
                Explore Open Roles <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/60 px-5 py-3 text-sm font-medium text-foreground backdrop-blur hover:bg-surface-elevated"
              >
                <Play className="h-4 w-4 text-brand" /> Life at Hudson Crest
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES_TOP.map((v) => (
            <div key={v.t} className="text-center">
              <v.icon className="mx-auto h-8 w-8 text-brand" />
              <div className="mt-3 text-xs font-bold uppercase tracking-widest text-brand">
                {v.t}
              </div>
              <p className="mt-2 text-xs leading-snug text-muted-foreground">{v.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card p-8 lg:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_2fr]">
            <div>
              <div className="eyebrow">Our Culture</div>
              <h2 className="mt-3 text-3xl font-bold text-foreground">
                Where Exceptional Minds Thrive
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                We believe the best ideas come from diverse perspectives and open collaboration. Our
                culture is built on respect, integrity, and a relentless pursuit of excellence.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {CULTURE.map((c) => (
                <div key={c.t} className="text-center">
                  <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-brand/40 bg-brand/10 text-brand">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-sm font-semibold text-foreground">{c.t}</div>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section id="open-roles" className="!pt-0">
        <div className="flex items-end justify-between">
          <div>
            <div className="eyebrow">Open Roles</div>
            <h2 className="mt-2 text-3xl font-bold text-foreground">Join Our Team</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We are always looking for exceptional talent. Explore opportunities to build your
              career with us.
            </p>
          </div>
          <Link
            to="/contact"
            className="hidden items-center gap-1.5 text-xs font-medium text-brand hover:opacity-80 md:inline-flex"
          >
            View All Departments <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="space-y-1">
            {DEPTS.map((d, i) => (
              <button
                key={d}
                className={`flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-sm transition-colors ${i === 0 ? "bg-brand/15 text-brand border border-brand/30" : "text-muted-foreground hover:bg-surface-elevated"}`}
              >
                <span>{d}</span>
                <span className="text-xs font-mono">
                  {i === 0 ? ROLES.length : Math.max(1, Math.floor(Math.random() * 4))}
                </span>
              </button>
            ))}
          </div>

          <div className="surface-card overflow-hidden">
            <div className="hidden grid-cols-12 gap-4 border-b border-border bg-surface-elevated/40 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground md:grid">
              <div className="col-span-5">Role</div>
              <div className="col-span-3">Department</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-1">Type</div>
              <div className="col-span-1 text-right">Action</div>
            </div>
            {ROLES.map((r) => (
              <div
                key={r.role}
                className="grid grid-cols-1 gap-3 border-b border-border/60 px-6 py-4 last:border-0 md:grid-cols-12 md:items-center md:gap-4"
              >
                <div className="md:col-span-5">
                  <div className="text-sm font-semibold text-foreground">{r.role}</div>
                </div>
                <div className="text-xs text-muted-foreground md:col-span-3">{r.dept}</div>
                <div className="text-xs text-muted-foreground md:col-span-2">{r.loc}</div>
                <div className="text-xs text-muted-foreground md:col-span-1">{r.type}</div>
                <div className="md:col-span-1 md:text-right">
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/10"
                  >
                    Apply <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card grid gap-10 p-8 lg:grid-cols-[0.9fr_2fr] lg:p-10">
          <div>
            <div className="eyebrow">Why Join Hudson Crest</div>
            <h2 className="mt-3 text-3xl font-bold text-foreground">
              More Than a Career. A Mission.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              We tackle the most complex problems in finance and data using cutting-edge technology.
              You'll be empowered to think big, move fast, and make a real impact.
            </p>
            <Link
              to="/contact"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-brand/40 px-4 py-2 text-sm font-medium text-brand hover:bg-brand/10"
            >
              <Play className="h-3.5 w-3.5" /> Life at Hudson Crest
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.t} className="rounded-xl border border-border bg-background/40 p-5">
                <b.icon className="h-6 w-6 text-brand" />
                <div className="mt-3 text-sm font-semibold text-foreground">{b.t}</div>
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="flex items-end justify-between">
          <div>
            <div className="eyebrow">Our People</div>
            <h2 className="mt-2 text-3xl font-bold text-foreground">
              Driven by Purpose. United by Values.
            </h2>
          </div>
          <Link
            to="/about"
            className="hidden items-center gap-1.5 text-xs font-medium text-brand hover:opacity-80 md:inline-flex"
          >
            Meet Our Team <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="mt-7 grid gap-6 md:grid-cols-3">
          {PEOPLE.map((p) => (
            <div key={p.name} className="surface-card p-6">
              <p className="text-sm italic leading-relaxed text-foreground">"{p.quote}"</p>
              <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 text-sm font-bold text-brand">
                  {p.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.role}</div>
                  <div className="text-[10px] text-muted-foreground">{p.tenure}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card relative overflow-hidden border-brand/30 p-10">
          <div className="absolute inset-0 -z-0">
            <img src={officeView} alt="" className="h-full w-full object-cover opacity-25" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          </div>
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h3 className="text-3xl font-bold text-foreground">Ready to build what's next?</h3>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Explore opportunities and take the next step in your career.
              </p>
            </div>
            <a
              href="#open-roles"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-glow"
            >
              View All Open Roles <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </Section>
    </SiteLayout>
  );
}
