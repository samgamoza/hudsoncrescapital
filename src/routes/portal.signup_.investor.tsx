import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Shield } from "lucide-react";
import { FullAccountApplicationWizard } from "@/components/portal/FullAccountApplicationWizard";
import { getMarketingWebsiteHomeUrl } from "@/lib/site-origin";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/portal/signup_/investor")({
  head: () => ({
    meta: [
      { title: "Sign up | Hudson Crest Capital" },
      { name: "description", content: "Create an investor account with the full account application." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvestorSignupPage,
});

function InvestorSignupPage() {
  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center px-4 py-10 sm:px-6">
      <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl lg:min-h-[min(100vh-5rem,720px)] lg:flex-row">
        <aside className="relative flex flex-col justify-between border-b border-border bg-gradient-to-br from-brand/25 via-background to-background p-8 lg:w-[42%] lg:border-b-0 lg:border-r lg:p-10">
          <div>
            <a href={getMarketingWebsiteHomeUrl()} className="inline-flex items-center gap-2" rel="noreferrer">
              <img src={logo} alt="Hudson Crest Capital" className="h-10 w-auto" />
            </a>
            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">Investor signup</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              One guided application
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The same full account opening flow used after sign-in—create your login, then complete suitability and
              disclosures in one place. No duplicate lite questionnaire.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-foreground/90">
              {[
                "Structured steps aligned with regulatory onboarding",
                "Encrypted connection; passwords handled by secure auth",
                "After email confirmation, your application finalizes automatically on first sign-in when needed",
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-10 hidden text-xs text-muted-foreground lg:block">
            Hudson Crest Capital LLC. For qualified investors. Not an offer where prohibited.
          </p>
        </aside>

        <div className="flex flex-1 flex-col overflow-y-auto bg-card p-6 sm:p-8 lg:p-10">
          <div className="mb-4">
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">OPEN INVESTOR ACCOUNT</h1>
            <p className="mt-1 text-sm text-muted-foreground">Full application wizard (same as portal “Open account”)</p>
          </div>

          <FullAccountApplicationWizard mode="signup" />

          <div className="mt-8 flex items-center justify-center gap-2 border-t border-border pt-6 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span>Data encrypted in transit</span>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            <Link to="/portal/login/investor" className="block hover:text-foreground">
              Already have an account? Sign in →
            </Link>
            <a href={getMarketingWebsiteHomeUrl()} className="mt-2 block hover:text-foreground" rel="noreferrer">
              ← Back to website
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
