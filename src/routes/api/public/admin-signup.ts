import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { apiErrorResponse, checkRateLimit, getClientIp, readJsonBody } from "../-_utils";

export const Route = createFileRoute("/api/public/admin-signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
        const ip = getClientIp(request);
        const gate = checkRateLimit(`admin-signup:${ip}`, { limit: 5, windowMs: 60_000 });
        if (!gate.ok) {
          return Response.json(
            { error: "Too many requests" },
            { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
          );
        }

        const body = await readJsonBody<{
          email?: string;
          password?: string;
          legal_first_name?: string;
          legal_last_name?: string;
          phone?: string;
          country_of_residence?: string;
          signup_token?: string;
          role?: "super_admin" | "admin" | "support";
        }>(request);

        const signupToken = String(body.signup_token ?? "").trim();

        const email = String(body.email ?? "").trim().toLowerCase();
        const password = String(body.password ?? "");
        const first = String(body.legal_first_name ?? "").trim();
        const last = String(body.legal_last_name ?? "").trim();
        const phone = String(body.phone ?? "").trim() || null;
        const country = String(body.country_of_residence ?? "").trim().toUpperCase() || null;
        const role = body.role ?? "admin";

        if (!email.includes("@")) return Response.json({ error: "Valid email is required." }, { status: 400 });
        if (password.length < 8) {
          return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
        }
        if (!first || !last) {
          return Response.json({ error: "First and last name are required." }, { status: 400 });
        }
        if (!["super_admin", "admin", "support"].includes(role)) {
          return Response.json({ error: "Invalid role selected." }, { status: 400 });
        }

        // Governance rule:
        // - Bootstrap can create the first super admin via token flow.
        // - After a super admin exists, lower roles must be created by a logged-in
        //   super admin through the protected Admin Console flow.
        const superAdminsQ = await supabaseAdmin
          .from("user_roles")
          .select("user_id", { count: "exact", head: true })
          .eq("role", "super_admin");
        if (superAdminsQ.error) {
          console.error("[admin-signup] verify roles failed", superAdminsQ.error.message);
          return Response.json({ error: "Service unavailable" }, { status: 503 });
        }
        const superAdminExists = Number(superAdminsQ.count ?? 0) > 0;

        if (superAdminExists && role !== "super_admin") {
          return Response.json(
            {
              error:
                "A super admin already exists. Create admin/support accounts from Admin Console > Staff & Admins while signed in as super admin.",
            },
            { status: 403 }
          );
        }

        if (role === "super_admin") {
          const superToken = String(process.env.SUPER_ADMIN_SIGNUP_TOKEN ?? "").trim();
          if (!superToken) {
            return Response.json(
              { error: "Super admin creation is disabled. Set SUPER_ADMIN_SIGNUP_TOKEN to enable." },
              { status: 403 }
            );
          }
          if (signupToken !== superToken) {
            return Response.json({ error: "Invalid super admin signup token." }, { status: 401 });
          }
        } else {
          const expectedToken = String(process.env.ADMIN_SIGNUP_TOKEN ?? "").trim();
          if (!expectedToken) {
            return Response.json(
              { error: "Admin signup is disabled. Set ADMIN_SIGNUP_TOKEN to enable." },
              { status: 503 }
            );
          }
          if (!signupToken || signupToken !== expectedToken) {
            return Response.json({ error: "Invalid admin signup token." }, { status: 401 });
          }
        }

        const existing = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 });
        if (existing.error) {
          return Response.json(
            { error: `Auth admin API failed: ${existing.error.message}. Check SUPABASE_SERVICE_ROLE_KEY and project settings.` },
            { status: 502 }
          );
        }
        const dup = (existing.data?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email);
        if (dup) {
          const rolesQ = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", dup.id);
          const roles = (rolesQ.data ?? []).map((r: any) => r.role as string);
          const isStaff = roles.some((r) => r === "super_admin" || r === "admin" || r === "support");

          if (isStaff) {
            return Response.json(
              { error: "A staff account already exists for this email. Please sign in from Admin Login." },
              { status: 409 }
            );
          }

          return Response.json(
            {
              error:
                "This email is already used by a non-staff account. Admin and investor accounts are separate. Use a different email for admin.",
            },
            { status: 409 }
          );
        }

        const created = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            legal_first_name: first,
            legal_last_name: last,
            display_name: `${first} ${last}`,
            phone,
            country_of_residence: country,
            nationality: country,
          },
        });
        if (created.error || !created.data.user) {
          console.error("[admin-signup] create user failed", created.error?.message ?? "unknown");
          return Response.json({ error: "Failed to create user." }, { status: 400 });
        }

        const userId = created.data.user.id;

        const profRes = await supabaseAdmin.from("profiles").upsert(
          {
            user_id: userId,
            legal_first_name: first,
            legal_last_name: last,
            display_name: `${first} ${last}`,
            phone,
            country_of_residence: country,
            nationality: country,
          },
          { onConflict: "user_id" }
        );
        if (profRes.error) {
          console.error("[admin-signup] profile save failed", profRes.error.message);
          return Response.json({ error: "Failed to save profile." }, { status: 400 });
        }

        const roleInsert = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: role as any });
        if (roleInsert.error && roleInsert.error.code !== "23505") {
          console.error("[admin-signup] role insert failed", roleInsert.error.message);
          return Response.json({ error: "Failed to assign role." }, { status: 400 });
        }

        return Response.json({ ok: true, userId, role });
        } catch (e: any) {
          return apiErrorResponse(e);
        }
      },
    },
  },
});
