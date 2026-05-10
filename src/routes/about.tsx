import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield,
  Star,
  Users,
  CheckCircle2,
  Lightbulb,
  TrendingUp,
  Globe,
  Briefcase,
  Award,
  Building2,
  Lock,
  FileCheck,
  ArrowRight,
} from "lucide-react";
import { SiteLayout, SplitHero, Section, StatRow } from "@/components/site/SiteLayout";
import officeView from "@/assets/office-view.jpg";
import cityNY from "@/assets/city-newyork.jpg";
import cityLDN from "@/assets/city-london.jpg";
import citySG from "@/assets/city-singapore.jpg";
import worldMap from "@/assets/world-map-desks.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Hudson Crest Capital" },
      {
        name: "description",
        content:
          "Institutional expertise. AI-driven intelligence. Global perspective. Hudson Crest Capital is a multi-strategy investment firm built for the long term.",
      },
      { property: "og:title", content: "About Hudson Crest Capital" },
      {
        property: "og:description",
        content: "Institutional expertise. AI-driven intelligence. Global perspective.",
      },
      { property: "og:image", content: officeView },
    ],
  }),
  component: AboutPage,
});

const VALUES = [
  { icon: Shield, t: "Integrity", d: "We operate with the highest ethical standards." },
  {
    icon: Star,
    t: "Excellence",
    d: "We are committed to outperformance through innovation and discipline.",
  },
  {
    icon: Users,
    t: "Collaboration",
    d: "We believe diverse perspectives and teamwork drive better outcomes.",
  },
  {
    icon: CheckCircle2,
    t: "Accountability",
    d: "We take ownership and are accountable to our clients and each other.",
  },
  {
    icon: Lightbulb,
    t: "Innovation",
    d: "We embrace technology to solve complex investment challenges.",
  },
];

const DESKS = [
  {
    city: "New York",
    role: "Headquarters",
    img: cityNY,
    addr: ["One World Trade Center", "New York, NY 10007", "United States"],
  },
  {
    city: "London",
    role: "Trading Desk",
    img: cityLDN,
    addr: ["25 Old Broad Street", "London, EC2N 1HQ", "United Kingdom"],
  },
  {
    city: "Singapore",
    role: "Trading Desk",
    img: citySG,
    addr: ["8 Marina View", "Asia Square Tower 1", "Singapore 018960"],
  },
];

function AboutPage() {
  return (
    <SiteLayout>
      <SplitHero
        eyebrow="About Us"
        title="About"
        highlight="Hudson Crest Capital."
        description="Institutional expertise. AI-driven intelligence. Global perspective. Hudson Crest Capital is a multi-strategy investment firm that combines the power of artificial intelligence with deep market expertise to identify opportunities, manage risk, and deliver consistent, risk-adjusted returns across global markets."
        side={
          <StatRow
            items={[
              { icon: TrendingUp, value: "$12.74B", label: "Assets Under Management" },
              { icon: Users, value: "60+", label: "Investment Professionals" },
              { icon: Globe, value: "3", label: "Global Trading Desks" },
              { icon: Briefcase, value: "20+", label: "Countries Covered" },
              { icon: Award, value: "10+ Years", label: "Track Record" },
              { icon: Shield, value: "Institutional", label: "Client Focused" },
            ]}
          />
        }
      />

      <Section>
        <div className="surface-card grid gap-10 p-8 lg:grid-cols-[1fr_1.4fr] lg:p-10">
          <div>
            <div className="eyebrow">Our Mission</div>
            <h2 className="mt-4 text-2xl font-semibold text-foreground">
              To enhance capital through intelligence and discipline.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              We leverage cutting-edge AI, advanced analytics, and human expertise to navigate
              complex markets and generate long-term value for our institutional partners.
            </p>
          </div>
          <div>
            <div className="eyebrow">Our Values</div>
            <div className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-5">
              {VALUES.map((v) => (
                <div key={v.t} className="text-center">
                  <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-brand/40 bg-brand/10 text-brand">
                    <v.icon className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-sm font-semibold text-foreground">{v.t}</div>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{v.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card grid gap-8 overflow-hidden p-8 lg:grid-cols-2 lg:p-10">
          <div>
            <div className="eyebrow">Our Story</div>
            <h2 className="mt-4 text-2xl font-semibold text-foreground">
              Founded at the intersection of human judgment and machine intelligence.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Hudson Crest Capital was founded on a simple belief: the future of investing lies at
              the intersection of human judgment and machine intelligence.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Our founders, a team of seasoned investors, technologists, and data scientists, came
              together with a shared vision to build a next generation investment firm that
              leverages AI and advanced analytics to make better decisions, manage risk more
              effectively, and unlock new opportunities in global markets.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Since our inception, we have grown into a global investment platform with trading
              desks in New York, London, and Singapore, serving institutional investors around the
              world.
            </p>
            <Link
              to="/careers"
              className="mt-7 inline-flex items-center gap-2 rounded-lg border border-brand/40 px-4 py-2 text-sm font-medium text-brand"
            >
              Meet Our Leadership <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-border">
            <img
              src={officeView}
              alt="Hudson Crest Capital trading floor"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card p-8 lg:p-10">
          <div className="eyebrow">Global Presence</div>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            Closer to the markets, partners, and opportunities that matter most.
          </h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
            <div className="relative overflow-hidden rounded-2xl border border-border">
              <img
                src={worldMap}
                alt="Global trading desks map"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="grid gap-4">
              {DESKS.map((d) => (
                <div
                  key={d.city}
                  className="grid grid-cols-[88px_1fr] gap-4 rounded-xl border border-border bg-background/40 p-4"
                >
                  <img
                    src={d.img}
                    alt={d.city}
                    className="h-20 w-22 rounded-lg object-cover"
                    loading="lazy"
                  />
                  <div>
                    <div className="text-sm font-bold uppercase tracking-wider text-foreground">
                      {d.city}
                    </div>
                    <div className="text-xs text-brand">{d.role}</div>
                    <div className="mt-2 text-xs leading-snug text-muted-foreground">
                      {d.addr.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </div>
                    <Link
                      to="/global-desks"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand"
                    >
                      View Desk Overview <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="surface-card p-8 lg:p-10">
          <div className="eyebrow">Regulation & Security</div>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Building2,
                t: "Regulated",
                d: "Hudson Crest Capital Management, LP is registered with the U.S. Securities and Exchange Commission (SEC) as an Investment Adviser.",
              },
              {
                icon: Shield,
                t: "Security",
                d: "We employ institutional-grade security protocols, infrastructure, and compliance frameworks to protect our clients and their data.",
              },
              {
                icon: Lock,
                t: "Compliance",
                d: "Our compliance program is designed to meet the highest regulatory standards across all jurisdictions in which we operate.",
              },
            ].map((c) => (
              <div key={c.t} className="flex gap-4">
                <c.icon className="h-7 w-7 shrink-0 text-brand" />
                <div>
                  <div className="text-base font-semibold text-foreground">{c.t}</div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </SiteLayout>
  );
}
