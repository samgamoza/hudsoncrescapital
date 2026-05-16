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
      <div className="relative min-h-[calc(100vh-12rem)] overflow-hidden border-b border-border bg-muted/25 py-10 sm:py-14">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="h-9 w-1 shrink-0 rounded-full bg-brand" aria-hidden />
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Open Account</h1>
            </div>
            <Link
              to="/portal/login/investor"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to sign in
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-elevated">
            <div className="flex flex-col lg:min-h-[34rem] lg:flex-row">
              <aside className="relative flex flex-col justify-between overflow-hidden bg-[oklch(0.22_0.04_255)] px-7 py-8 sm:px-9 sm:py-10 lg:w-[min(42%,22rem)] lg:shrink-0 lg:py-12">
                <div
                  aria-hidden
                  className="absolute inset-0 bg-cover bg-bottom opacity-35"
                  style={{ backgroundImage: `url(${cityNewYork})` }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-[oklch(0.20_0.05_255)]/95 via-[oklch(0.22_0.05_255)]/90 to-[oklch(0.18_0.06_255)]/98"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-brand/25 blur-3xl"
                />
                <div className="relative flex flex-1 flex-col">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-foreground/70">
                    Investor signup
                  </p>
                  <h2 className="mt-4 text-2xl font-bold leading-tight text-white sm:text-[1.75rem]">
                    Open your account in minutes
                  </h2>
                  <ul className="mt-8 space-y-4">
                    {bullets.map((text) => (
                      <li key={text} className="flex gap-3 text-sm leading-relaxed text-white/85">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-glow">
                          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                        </span>
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="relative mt-10 text-xs text-white/50">Hudson Crest Capital</p>
              </aside>

              <div className="flex flex-1 flex-col bg-background px-7 py-8 sm:px-9 sm:py-10">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Investment account application
                </p>
                <h2 className="mt-1 text-lg font-semibold text-foreground sm:text-xl">Fill in your personal details</h2>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  Create your login in under a minute. Suitability, disclosures, and identity verification are completed
                  securely in your portal after sign-in.
                </p>

                <div className="mt-6 flex-1">
                  <InvestorSignupForm />
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                    <span>Data encrypted &amp; secured</span>
                  </div>
                  <Link to="/portal/login/investor" className="font-medium text-brand hover:underline">
                    Already have an account? Sign in
                  </Link>
                </div>
                <a
                  href={getMarketingWebsiteHomeUrl()}
                  className="mt-3 inline-block text-xs text-muted-foreground hover:text-foreground"
                  rel="noreferrer"
                >
                  Back to website
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toaster />
    </SiteLayout>
  );
}
