import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Headphones, Newspaper, ShieldCheck, UserPlus } from "lucide-react";
import { PageHeader } from "@/lib/portalShared";
import { FullAccountApplicationWizard } from "@/components/portal/FullAccountApplicationWizard";
import { getMarketingWebsiteHomeUrl } from "@/lib/site-origin";

export const Route = createFileRoute("/portal/investor/apply")({
  head: () => ({
    meta: [
      { title: "Open Account | Hudson Crest Capital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApplyPage,
});

function ApplyPage() {
  return (
    <>
      <PageHeader
        title="Open account"
        subtitle="Full application for a Hudson Crest brokerage profile. Your progress is saved when you submit the final step."
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="bg-gradient-brand px-4 py-3 sm:px-6">
              <h1 className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-brand-foreground">
                Open account
              </h1>
            </div>
            <div className="p-4 sm:p-6 lg:p-8">
              <FullAccountApplicationWizard />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <Link to="/portal/investor" className="text-brand hover:underline">
              ← Back to dashboard
            </Link>
            <Link to="/portal/signup/investor" className="hover:text-foreground">
              New investor? Start at signup (same full application)
            </Link>
            <a href="mailto:onboarding@hudsoncrestcapital.com" className="hover:text-foreground">
              Email onboarding desk
            </a>
          </div>
        </div>

        <aside className="flex flex-col gap-4 text-sm">
          <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
            <div
              className="h-28 bg-gradient-to-br from-brand/40 via-background to-background"
              aria-hidden
            />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-background via-background/80 to-transparent p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-foreground">Trading app</p>
              <a
                href={`${getMarketingWebsiteHomeUrl()}technology`}
                className="mt-2 inline-flex w-fit rounded-md bg-gradient-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:opacity-90"
                rel="noreferrer"
              >
                Learn more
              </a>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
            <div className="h-28 bg-muted/40 flex items-center justify-center">
              <Headphones className="h-12 w-12 text-brand/60" aria-hidden />
            </div>
            <div className="border-t border-border p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                Speak with an adviser today
              </p>
              <Link
                to="/portal/investor/support"
                className="mt-2 inline-flex w-fit rounded-md border border-brand/50 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/15"
              >
                Free consultation
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="bg-gradient-brand px-3 py-2">
              <h2 className="text-center text-xs font-semibold uppercase tracking-wider text-brand-foreground">
                News & markets
              </h2>
            </div>
            <ul className="divide-y divide-border p-2 text-xs text-muted-foreground">
              <li className="py-2">
                <Link to="/markets" className="font-medium text-brand hover:underline line-clamp-2">
                  Live markets & watchlists
                </Link>
                <p className="mt-1 line-clamp-3">Indices, equities, and macro context — updated through the public site.</p>
              </li>
              <li className="py-2">
                <Link to="/insights" className="font-medium text-brand hover:underline line-clamp-2">
                  Insights & commentary
                </Link>
                <p className="mt-1 line-clamp-3">Research-style notes and desk views from Hudson Crest.</p>
              </li>
              <li className="py-2 flex items-center gap-2 text-foreground/80">
                <Newspaper className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                <span>External headlines may appear on the marketing site ticker.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-muted/15 p-4 text-xs leading-relaxed text-muted-foreground">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-brand mt-0.5" aria-hidden />
              <p>
                Already in the portal? You are in the right place. Not registered yet? Use{" "}
                <Link to="/portal/signup/investor" className="inline-flex items-center gap-1 text-brand hover:underline">
                  <UserPlus className="h-3 w-3" /> Investor signup
                </Link>{" "}
                — it runs this same wizard, then you sign in here to update or add documents.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-brand" aria-hidden />
              <span>Execution and risk tools live under Trade and Portfolio after approval.</span>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
