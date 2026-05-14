import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/lib/portalShared";
import { ProfileCompletionWizard } from "@/components/portal/ProfileCompletionWizard";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/portal/investor/profile_/complete")({
  head: () => ({
    meta: [
      { title: "Complete your profile | Hudson Crest Capital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfileCompletionPage,
});

function ProfileCompletionPage() {
  return (
    <>
      <PageHeader
        title="INVESTMENT ACCOUNT APPLICATION"
        subtitle="Online Account Opening Form"
      />
      <SectionCard title="Online application">
        <ProfileCompletionWizard />
      </SectionCard>
      <div className="mt-4 text-xs text-muted-foreground">
        <Link to="/portal/investor" className="text-brand hover:underline">
          ← Back to dashboard
        </Link>
      </div>
      <Toaster />
    </>
  );
}
