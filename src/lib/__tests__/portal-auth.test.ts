import { describe, it, expect, vi } from "vitest";
import {
  ensurePortalRole,
  formatPortalAuthError,
  resolvePortalRedirect,
  isSafeInternalPath,
  type RoleClient,
} from "@/lib/portal-auth";

/**
 * Build a mock supabase-like client for the user_roles table.
 *
 * @param existingRoles roles already in the table for the user
 * @param insertResult  what `.insert()` should return
 * @param selectError   optional error to surface from `.select().eq()`
 */
function makeClient(opts: {
  existingRoles?: string[];
  insertResult?: { error: { code?: string; message: string } | null };
  selectError?: { message: string };
}) {
  const insert = vi
    .fn()
    .mockResolvedValue(opts.insertResult ?? { error: null });
  const eq = vi.fn().mockResolvedValue({
    data: opts.selectError ? null : (opts.existingRoles ?? []).map((r) => ({ role: r })),
    error: opts.selectError ?? null,
  });
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select, insert }));
  const client = { from } as unknown as RoleClient;
  return { client, from, select, eq, insert };
}

describe("ensurePortalRole — regression guard against auth login loop", () => {
  it("returns 'admin' when user has the admin role", async () => {
    const { client, insert } = makeClient({ existingRoles: ["admin", "investor"] });
    const role = await ensurePortalRole(client, "user-1");
    expect(role).toBe("admin");
    // Must NOT attempt to self-insert when a role already exists.
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns 'investor' when user has only the investor role", async () => {
    const { client, insert } = makeClient({ existingRoles: ["investor"] });
    const role = await ensurePortalRole(client, "user-2");
    expect(role).toBe("investor");
    expect(insert).not.toHaveBeenCalled();
  });

  it("self-provisions 'investor' when user has no roles (prevents loading-loop)", async () => {
    const { client, insert } = makeClient({ existingRoles: [] });
    const role = await ensurePortalRole(client, "user-3");
    expect(role).toBe("investor");
    expect(insert).toHaveBeenCalledWith({ user_id: "user-3", role: "investor" });
  });

  it("treats unique-violation (23505) on insert as success — handles concurrent provisioning", async () => {
    const { client } = makeClient({
      existingRoles: [],
      insertResult: { error: { code: "23505", message: "duplicate key" } },
    });
    const role = await ensurePortalRole(client, "user-4");
    expect(role).toBe("investor");
  });

  it("throws when reading roles fails (so the UI surfaces an error instead of looping)", async () => {
    const { client } = makeClient({ selectError: { message: "rls denied" } });
    await expect(ensurePortalRole(client, "user-5")).rejects.toThrow("rls denied");
  });

  it("throws on a non-unique-violation insert error", async () => {
    const { client } = makeClient({
      existingRoles: [],
      insertResult: { error: { code: "42501", message: "permission denied" } },
    });
    await expect(ensurePortalRole(client, "user-6")).rejects.toThrow("permission denied");
  });

  it("prefers admin even when listed after investor", async () => {
    const { client } = makeClient({ existingRoles: ["investor", "admin"] });
    expect(await ensurePortalRole(client, "user-7")).toBe("admin");
  });
});

describe("resolvePortalRedirect — post-login redirect routing", () => {
  it("admins land on /portal/admin by default", () => {
    expect(resolvePortalRedirect("admin")).toBe("/portal/admin");
  });

  it("investors land on /portal/investor by default", () => {
    expect(resolvePortalRedirect("investor")).toBe("/portal/investor");
  });

  it("honors a safe internal redirect query param", () => {
    expect(resolvePortalRedirect("investor", "/portal/investor/portfolio")).toBe(
      "/portal/investor/portfolio",
    );
  });

  it("ignores null/empty redirect", () => {
    expect(resolvePortalRedirect("admin", null)).toBe("/portal/admin");
    expect(resolvePortalRedirect("admin", "")).toBe("/portal/admin");
  });

  it("ignores external URLs to prevent open-redirect", () => {
    expect(resolvePortalRedirect("admin", "https://evil.example.com")).toBe("/portal/admin");
    expect(resolvePortalRedirect("investor", "//evil.example.com")).toBe("/portal/investor");
  });

  it("ignores non-rooted paths", () => {
    expect(resolvePortalRedirect("investor", "portal/investor")).toBe("/portal/investor");
  });
});

describe("isSafeInternalPath", () => {
  it.each([
    ["/portal/admin", true],
    ["/portal/investor/kyc", true],
    ["/", true],
    ["", false],
    ["//evil.com", false],
    ["https://evil.com", false],
    ["javascript:alert(1)", false],
    ["portal/investor", false],
  ])("isSafeInternalPath(%j) === %s", (path, expected) => {
    expect(isSafeInternalPath(path as string)).toBe(expected);
  });
});

describe("formatPortalAuthError", () => {
  it("explains email verification when the account is not confirmed", () => {
    expect(formatPortalAuthError("Email not confirmed")).toContain("verify your email");
  });

  it("converts the has_role permission regression into retry guidance", () => {
    expect(formatPortalAuthError("permission denied for function has_role")).toBe(
      "Portal access is being updated. Please try signing in again.",
    );
  });

  it("keeps unknown errors visible", () => {
    expect(formatPortalAuthError("Something unexpected happened")).toBe(
      "Something unexpected happened",
    );
  });
});
