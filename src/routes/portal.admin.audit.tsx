import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { PageHeader, SectionCard, DataTable } from "@/lib/portalShared";

export const Route = createFileRoute("/portal/admin/audit")({
  component: AuditPage,
});

const field = "bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground";

function AuditPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [action, setAction] = useState("");

  const refresh = async () => {
    try {
      const res = await fetch("/api/portal/audit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 200, action: action || undefined }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setRows((await res.json()) as any[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };
  useEffect(() => {
    void refresh();
  }, []);

  return (
    <>
      <PageHeader title="Audit Log" subtitle="Immutable record of all sensitive portal actions." />
      <SectionCard title="Filter">
        <div className="flex gap-2 items-center">
          <input
            className={field}
            placeholder="Action contains (e.g. deposit, admin)"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
          <button
            className="text-sm px-3 py-2 rounded-md border border-border hover:bg-surface-elevated"
            onClick={refresh}
          >
            Apply
          </button>
        </div>
      </SectionCard>

      <SectionCard title={`Recent Activity (${rows?.length ?? 0})`}>
        <DataTable
          rows={rows ?? []}
          columns={[
            {
              key: "created_at",
              label: "When",
              render: (r) => new Date(r.created_at).toLocaleString(),
            },
            { key: "actor_role", label: "Role" },
            { key: "action", label: "Action" },
            { key: "target_type", label: "Target" },
            {
              key: "target_id",
              label: "Target ID",
              render: (r) =>
                r.target_id ? (
                  <code className="text-xs">{String(r.target_id).slice(0, 8)}…</code>
                ) : (
                  "—"
                ),
            },
            {
              key: "payload",
              label: "Payload",
              render: (r) =>
                r.payload ? (
                  <code className="text-xs text-muted-foreground">
                    {JSON.stringify(r.payload).slice(0, 80)}
                  </code>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      </SectionCard>
      <Toaster />
    </>
  );
}
