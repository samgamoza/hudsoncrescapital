import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { InvestorOpenAccountWizard } from "@/components/portal/InvestorOpenAccountWizard";
import { Toaster } from "@/components/ui/sonner";
import { SiteLayout, Section } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/portal/signup_/investor")({
  head: () => ({
    meta: [
      { title: "Open account | Hudson Crest Capital" },
      {
        name: "description",
        content:
          "Open a Hudson Crest investor account. Your application details are saved to your profile when you finish and create your portal login.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvestorSignupPage,
});

function InvestorSignupPage() {
  return (
    <SiteLayout>
      <Section className="py-12 lg:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-muted-foreground">Investor portal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Open your account</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Complete the application in three short steps. Credentials and legal acknowledgements are collected on the
            final step; your answers are stored with your profile when you create your account.
          </p>

          <div className="mt-10 rounded-xl border border-border bg-card/50 p-6 shadow-sm sm:p-8">
            <InvestorOpenAccountWizard />
          </div>

          <div className="mt-8 flex items-center gap-2 border-t border-border pt-6 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>Encrypted connection. We never ask for your password outside this page.</span>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            <Link to="/portal/login/investor" className="font-medium text-primary underline-offset-4 hover:underline">
              Already have an account? Sign in
            </Link>
          </p>
        </div>
      </Section>

      <Toaster />
    </SiteLayout>
  );
}
