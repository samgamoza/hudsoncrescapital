import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireMinRole } from "@/server/_shared.server";

export type InvestorDashboardLayout = "v1" | "v2";

export async function getInvestorDashboardLayoutForApi(): Promise<{ investorDashboard: InvestorDashboardLayout }> {
  try {
    const { data, error } = await supabaseAdmin
      .from("portal_settings" as never)
      .select("investor_dashboard")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    const row = data as { investor_dashboard?: string } | null;
    const v = row?.investor_dashboard === "v2" ? "v2" : "v1";
    return { investorDashboard: v };
  } catch {
    return { investorDashboard: "v1" };
  }
}

const setLayoutInput = z.object({
  investorDashboard: z.enum(["v1", "v2"]),
});

export async function setInvestorDashboardLayoutForApi(actorUserId: string, raw: unknown) {
  await requireMinRole(actorUserId, "admin");
  const body = setLayoutInput.parse(raw);
  const { error } = await supabaseAdmin.from("portal_settings" as never).upsert(
    {
      id: 1,
      investor_dashboard: body.investorDashboard,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
  return { ok: true as const, investorDashboard: body.investorDashboard };
}
