import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, ArrowLeft, Mail, UserPlus } from "lucide-react";
import { PageHeader, SectionCard } from "@/lib/portalShared";

export const Route = createFileRoute("/portal/investor/apply")({
  head: () => ({
    meta: [
      { title: "Open Account | Hudson Crest Capital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApplyInfo,
});

function ApplyInfo() {
  return (
    <>
      <PageHeader
        title="Open an Account"
        subtitle="New accounts are opened by your account manager."
      />
      <SectionCard title="White-glove onboarding">
        <div className="flex flex-col gap-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-elevated/50 border border-border">
            <ShieldCheck className="h-5 w-5 text-brand mt-0.5" />
            <div>
              <div className="text-foreground font-medium">Hudson Crest opens accounts for you</div>
              <p className="mt-1">
                To meet our compliance and suitability standards, account opening is handled
                directly by our onboarding desk. A relationship manager will collect your details,
                run the required KYC/AML checks, and provision your account.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link
              to="/portal/signup/investor"
              className="surface-card p-4 hover:border-brand/40 transition-colors"
            >
              <UserPlus className="h-5 w-5 text-brand" />
              <div className="mt-2 text-sm text-foreground font-medium">Self serve signup</div>
              <div className="text-xs text-muted-foreground mt-1">
                Create an account and submit a short profile online.
              </div>
            </Link>
            <a
              href="mailto:onboarding@hudsoncrestcapital.com"
              className="surface-card p-4 hover:border-brand/40 transition-colors"
            >
              <Mail className="h-5 w-5 text-brand" />
              <div className="mt-2 text-sm text-foreground font-medium">Email onboarding desk</div>
              <div className="text-xs text-muted-foreground mt-1">
                onboarding@hudsoncrestcapital.com
              </div>
            </a>
            <Link
              to="/portal/investor/support"
              className="surface-card p-4 hover:border-brand/40 transition-colors"
            >
              <ShieldCheck className="h-5 w-5 text-brand" />
              <div className="mt-2 text-sm text-foreground font-medium">Open a support ticket</div>
              <div className="text-xs text-muted-foreground mt-1">
                Request a callback from our team
              </div>
            </Link>
          </div>
          <Link
            to="/portal/investor"
            className="inline-flex items-center gap-2 text-brand hover:underline mt-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
        </div>
      </SectionCard>
    </>
  );
}
