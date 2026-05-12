import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { LayoutDashboard, PanelTop } from "lucide-react";
import { PageHeader, SectionCard } from "@/lib/portalShared";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/portal/admin/settings")({
  component: AdminSettingsPage,
});

type LayoutMode = "v1" | "v2";

function AdminSettingsPage() {
  const { role } = usePortalAuth("staff");
  const canEditLayout = role === "super_admin" || role === "admin";
  const [layout, setLayout] = useState<LayoutMode>("v1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/portal-settings");
      const j = (await res.json()) as { investorDashboard?: string };
      if (res.ok && (j.investorDashboard === "v1" || j.investorDashboard === "v2")) {
        setLayout(j.investorDashboard);
      } else {
        setLayout("v1");
      }
    } catch {
      setLayout("v1");
      toast.error("Could not load portal settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveLayout = async (next: LayoutMode) => {
    if (!canEditLayout) return;
    setSaving(true);
    try {
      const res = await fetch("/api/portal/portal-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investorDashboard: next }),
      });
      const body = await res.json().catch(() => ({}));
      const b = body as { error?: string; hint?: string };
      if (!res.ok) {
        const msg = [b.error, b.hint].filter(Boolean).join(" ");
        throw new Error(msg || "Save failed");
      }
      setLayout(next);
      toast.success(next === "v2" ? "Investors now use Dashboard 2 by default." : "Investors now use Dashboard 1.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Portal settings"
        subtitle="Control the default investor portal experience for all investor accounts."
      />

      <SectionCard
        title="Investor dashboard layout"
        description="Dashboard 1 is the standard Hudson Crest investor portal. Dashboard 2 is a compact desk-style layout (account profile, trading records, funding, and help desk)."
      >
        {!canEditLayout ? (
          <p className="text-sm text-muted-foreground">
            Only administrators can change this setting. Current layout:{" "}
            <span className="font-medium text-foreground">
              {loading ? "…" : layout === "v2" ? "Dashboard 2" : "Dashboard 1"}
            </span>
            .
          </p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveLayout("v1")}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                layout === "v1"
                  ? "border-brand bg-brand/10 shadow-sm"
                  : "border-border hover:border-brand/40 hover:bg-surface-elevated/50",
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <LayoutDashboard className="h-4 w-4 text-brand" aria-hidden />
                Dashboard 1
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Default sidebar navigation, metrics, and quick actions (recommended).
              </p>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveLayout("v2")}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                layout === "v2"
                  ? "border-brand bg-brand/10 shadow-sm"
                  : "border-border hover:border-brand/40 hover:bg-surface-elevated/50",
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <PanelTop className="h-4 w-4 text-brand" aria-hidden />
                Dashboard 2
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Classic desk-style horizontal navigation with consolidated forms and tables.
              </p>
            </button>
          </div>
        )}
        {canEditLayout && !loading ? (
          <p className="mt-4 text-[11px] text-muted-foreground">
            Active selection:{" "}
            <span className="font-medium text-foreground">{layout === "v2" ? "Dashboard 2" : "Dashboard 1"}</span>
            {saving ? " · Saving…" : null}
          </p>
        ) : null}
      </SectionCard>
    </>
  );
}
