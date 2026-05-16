import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Shield } from "lucide-react";
import { InvestorSignupForm } from "@/components/portal/InvestorSignupForm";
import { Toaster } from "@/components/ui/sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getMarketingWebsiteHomeUrl } from "@/lib/site-origin";
import cityNewYork from "@/assets/city-newyork.jpg";

export const Route = createFileRoute("/portal/signup_/investor")({
  head: () => ({
    meta: [
      { title: "Sign up | Hudson Crest Capital" },
      {
        name: "description",
        content:
          "Open your Hudson Crest investor account in less than a minute. Suitability checks, disclosures, and identity verification are completed securely within your portal after sign-in.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvestorSignupPage,
});

const bullets = [
  "Quick signup with your basic details and password",
  "Encrypted connection; passwords handled by secure auth",
  "Complete suitability, disclosures, and KYC inside your secure portal",
];

function InvestorSignupPage() {
  return (
    <SiteLayout>
      <div className="relative flex min-h-[calc(100vh-12rem)] items-center overflow-hidden border-b border-border py-10 sm:py-14">
        <div className="absolute inset-0 grid-bg opacity-25" />
        <div className="pointer-events-none absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />

        <div className="relative mx-auto w-full max-w-[52rem] px-4 sm:px-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="h-9 w-1 shrink-0 rounded-full bg-brand shadow-glow" aria-hidden />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Open Account</h1>
            </div>
            <Link
              to="/portal/login/investor"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to sign in
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-elevated ring-1 ring-white/5">
            <div className="grid lg:grid-cols-2">
              <aside className="relative flex min-h-[28rem] flex-col justify-between overflow-hidden border-b border-border/60 px-7 py-8 sm:px-8 sm:py-9 lg:min-h-0 lg:border-b-0 lg:border-r lg:border-border/60">
                <div
                  aria-hidden
                  className="absolute inset-0 bg-cover bg-bottom opacity-40"
                  style={{ backgroundImage: `url(${cityNewYork})` }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-br from-[oklch(0.18_0.06_255)]/95 via-[oklch(0.22_0.05_255)]/88 to-[oklch(0.16_0.07_255)]/96"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-brand/20 blur-3xl"
                />

                <div className="relative flex flex-1 flex-col">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-foreground/60">
                    Investor signup
                  </p>
                  <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-white sm:text-[1.65rem]">
                    Open your account in <span className="text-gradient-brand">minutes</span>
                  </h2>
                  <ul className="mt-7 space-y-3.5">
                    {bullets.map((text) => (
                      <li key={text} className="flex gap-3 text-sm leading-relaxed text-white/88">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-glow">
                          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                        </span>
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="relative mt-8 text-xs text-white/45">Hudson Crest Capital</p>
              </aside>

              <section className="relative flex flex-col bg-gradient-to-b from-card via-background to-card px-7 py-8 sm:px-8 sm:py-9">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand/[0.06] to-transparent"
                />

                <div className="relative">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">Application</p>
                  <h2 className="mt-1.5 text-lg font-semibold text-foreground">Fill in your personal details</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Create your login in under a minute. Suitability, disclosures, and identity verification are
                    completed securely in your portal after sign-in.
                  </p>

                  <div className="mt-6">
                    <InvestorSignupForm compact />
                  </div>

                  <div className="mt-6 space-y-3 border-t border-border/80 pt-5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                      <span>Data encrypted &amp; secured</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <Link to="/portal/login/investor" className="font-medium text-brand hover:underline">
                        Already have an account? Sign in
                      </Link>
                      <a
                        href={getMarketingWebsiteHomeUrl()}
                        className="text-muted-foreground hover:text-foreground"
                        rel="noreferrer"
                      >
                        Back to website
                      </a>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <Toaster />
    </SiteLayout>
  );
}
