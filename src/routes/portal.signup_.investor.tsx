import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Shield } from "lucide-react";
import { InvestorSignupForm } from "@/components/portal/InvestorSignupForm";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getMarketingWebsiteHomeUrl } from "@/lib/site-origin";
import logo from "@/assets/logo.png";
import sidePanelImage from "@/assets/city-newyork.jpg";

export const Route = createFileRoute("/portal/signup_/investor")({
  head: () => ({
    meta: [
      { title: "Sign up | Hudson Crest Capital" },
      {
        name: "description",
        content:
          "Create your Hudson Crest investor account in under a minute. Complete suitability and identity verification inside your secure portal.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvestorSignupPage,
});

function InvestorSignupPage() {
  return (
    <SiteLayout>
    <div className="grid-bg flex items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl lg:flex-row">
        <aside className="relative isolate flex flex-col justify-between overflow-hidden border-b border-border p-8 lg:w-[42%] lg:border-b-0 lg:border-r lg:p-10">
          {/* Background photo + corporate overlay */}
          <div
            className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center"
            style={{ backgroundImage: `url(${sidePanelImage})` }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-background/95 via-background/80 to-brand/25"
            aria-hidden
          />

          <div className="relative">
            <a
              href={getMarketingWebsiteHomeUrl()}
              className="inline-flex items-center gap-2"
              rel="noreferrer"
            >
              <img src={logo} alt="Hudson Crest Capital" className="h-10 w-auto" />
            </a>
            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">
              Investor signup
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Open your investor account in less than a minute
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Open your investor account in less than a minute. Suitability checks, disclosures, and identity 
            verification are completed securely within your portal after sign-in.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-foreground/90">
              {[
                "Quick signup, just your basic details and password",
                "Encrypted connection; passwords handled by secure auth",
                "Complete suitability, disclosures, and identity verification inside your secure portal",
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand backdrop-blur">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="relative mt-10 hidden text-center text-xs text-muted-foreground lg:block">
            Hudson Crest Capital
          </p>
        </aside>

        <div className="flex flex-1 flex-col overflow-y-auto bg-card p-6 sm:p-8 lg:p-10">
          <div className="mb-5">
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
              INVESTMENT ACCOUNT APPLICATION
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Online Account Opening Form</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Start with the basics below, you'll finish suitability, disclosures, and identity
              verification inside your portal after sign-in.
            </p>
          </div>

          <InvestorSignupForm />

          <div className="mt-8 flex items-center justify-center gap-2 border-t border-border pt-6 text-xs text-muted-foreground opacity-60">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span>Data Encrypted &amp; Secured</span>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            <Link to="/portal/login/investor" className="block hover:text-foreground">
              Already have an account? Sign in →
            </Link>
          </div>
        </div>
      </div>
    </div>
    </SiteLayout>
  );
}
