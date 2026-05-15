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
        title="Your investor profile & questionnaire"
        subtitle="Signed-in investors — complete suitability, identity, and disclosures here. (Staff use Admin → Open New Client Account for desk-led onboarding.)"
      />
      <SectionCard title="Questionnaire & uploads">
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
