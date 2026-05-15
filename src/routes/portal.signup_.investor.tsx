import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Shield } from "lucide-react";
import { InvestorSignupForm } from "@/components/portal/InvestorSignupForm";
import { Toaster } from "@/components/ui/sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getMarketingWebsiteHomeUrl } from "@/lib/site-origin";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/portal/signup_/investor")({
  head: () => ({
    meta: [
      { title: "Sign up | Hudson Crest Capital" },
      {
        name: "description",
        content:
          "Public self-registration for investors (not staff desk onboarding). Create a portal login in one step; complete suitability and identity inside the portal after sign-in.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvestorSignupPage,
});

const bullets = [
  "Quick signup — just your basic details and password",
  "Encrypted connection; passwords handled by secure auth",
  "Complete suitability, disclosures, and identity verification inside your secure portal",
];

function InvestorSignupPage() {
  return (
    <SiteLayout>
      <div className="relative min-h-[calc(100vh-12rem)] overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <Link
              to="/portal/login/investor"
              className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Back to sign in
            </Link>
            <a href={getMarketingWebsiteHomeUrl()} className="mb-8 inline-block" rel="noreferrer">
              <img src={logo} alt="Hudson Crest Capital" className="h-11 w-auto" />
            </a>
            <div className="eyebrow">Investor signup</div>
            <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
              Open your account in{" "}
              <span className="text-gradient-brand">minutes</span>
            </h1>
            <ul className="mt-8 max-w-xl space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {bullets.map((text) => (
                <li key={text} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand ring-1 ring-brand/25">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface-card border border-border/80 p-6 shadow-elevated sm:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">Investor self-registration</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Create your portal login</h2>
            <p className="mt-2 rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Staff / advisors:</span> to open an account{" "}
              <span className="text-foreground">for a client</span>, use{" "}
              <span className="font-medium text-foreground">Admin → Open New Client Account</span> (desk onboarding). This
              public page is only for individuals registering <span className="text-foreground">their own</span> investor
              access.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Enter the basics below. Suitability, disclosures, and identity verification are completed after you sign in
              to the investor portal.
            </p>
            <div className="mt-6">
              <InvestorSignupForm />
            </div>
            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                <span>Data encrypted in transit.</span>
              </div>
              <Link to="/portal/login/investor" className="font-medium text-brand hover:underline">
                Already have an account? Sign in →
              </Link>
            </div>
            <a
              href={getMarketingWebsiteHomeUrl()}
              className="mt-4 inline-block text-xs text-muted-foreground hover:text-foreground"
              rel="noreferrer"
            >
              ← Back to website
            </a>
          </div>
        </div>
      </div>

      <Toaster />
    </SiteLayout>
  );
}
