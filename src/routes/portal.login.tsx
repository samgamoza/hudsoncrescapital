import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { z } from "zod";
import { Briefcase, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { getMarketingWebsiteHomeUrl } from "@/lib/site-origin";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["login", "signup"]).optional(),
  verify: z.enum(["required"]).optional(),
  email: z.string().optional(),
});

export const Route = createFileRoute("/portal/login")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Portal Login | Hudson Crest Capital" },
      { name: "description", content: "Choose your portal: investor account or admin console." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalChooser,
});

// Investors land here directly. Admin access is only via the dedicated
// /portal/login/admin URL (not advertised to investors).

function PortalChooser() {
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, "");
  if (path !== "/portal/login") {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <a
          href={getMarketingWebsiteHomeUrl()}
          className="flex items-center justify-center mb-8"
          rel="noreferrer"
        >
          <img src={logo} alt="Hudson Crest Capital" className="h-12 w-auto" />
        </a>
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-foreground">Select your portal</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Investors and administrators sign in through dedicated entry points.
          </p>
        </div>

        <div className="grid gap-5">
          <Link
            to="/portal/login/investor"
            className="surface-card p-6 hover:border-brand transition-colors group"
          >
            <div className="inline-flex items-center justify-center h-11 w-11 rounded-lg bg-brand/10 text-brand">
              <Briefcase className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">Investor Portal</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Access your dashboard, wallet, deposits, withdrawals and account documents.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand group-hover:gap-2 transition-all">
              Sign in <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <a
            href={getMarketingWebsiteHomeUrl()}
            className="text-xs text-muted-foreground hover:text-foreground"
            rel="noreferrer"
          >
            ← Back to website
          </a>
        </div>
      </div>
    </div>
  );
}
