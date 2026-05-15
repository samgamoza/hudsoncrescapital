import { createFileRoute } from "@tanstack/react-router";
import { CrossOceanStyleAccountProfilePage } from "@/components/portal/CrossOceanStyleAccountProfilePage";

/** Public legacy-style account profile (Cross Ocean layout). No portal auth required. */
export const Route = createFileRoute("/portal/account-profile")({
  head: () => ({
    meta: [
      { title: "Account Profile | Hudson Crest Capital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountProfileRoute,
});

function AccountProfileRoute() {
  return <CrossOceanStyleAccountProfilePage />;
}
