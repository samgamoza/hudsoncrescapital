import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
// NOTE: ./_shared.server is dynamically imported inside each handler to keep it
// out of the client bundle (TanStack import-protection blocks **/*.server.* on the client).

// ---- investor wallet read (plain impl for `/api/` routes) ----
export async function getMyWalletsForApi(userId: string) {
  const [walletsQ, txnsQ, depositsQ, withdrawalsQ, accountsQ] = await Promise.all([
    (supabaseAdmin.from("wallets") as any).select("*").eq("user_id", userId),
    (supabaseAdmin.from("wallet_transactions") as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    (supabaseAdmin.from("deposit_requests") as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    (supabaseAdmin.from("withdrawal_requests") as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("accounts").select("*").eq("user_id", userId),
  ]);
  return {
    wallets: (walletsQ.data ?? []) as any[],
    transactions: (txnsQ.data ?? []) as any[],
    deposits: (depositsQ.data ?? []) as any[],
    withdrawals: (withdrawalsQ.data ?? []) as any[],
    accounts: (accountsQ.data ?? []) as any[],
  };
}

// ===== Investor: wallet read =====
export const getMyWallets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => getMyWalletsForApi(context.userId));

const depositRequestBody = z.object({
  accountId: z.string().uuid(),
  amount: z.number().positive().max(10_000_000),
  method: z.enum(["bank_transfer", "stripe", "paypal", "crypto", "wire", "other"]),
  reference: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function submitDepositRequestForApi(userId: string, raw: unknown) {
  const data = depositRequestBody.parse(raw);
  const { audit } = await import("./_shared.server");
  const { data: acct } = await supabaseAdmin
    .from("accounts")
    .select("id, user_id, status, base_currency")
    .eq("id", data.accountId)
    .single();
  if (!acct || acct.user_id !== userId) throw new Error("Account not found");
  if (acct.status !== "active") throw new Error("Account is not active");

  const { data: row, error } = await (supabaseAdmin.from("deposit_requests") as any)
    .insert({
      user_id: userId,
      account_id: data.accountId,
      amount: data.amount,
      currency: acct.base_currency,
      method: data.method,
      reference: data.reference ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await audit({
    actorId: userId,
    action: "deposit.request.create",
    targetType: "deposit_request",
    targetId: row.id,
    targetUserId: userId,
    payload: { amount: data.amount, method: data.method },
  });
  return row;
}

// ===== Investor: submit deposit request =====
export const submitDepositRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => depositRequestBody.parse(d))
  .handler(({ context, data }) => submitDepositRequestForApi(context.userId, data));

const withdrawalRequestBody = z.object({
  accountId: z.string().uuid(),
  amount: z.number().positive().max(10_000_000),
  method: z.enum(["bank_transfer", "stripe", "paypal", "crypto", "wire", "other"]),
  destination: z.string().trim().min(2).max(500),
  notes: z.string().trim().max(1000).optional(),
});

export async function submitWithdrawalRequestForApi(userId: string, raw: unknown) {
  const data = withdrawalRequestBody.parse(raw);
  const { audit } = await import("./_shared.server");
  const { data: acct } = await supabaseAdmin
    .from("accounts")
    .select("id, user_id, status, base_currency")
    .eq("id", data.accountId)
    .single();
  if (!acct || acct.user_id !== userId) throw new Error("Account not found");
  if (acct.status !== "active") throw new Error("Account is not active");

  const { data: wallet } = await (supabaseAdmin.from("wallets") as any)
    .select("available_balance")
    .eq("account_id", data.accountId)
    .single();
  if (!wallet || Number(wallet.available_balance) < data.amount) {
    throw new Error("Insufficient available balance");
  }

  const { data: row, error } = await (supabaseAdmin.from("withdrawal_requests") as any)
    .insert({
      user_id: userId,
      account_id: data.accountId,
      amount: data.amount,
      currency: acct.base_currency,
      method: data.method,
      destination: data.destination,
      notes: data.notes ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await audit({
    actorId: userId,
    action: "withdrawal.request.create",
    targetType: "withdrawal_request",
    targetId: row.id,
    targetUserId: userId,
    payload: { amount: data.amount, method: data.method },
  });
  return row;
}

// ===== Investor: submit withdrawal request =====
export const submitWithdrawalRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => withdrawalRequestBody.parse(d))
  .handler(({ context, data }) => submitWithdrawalRequestForApi(context.userId, data));

const cancelRequestBody = z.object({
  requestId: z.string().uuid(),
  kind: z.enum(["deposit", "withdrawal"]),
});

export async function cancelMyRequestForApi(userId: string, raw: unknown) {
  const data = cancelRequestBody.parse(raw);
  const { audit } = await import("./_shared.server");
  const table = data.kind === "deposit" ? "deposit_requests" : "withdrawal_requests";
  const { error } = await (supabaseAdmin.from(table) as any)
    .update({ status: "cancelled" })
    .eq("id", data.requestId)
    .eq("user_id", userId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  await audit({
    actorId: userId,
    action: `${data.kind}.request.cancel`,
    targetType: `${data.kind}_request`,
    targetId: data.requestId,
    targetUserId: userId,
  });
  return { ok: true };
}

// ===== Investor: cancel own pending request =====
export const cancelMyRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => cancelRequestBody.parse(d))
  .handler(({ context, data }) => cancelMyRequestForApi(context.userId, data));

// ===== Staff: list pending review queue =====
export const listPendingFundingRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { audit, getRolesForUser, isAdminOrHigher, isStaff, postWalletTransaction, requireMinRole } = await import("./_shared.server");
    const roles = await getRolesForUser(context.userId);
    if (!isStaff(roles)) throw new Error("Forbidden: staff access required");

    const [depositsQ, withdrawalsQ] = await Promise.all([
      (supabaseAdmin.from("deposit_requests") as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      (supabaseAdmin.from("withdrawal_requests") as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    // Enrich with email
    const ids = Array.from(
      new Set(
        [...(depositsQ.data ?? []), ...(withdrawalsQ.data ?? [])].map((r: any) => r.user_id),
      ),
    );
    let emailMap: Record<string, string> = {};
    if (ids.length) {
      const { data: usersResp } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      emailMap = Object.fromEntries(
        (usersResp.users ?? []).filter((u) => ids.includes(u.id)).map((u) => [u.id, u.email ?? ""]),
      );
    }
    const enrich = (rows: any[]) => rows.map((r) => ({ ...r, email: emailMap[r.user_id] ?? "" }));

    return {
      deposits: enrich(depositsQ.data ?? []),
      withdrawals: enrich(withdrawalsQ.data ?? []),
    };
  });

// ===== Admin: review deposit =====
export const reviewDepositRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      requestId: z.string().uuid(),
      decision: z.enum(["approve", "reject"]),
      reviewNotes: z.string().trim().max(1000).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { audit, getRolesForUser, isAdminOrHigher, isStaff, postWalletTransaction, requireMinRole } = await import("./_shared.server");
    const roles = await requireMinRole(context.userId, "admin");

    const { data: req } = await (supabaseAdmin.from("deposit_requests") as any)
      .select("*")
      .eq("id", data.requestId)
      .single();
    if (!req) throw new Error("Request not found");
    if (req.status !== "pending") throw new Error("Request already reviewed");

    if (data.decision === "approve") {
      // Find wallet for this account
      const { data: wallet } = await (supabaseAdmin.from("wallets") as any)
        .select("id")
        .eq("account_id", req.account_id)
        .single();
      if (!wallet) throw new Error("Wallet not found for account");

      await postWalletTransaction({
        walletId: wallet.id,
        userId: req.user_id,
        txnType: "deposit",
        amount: Number(req.amount),
        description: `Approved deposit (${req.method})${req.reference ? ` ref: ${req.reference}` : ""}`,
        referenceId: req.id,
        referenceType: "deposit_request",
        postedBy: context.userId,
      });
    }

    const { error } = await (supabaseAdmin.from("deposit_requests") as any)
      .update({
        status: data.decision === "approve" ? "approved" : "rejected",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        review_notes: data.reviewNotes ?? null,
      })
      .eq("id", data.requestId);
    if (error) throw new Error(error.message);

    await audit({
      actorId: context.userId,
      actorRoles: roles,
      action: `deposit.request.${data.decision}`,
      targetType: "deposit_request",
      targetId: req.id,
      targetUserId: req.user_id,
      payload: { amount: req.amount, notes: data.reviewNotes ?? null },
    });
    return { ok: true };
  });

// ===== Admin: review withdrawal =====
export const reviewWithdrawalRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      requestId: z.string().uuid(),
      decision: z.enum(["approve", "reject"]),
      reviewNotes: z.string().trim().max(1000).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { audit, getRolesForUser, isAdminOrHigher, isStaff, postWalletTransaction, requireMinRole } = await import("./_shared.server");
    const roles = await requireMinRole(context.userId, "admin");

    const { data: req } = await (supabaseAdmin.from("withdrawal_requests") as any)
      .select("*")
      .eq("id", data.requestId)
      .single();
    if (!req) throw new Error("Request not found");
    if (req.status !== "pending") throw new Error("Request already reviewed");

    if (data.decision === "approve") {
      const { data: wallet } = await (supabaseAdmin.from("wallets") as any)
        .select("id, available_balance")
        .eq("account_id", req.account_id)
        .single();
      if (!wallet) throw new Error("Wallet not found");
      if (Number(wallet.available_balance) < Number(req.amount))
        throw new Error("Insufficient funds at approval time");

      await postWalletTransaction({
        walletId: wallet.id,
        userId: req.user_id,
        txnType: "withdrawal",
        amount: -Number(req.amount),
        description: `Approved withdrawal (${req.method}) → ${req.destination}`,
        referenceId: req.id,
        referenceType: "withdrawal_request",
        postedBy: context.userId,
      });
    }

    const { error } = await (supabaseAdmin.from("withdrawal_requests") as any)
      .update({
        status: data.decision === "approve" ? "approved" : "rejected",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        review_notes: data.reviewNotes ?? null,
      })
      .eq("id", data.requestId);
    if (error) throw new Error(error.message);

    await audit({
      actorId: context.userId,
      actorRoles: roles,
      action: `withdrawal.request.${data.decision}`,
      targetType: "withdrawal_request",
      targetId: req.id,
      targetUserId: req.user_id,
      payload: { amount: req.amount, notes: data.reviewNotes ?? null },
    });
    return { ok: true };
  });

// ===== Admin: manual wallet adjustment (credit or debit) =====
export const adjustClientWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      walletId: z.string().uuid(),
      amount: z.number().refine((n) => n !== 0, "Amount cannot be zero"),
      description: z.string().trim().min(1).max(500),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { audit, getRolesForUser, isAdminOrHigher, isStaff, postWalletTransaction, requireMinRole } = await import("./_shared.server");
    const roles = await requireMinRole(context.userId, "admin");
    const result = await postWalletTransaction({
      walletId: data.walletId,
      userId: "", // looked up from wallet
      txnType: "adjustment",
      amount: data.amount,
      description: data.description,
      postedBy: context.userId,
    });
    await audit({
      actorId: context.userId,
      actorRoles: roles,
      action: "wallet.adjust",
      targetType: "wallet",
      targetId: data.walletId,
      payload: { amount: data.amount, description: data.description },
    });
    return result;
  });

// Cast helper — not used externally
// isAdminOrHigher referenced via dynamic import inside handlers
