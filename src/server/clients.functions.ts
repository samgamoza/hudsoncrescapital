import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireMinRole } from "./_shared.server";

// ---- helpers ----
// Accepts both `admin` and `super_admin` (super_admin >= admin).
async function assertAdmin(_supabase: any, userId: string) {
  await requireMinRole(userId, "admin");
}

// ---- list clients ----
export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: usersResp, error: usersErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (usersErr) throw new Error(usersErr.message);

    const ids = usersResp.users.map((u) => u.id);
    const [profilesQ, rolesQ, accountsQ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").in("user_id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin.from("accounts").select("*").in("user_id", ids),
    ]);

    const profiles = profilesQ.data ?? [];
    const roles = rolesQ.data ?? [];
    const accounts = accountsQ.data ?? [];

    return usersResp.users.map((u) => {
      const profile = profiles.find((p: any) => p.user_id === u.id);
      const userRoles = roles.filter((r: any) => r.user_id === u.id).map((r: any) => r.role);
      const userAccounts = accounts.filter((a: any) => a.user_id === u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        banned_until: (u as any).banned_until ?? null,
        profile,
        roles: userRoles,
        accounts: userAccounts,
      };
    });
  });

// ---- get one ----
export const getClient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: userResp, error } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (error) throw new Error(error.message);
    const u = userResp.user;
    if (!u) throw new Error("User not found");

    const [profileQ, rolesQ, accountsQ, kycQ, notesQ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("user_id", u.id).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", u.id),
      supabaseAdmin.from("accounts").select("*").eq("user_id", u.id).order("created_at", { ascending: false }),
      supabaseAdmin.from("kyc_documents").select("*").eq("user_id", u.id).order("submitted_at", { ascending: false }),
      supabaseAdmin.from("client_notes").select("*").eq("user_id", u.id).order("created_at", { ascending: false }),
    ]);

    return {
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      email_confirmed_at: u.email_confirmed_at,
      banned_until: (u as any).banned_until ?? null,
      profile: profileQ.data,
      roles: (rolesQ.data ?? []).map((r: any) => r.role),
      accounts: accountsQ.data ?? [],
      kyc_documents: kycQ.data ?? [],
      notes: notesQ.data ?? [],
    };
  });

// ---- create client (full onboarding wizard from admin) ----
const onboardSchema = z.object({
  // Identity
  email: z.string().email(),
  username: z.string().trim().regex(/^[a-zA-Z0-9_.-]{3,32}$/, "Username must be 3–32 chars (letters, numbers, . _ -)").optional(),
  password: z.string().min(8).max(128).optional(),
  legal_first_name: z.string().trim().min(1).max(100),
  legal_last_name: z.string().trim().min(1).max(100),
  display_name: z.string().trim().max(200).optional(),
  date_of_birth: z.string().min(8).max(20).optional(),
  phone: z.string().trim().max(40).optional(),
  country_of_residence: z.string().trim().length(2).optional(),
  nationality: z.string().trim().length(2).optional(),
  tax_id_last4: z.string().trim().max(4).optional(),
  // Address (stored on account.metadata.address)
  address_line1: z.string().trim().max(200).optional(),
  address_line2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state_region: z.string().trim().max(100).optional(),
  postal_code: z.string().trim().max(40).optional(),
  // Account
  account_type: z.enum(["cash", "margin", "retirement"]).default("cash"),
  base_currency: z.enum(["USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD"]).default("USD"),
  initial_status: z.enum(["pending", "active"]).default("pending"),
  // Financial profile
  employment_status: z.enum(["employed", "self_employed", "retired", "student", "unemployed", "other"]).optional(),
  employer: z.string().trim().max(200).optional(),
  occupation: z.string().trim().max(200).optional(),
  annual_income: z.enum(["under_50k", "50k_100k", "100k_250k", "250k_500k", "500k_1m", "over_1m"]).optional(),
  net_worth: z.enum(["under_50k", "50k_250k", "250k_1m", "1m_5m", "over_5m"]).optional(),
  source_of_funds: z.enum(["employment", "savings", "investments", "inheritance", "business", "other"]).optional(),
  investment_experience: z.enum(["none", "limited", "moderate", "extensive"]).optional(),
  risk_tolerance: z.enum(["conservative", "moderate", "aggressive"]).optional(),
  investment_objectives: z.array(z.string().max(50)).max(10).default([]),
  // Compliance flags
  pep_flag: z.boolean().default(false),
  sanctions_cleared: z.boolean().default(false),
  internal_notes: z.string().trim().max(2000).optional(),
  // Lifecycle
  send_invite: z.boolean().default(true),
  // First sub-portfolio (optional — admin can create more later)
  initial_sub_portfolio: z.object({
    name: z.string().trim().min(1).max(120),
    asset_class: z.enum(["equities", "crypto", "commodities", "managed_strategy"]),
    target_allocation_pct: z.number().min(0).max(100).default(100),
    risk_band: z.enum(["conservative", "moderate", "aggressive"]).optional(),
  }).optional(),
});

