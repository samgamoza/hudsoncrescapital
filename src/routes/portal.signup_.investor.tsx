import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Shield } from "lucide-react";
import { InvestorSignupForm } from "@/components/portal/InvestorSignupForm";
import { Toaster } from "@/components/ui/sonner";
import { getMarketingWebsiteHomeUrl } from "@/lib/site-origin";
import logo from "@/assets/logo.png";

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

/** Same tab labels as the legacy Cross Ocean reference (account profile). */
const CROSS_OCEAN_NAV = [
  "Account Profile",
  "Trading Record-Buy",
  "Trading Record-Sell",
  "Trade Order",
  "Funding Record",
  "Funding Transfer",
  "Change Password",
  "Help Desk",
  "Sign Out",
] as const;

function InvestorSignupPage() {
  const now = useMemo(() => new Date(), []);
  const stamp = now.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="min-h-screen bg-neutral-200 text-neutral-900">
      <header className="border-b border-neutral-400 bg-white px-4 py-2 text-xs text-neutral-700 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <a href={getMarketingWebsiteHomeUrl()} className="flex items-center gap-2 font-semibold text-blue-900">
            <img src={logo} alt="Hudson Crest Capital" className="h-8 w-auto" />
            <span className="text-sm tracking-tight">Hudson Crest Capital</span>
          </a>
          <div className="text-right text-[11px] leading-tight">
            <div>{stamp}</div>
            <div className="mt-0.5 font-medium text-neutral-900">Investor account opening</div>
          </div>
        </div>
      </header>

      <nav className="bg-[#1a2b4a] px-2 py-0 text-[11px] font-medium text-white sm:px-4">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-0">
          {CROSS_OCEAN_NAV.map((label) => {
            const base =
              "inline-block border-b-2 px-2 py-2 sm:px-3 border-transparent opacity-80 hover:opacity-100";
            if (label === "Account Profile") {
              return (
                <Link key={label} to="/portal/account-profile" className={`${base} hover:text-white`}>
                  {label}
                </Link>
              );
            }
            if (label === "Help Desk") {
              return (
                <Link key={label} to="/portal/investor/support" className={`${base} hover:text-white`}>
                  {label}
                </Link>
              );
            }
            if (label === "Sign Out") {
              return (
                <Link key={label} to="/portal/login/investor" className={`${base} hover:text-white`}>
                  {label}
                </Link>
              );
            }
            return (
              <span key={label} className={`${base} cursor-default`}>
                {label}
              </span>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl bg-white px-3 py-6 shadow sm:px-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-lg font-bold tracking-tight text-neutral-900 sm:text-xl">
            INVESTMENT ACCOUNT APPLICATION
          </h1>
          <p className="mt-1 text-sm font-medium text-neutral-700">Online Account Opening Form</p>
          <p className="mt-3 max-w-2xl text-xs leading-relaxed text-neutral-600">
            Start with the basics below. Suitability, disclosures, and identity verification are completed securely
            inside your portal after sign-in.
          </p>
        </div>

        <div className="max-w-xl">
          <InvestorSignupForm />
        </div>

        <div className="mt-8 flex max-w-xl items-center gap-2 border-t border-neutral-200 pt-6 text-[11px] text-neutral-600">
          <Shield className="h-3.5 w-3.5 shrink-0 text-blue-800" aria-hidden />
          <span>Data Encrypted &amp; Secured</span>
        </div>

        <p className="mt-4 max-w-xl text-xs text-neutral-600">
          <Link to="/portal/login/investor" className="font-medium text-blue-800 hover:underline">
            Already have an account? Sign in →
          </Link>
        </p>
      </main>

      <footer className="border-t border-neutral-400 bg-neutral-100 py-3 text-center text-[11px] text-neutral-600">
        © {now.getFullYear()} Hudson Crest Capital. All rights reserved.
      </footer>

      <Toaster />
    </div>
  );
}
