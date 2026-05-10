import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const REQUIRED_TABLES = [
  "user_roles",
  "profiles",
  "accounts",
  "user_mfa",
  "audit_logs",
  "client_notes",
  "sub_portfolios",
  "sub_portfolio_holdings",
  "wallets",
  "wallet_transactions",
  "deposit_requests",
  "withdrawal_requests",
  "kyc_documents",
  "tickets",
  "ticket_messages",
  "payment_events",
] as const;

function isMissingTableError(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("could not find the table")
  );
}

export const Route = createFileRoute("/api/public/schema-readiness")({
  server: {
    handlers: {
      GET: async () => {
        if (process.env.PUBLIC_STATUS_ENDPOINTS_ENABLED !== "true") {
          return Response.json({ ok: false, error: "Not found" }, { status: 404 });
        }

        const checks = await Promise.all(
          REQUIRED_TABLES.map(async (table) => {
            const { error } = await (supabaseAdmin.from(table) as any)
              .select("*", { count: "exact", head: true })
              .limit(1);
            if (!error) return { table, ok: true as const, error: null as string | null };
            return {
              table,
              ok: false as const,
              error: error.message,
              missing: isMissingTableError(error.message),
            };
          })
        );

        const missing = checks.filter((c) => !c.ok && (c as any).missing).map((c) => c.table);
        const failing = checks.filter((c) => !c.ok).map((c) => ({ table: c.table }));

        return Response.json({
          ok: failing.length === 0,
          summary: {
            required: REQUIRED_TABLES.length,
            passing: checks.filter((c) => c.ok).length,
            failing: failing.length,
            missing: missing.length,
          },
          missingTables: missing,
          failingTables: failing,
        });
      },
    },
  },
});
