import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import {
  Mail,
  Phone,
  MapPin,
  Building2,
  Send,
  CheckCircle2,
  Clock,
  Globe,
  Linkedin,
  Twitter,
  Youtube,
} from "lucide-react";
import { SiteLayout, PageHero, Section } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — Hudson Crest Capital" },
      {
        name: "description",
        content:
          "Get in touch with Hudson Crest Capital. Speak with our investor relations, careers, media, or trading desk teams across New York, London, and Singapore.",
      },
      { property: "og:title", content: "Contact Us — Hudson Crest Capital" },
      {
        property: "og:description",
        content:
          "Connect with our global team for investor relations, partnerships, careers, and media inquiries.",
      },
    ],
  }),
  component: ContactPage,
});

const OFFICES = [
  {
    city: "New York",
    role: "Global Headquarters",
    addr: ["200 Hudson Street, 22nd Floor", "New York, NY 10013, USA"],
    phone: "+1 (212) 555-0142",
    email: "newyork@hudsoncrest.example",
  },
  {
    city: "London",
    role: "EMEA Hub",
    addr: ["10 Bishopsgate, Level 18", "London EC2N 4AY, United Kingdom"],
    phone: "+44 20 7946 0188",
    email: "london@hudsoncrest.example",
  },
  {
    city: "Singapore",
    role: "Asia-Pacific Hub",
    addr: ["1 Raffles Place, Tower 2 #28-01", "Singapore 048616"],
    phone: "+65 6812 5400",
    email: "singapore@hudsoncrest.example",
  },
];

const DEPARTMENTS = [
  {
    icon: Building2,
    title: "Investor Relations",
    desc: "Allocations, fund documentation, and performance reporting.",
    email: "investors@hudsoncrest.example",
  },
  {
    icon: Globe,
    title: "Institutional Partnerships",
    desc: "Strategic partnerships and bespoke mandates.",
    email: "partnerships@hudsoncrest.example",
  },
  {
    icon: Mail,
    title: "Media & Press",
    desc: "Press inquiries, interviews, and speaking requests.",
    email: "press@hudsoncrest.example",
  },
  {
    icon: CheckCircle2,
    title: "Careers",
    desc: "General talent inquiries and recruiting questions.",
    email: "careers@hudsoncrest.example",
  },
];

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  company: z.string().trim().max(150).optional().or(z.literal("")),
  topic: z.string().min(1, "Please select an inquiry type"),
  message: z.string().trim().min(10, "Please share a few details (min 10 chars)").max(2000),
});

type FormState = {
  name: string;
  email: string;
  company: string;
  topic: string;
  message: string;
};

const INITIAL: FormState = {
  name: "",
  email: "",
  company: "",
  topic: "",
  message: "",
};

function ContactPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const next: Partial<Record<keyof FormState, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitted(true);
    setForm(INITIAL);
  };

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Contact"
        title="Let's start a"
        highlight="conversation."
        description="Whether you are an institutional investor, partner, journalist, or future colleague, our team is ready to help."
      />

      <Section>
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* FORM */}
          <div className="surface-card p-8">
            <div className="eyebrow">Send us a message</div>
            <h2 className="mt-2 text-2xl font-bold text-foreground">
              We typically respond within one business day.
            </h2>

            {submitted ? (
              <div className="mt-8 rounded-xl border border-success/40 bg-success/10 p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
                  <div>
                    <div className="text-base font-semibold text-foreground">
                      Thank you. Your message is on its way.
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      A member of our team will be in touch shortly. For urgent matters, please call
                      your nearest office below.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="mt-4 text-xs font-medium text-brand"
                    >
                      Send another message
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field
                  label="Full Name *"
                  error={errors.name}
                  input={
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      maxLength={100}
                      className="form-input"
                      placeholder="Jane Doe"
                    />
                  }
                />
                <Field
                  label="Email *"
                  error={errors.email}
                  input={
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      maxLength={255}
                      className="form-input"
                      placeholder="jane@firm.com"
                    />
                  }
                />
                <Field
                  label="Company / Organization"
                  error={errors.company}
                  input={
                    <input
                      type="text"
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      maxLength={150}
                      className="form-input"
                      placeholder="Acme Capital"
                    />
                  }
                />
                <Field
                  label="Inquiry Type *"
                  error={errors.topic}
                  input={
                    <select
                      value={form.topic}
                      onChange={(e) => setForm({ ...form, topic: e.target.value })}
                      className="form-input"
                    >
                      <option value="">Select…</option>
                      <option>Investor Relations</option>
                      <option>Institutional Partnerships</option>
                      <option>Careers</option>
                      <option>Media & Press</option>
                      <option>General Inquiry</option>
                    </select>
                  }
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Message *"
                    error={errors.message}
                    input={
                      <textarea
                        rows={6}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        maxLength={2000}
                        className="form-input resize-none"
                        placeholder="How can we help?"
                      />
                    }
                  />
                </div>
                <div className="sm:col-span-2 flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">
                    By submitting you agree to our privacy policy.
                  </p>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-glow"
                  >
                    Send Message <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* QUICK CONTACT */}
          <div className="space-y-6">
            <div className="surface-card p-6">
              <div className="eyebrow">Direct Channels</div>
              <ul className="mt-4 space-y-4">
                {DEPARTMENTS.map((d) => (
                  <li key={d.title} className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand ring-1 ring-brand/20">
                      <d.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-foreground">{d.title}</div>
                      <p className="text-xs text-muted-foreground">{d.desc}</p>
                      <a
                        href={`mailto:${d.email}`}
                        className="mt-1 inline-block text-xs font-medium text-brand hover:opacity-90"
                      >
                        {d.email}
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="surface-card p-6">
              <div className="eyebrow">Hours & Coverage</div>
              <div className="mt-4 flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-brand" />
                <div className="text-sm text-muted-foreground">
                  <div className="font-semibold text-foreground">24 / 5 Coverage</div>
                  Our global desks operate continuously from Sunday 22:00 UTC to Friday 22:00 UTC
                  across New York, London, and Singapore.
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                <span className="text-xs text-muted-foreground">Follow us:</span>
                <Linkedin className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" />
                <Twitter className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" />
                <Youtube className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* OFFICES */}
      <Section className="!pt-0">
        <div className="eyebrow">Global Offices</div>
        <h2 className="mt-2 text-3xl font-bold text-foreground">Visit us around the world.</h2>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {OFFICES.map((o) => (
            <div key={o.city} className="surface-card p-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-brand" />
                <div>
                  <div className="text-base font-bold uppercase tracking-wider text-foreground">
                    {o.city}
                  </div>
                  <div className="text-xs text-brand">{o.role}</div>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                {o.addr.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
              <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                <a
                  href={`tel:${o.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Phone className="h-3.5 w-3.5 text-brand" /> {o.phone}
                </a>
                <a
                  href={`mailto:${o.email}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Mail className="h-3.5 w-3.5 text-brand" /> {o.email}
                </a>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </SiteLayout>
  );
}

function Field({ label, input, error }: { label: string; input: React.ReactNode; error?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="mt-2">{input}</div>
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