export const onboardClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => onboardSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { audit } = await import("./_shared.server");

    // 0. Validate username uniqueness if provided
    if (data.username) {
      const { data: dup } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .ilike("username", data.username)
        .maybeSingle();
      if (dup) throw new Error(`Username "${data.username}" is already taken`);
    }

    // 1. Provision auth user (invite by email, or create with password)
    let uid: string;
    if (data.send_invite) {
      const { data: invited, error: invErr } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(data.email);
      if (invErr) throw new Error(`Invite failed: ${invErr.message}`);
      uid = invited.user!.id;
    } else {
      const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });
      if (cErr) throw new Error(`User create failed: ${cErr.message}`);
      uid = created.user!.id;
    }

    // 2. Upsert profile (synced with investor Profile page)
    const { error: profErr } = await supabaseAdmin.from("profiles").upsert(
      {
        user_id: uid,
        username: data.username ?? null,
        legal_first_name: data.legal_first_name,
        legal_last_name: data.legal_last_name,
        display_name: data.display_name ?? `${data.legal_first_name} ${data.legal_last_name}`,
        date_of_birth: data.date_of_birth ?? null,
        phone: data.phone ?? null,
        country_of_residence: data.country_of_residence?.toUpperCase() ?? null,
        nationality: data.nationality?.toUpperCase() ?? null,
        tax_id_last4: data.tax_id_last4 ?? null,
        status: data.initial_status === "active" ? "approved" : "submitted",
      },
      { onConflict: "user_id" },
    );
    if (profErr) throw new Error(`Profile save failed: ${profErr.message}`);

    // 3. Create account with comprehensive metadata
    const acctNum = `HCC-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
    const nowIso = new Date().toISOString();
    const { data: acct, error: acctErr } = await (supabaseAdmin.from("accounts") as any)
      .insert({
        user_id: uid,
        account_number: acctNum,
        account_type: data.account_type,
        base_currency: data.base_currency,
        status: data.initial_status,
        opened_at: data.initial_status === "active" ? nowIso : null,
        metadata: {
          opened_by_admin: context.userId,
          opened_at: nowIso,
          address: {
            line1: data.address_line1 ?? null,
            line2: data.address_line2 ?? null,
            city: data.city ?? null,
            state_region: data.state_region ?? null,
            postal_code: data.postal_code ?? null,
            country: data.country_of_residence?.toUpperCase() ?? null,
          },
          financial: {
            employment_status: data.employment_status ?? null,
            employer: data.employer ?? null,
            occupation: data.occupation ?? null,
            annual_income: data.annual_income ?? null,
            net_worth: data.net_worth ?? null,
            source_of_funds: data.source_of_funds ?? null,
            investment_experience: data.investment_experience ?? null,
            risk_tolerance: data.risk_tolerance ?? null,
            investment_objectives: data.investment_objectives ?? [],
          },
          compliance: {
            pep_flag: data.pep_flag,
            sanctions_cleared: data.sanctions_cleared,
            checked_by: context.userId,
            checked_at: nowIso,
          },
        },
      })
      .select()
      .single();
    if (acctErr) throw new Error(`Account create failed: ${acctErr.message}`);

    // 4. Optional internal note
    if (data.internal_notes && data.internal_notes.trim()) {
      await supabaseAdmin.from("client_notes").insert({
        user_id: uid,
        author_id: context.userId,
        note: data.internal_notes.trim(),
      });
    }

    // 5. Optional initial sub-portfolio
    if (data.initial_sub_portfolio) {
      const sp = data.initial_sub_portfolio;
      await (supabaseAdmin.from("sub_portfolios") as any).insert({
        account_id: (acct as any).id,
        user_id: uid,
        name: sp.name,
        asset_class: sp.asset_class,
        base_currency: data.base_currency,
        target_allocation_pct: sp.target_allocation_pct,
        risk_band: sp.risk_band ?? data.risk_tolerance ?? null,
      });
    }

    await audit({
      actorId: context.userId,
      action: "client.onboard",
      targetType: "user",
      targetId: uid,
      targetUserId: uid,
      payload: { account_number: acctNum, status: data.initial_status, account_type: data.account_type },
    });

    return { user_id: uid, account: acct, account_number: acctNum };
  });


// ---- update profile ----
export const updateClientProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid(),
      patch: z.object({
        legal_first_name: z.string().trim().max(100).optional(),
        legal_last_name: z.string().trim().max(100).optional(),
        display_name: z.string().trim().max(200).optional(),
        phone: z.string().trim().max(40).optional(),
        date_of_birth: z.string().optional(),
        country_of_residence: z.string().trim().max(2).optional(),
        nationality: z.string().trim().max(2).optional(),
        tax_id_last4: z.string().trim().max(4).optional(),
        status: z.enum(["incomplete", "submitted", "approved", "rejected"]).optional(),
      }),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert({ user_id: data.userId, ...data.patch }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- account lifecycle ----
export const updateAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      accountId: z.string().uuid(),
      action: z.enum(["approve", "reject", "suspend", "reactivate", "close"]),
      reason: z.string().trim().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);

    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    switch (data.action) {
      case "approve":
        patch.status = "active";
        patch.opened_at = new Date().toISOString();
        patch.suspension_reason = null;
        patch.suspended_at = null;
        break;
      case "reject":
        patch.status = "rejected";
        break;
      case "suspend":
        patch.status = "suspended";
        patch.suspension_reason = data.reason ?? null;
        patch.suspended_at = new Date().toISOString();
        break;
      case "reactivate":
        patch.status = "active";
        patch.suspension_reason = null;
        patch.suspended_at = null;
        break;
      case "close":
        patch.status = "closed";
        patch.closed_at = new Date().toISOString();
        break;
    }

    const { error } = await supabaseAdmin.from("accounts").update(patch as any).eq("id", data.accountId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- enable / disable login (ban via auth admin) ----
export const setClientLoginEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    // ban_duration: "none" enables, "876000h" (~100y) disables
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.enabled ? "none" : "876000h",
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- send password reset ----
export const sendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- add note ----
export const addClientNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid(),
      note: z.string().trim().min(1).max(2000),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("client_notes").insert({
      user_id: data.userId,
      author_id: context.userId,
      note: data.note,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- delete client (soft: close accounts + ban + remove roles) ----
export const deactivateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    await supabaseAdmin
      .from("accounts")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: "876000h",
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- HARD DELETE one client (super admin only) ----
// Wipes all client data, then deletes the auth user. Cascade-style cleanup
// across the tables we own. Does NOT touch staff/admin users.
export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), confirm: z.literal("DELETE") }).parse(d))
  .handler(async ({ context, data }) => {
    const { audit, getRolesForUser } = await import("./_shared.server");
    await requireMinRole(context.userId, "super_admin");

    // Refuse to delete staff (safety)
    const targetRoles = await getRolesForUser(data.userId);
    if (targetRoles.some((r) => r === "super_admin" || r === "admin" || r === "support")) {
      throw new Error("Refusing to delete a staff/admin user via this endpoint.");
    }

    const tables = [
      "wallet_transactions",
      "wallets",
      "trades",
      "orders",
      "positions",
      "sub_portfolio_holdings",
      "sub_portfolios",
      "deposit_requests",
      "withdrawal_requests",
      "cash_ledger",
      "margin_snapshots",
      "ticket_messages", // by author_id
      "tickets",
      "kyc_documents",
      "kyc_checks",
      "client_notes",
      "accounts",
      "user_roles",
      "user_mfa",
      "profiles",
    ];

    for (const t of tables) {
      // ticket_messages has no user_id column — delete by author_id
      const col = t === "ticket_messages" ? "author_id" : "user_id";
      await (supabaseAdmin.from(t as any) as any).delete().eq(col, data.userId);
    }

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (delErr) throw new Error(`Auth delete failed: ${delErr.message}`);

    await audit({
      actorId: context.userId,
      action: "client.hard_delete",
      targetType: "user",
      targetUserId: data.userId,
    });
    return { ok: true };
  });

// ---- RESET all clients (super admin only) ----
// Wipes every investor user (and all of their data) but keeps:
// staff/admin users, instruments, audit_logs.
export const resetAllClients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ confirm: z.literal("RESET ALL CLIENTS") }).parse(d))
  .handler(async ({ context }) => {
    const { audit, getRolesForUser } = await import("./_shared.server");
    await requireMinRole(context.userId, "super_admin");

    // List all auth users (paginate)
    const allUsers: { id: string }[] = [];
    let page = 1;
    while (true) {
      const { data: resp, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      allUsers.push(...resp.users.map((u) => ({ id: u.id })));
      if (resp.users.length < 200) break;
      page += 1;
      if (page > 50) break; // safety
    }

    // Filter out staff
    const candidates: string[] = [];
    for (const u of allUsers) {
      const roles = await getRolesForUser(u.id);
      const isStaff = roles.some((r) => r === "super_admin" || r === "admin" || r === "support");
      if (!isStaff) candidates.push(u.id);
    }

    let deleted = 0;
    for (const uid of candidates) {
      const tables = [
        "wallet_transactions","wallets","trades","orders","positions",
        "sub_portfolio_holdings","sub_portfolios","deposit_requests",
        "withdrawal_requests","cash_ledger","margin_snapshots",
        "tickets","kyc_documents","kyc_checks","client_notes",
        "accounts","user_roles","user_mfa","profiles",
      ];
      for (const t of tables) {
        await (supabaseAdmin.from(t as any) as any).delete().eq("user_id", uid);
      }
      await (supabaseAdmin.from("ticket_messages" as any) as any).delete().eq("author_id", uid);
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(uid);
      if (!delErr) deleted += 1;
    }

    await audit({
      actorId: context.userId,
      action: "system.reset_all_clients",
      payload: { deleted_users: deleted },
    });
    return { ok: true, deleted };
  });

// ---- Resolve login identifier (username or email) -> email for auth ----
// Public-callable (no auth middleware): the login form needs to translate
// usernames into emails before the user has a session. Returns null if not found.
export const resolveLoginEmail = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ identifier: z.string().trim().min(1).max(255) }).parse(d))
  .handler(async ({ data }) => {
    const id = data.identifier.trim();
    if (id.includes("@")) {
      const parsed = z.string().email().safeParse(id.toLowerCase());
      return { email: parsed.success ? parsed.data : null };
    }
    const { data: row } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .ilike("username", id)
      .maybeSingle();
    if (!row) return { email: null as string | null };
    const { data: u } = await supabaseAdmin.auth.admin.getUserById((row as any).user_id);
    return { email: u?.user?.email ?? null };
  });

