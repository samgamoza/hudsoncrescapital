import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { audit } from "./_shared.server";

const ISSUER = "Hudson Crest Capital";

function genRecoveryCodes(n = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.random().toString(36).slice(2, 7);
    const b = Math.random().toString(36).slice(2, 7);
    codes.push(`${a}-${b}`.toUpperCase());
  }
  return codes;
}

// Begin enrollment: generate secret + QR. NOT yet enabled.
export const startMfaEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = user.user?.email ?? "user";
    const secret = generateSecret();
    const otpauth = generateURI({ issuer: ISSUER, label: email, secret });
    const qr = await QRCode.toDataURL(otpauth);

    await (supabaseAdmin.from("user_mfa") as any).upsert(
      { user_id: userId, secret, enabled: false, recovery_codes: null, enrolled_at: null },
      { onConflict: "user_id" },
    );
    return { secret, otpauth, qr };
  });

// Verify the 6-digit code, enable MFA, return one-time recovery codes.
export const verifyAndEnableMfa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().trim().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { data: row } = await (supabaseAdmin.from("user_mfa") as any)
      .select("secret")
      .eq("user_id", userId)
      .single();
    if (!row?.secret) throw new Error("Start enrollment first");

    const ok = verifySync({ token: data.code, secret: row.secret }).valid;
    if (!ok) throw new Error("Invalid verification code");

    const codes = genRecoveryCodes();
    const { error } = await (supabaseAdmin.from("user_mfa") as any)
      .update({ enabled: true, enrolled_at: new Date().toISOString(), recovery_codes: codes })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    await audit({ actorId: userId, action: "mfa.enable", targetUserId: userId });
    return { ok: true, recoveryCodes: codes };
  });

export const disableMfa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().trim().min(6).max(20) }).parse(d))
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { data: row } = await (supabaseAdmin.from("user_mfa") as any)
      .select("secret, recovery_codes, enabled")
      .eq("user_id", userId)
      .single();
    if (!row?.enabled) throw new Error("MFA is not enabled");

    const isTotp = /^\d{6}$/.test(data.code);
    const valid = isTotp
      ? verifySync({ token: data.code, secret: row.secret }).valid
      : (row.recovery_codes ?? []).includes(data.code.toUpperCase());
    if (!valid) throw new Error("Invalid code");

    const { error } = await (supabaseAdmin.from("user_mfa") as any)
      .update({ enabled: false, secret: null, recovery_codes: null, enrolled_at: null })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    await audit({ actorId: userId, action: "mfa.disable", targetUserId: userId });
    return { ok: true };
  });
