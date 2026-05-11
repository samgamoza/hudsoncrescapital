import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { requireMinRole } from "@/server/_shared.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function mockUserRoles(roles: string[]) {
  const eq = vi.fn().mockResolvedValue({
    data: roles.map((role) => ({ role })),
    error: null,
  });
  const select = vi.fn(() => ({ eq }));
  vi.mocked(supabaseAdmin.from).mockReturnValue({ select } as never);
}

describe("requireMinRole (manual execution permission gate)", () => {
  beforeEach(() => {
    vi.mocked(supabaseAdmin.from).mockReset();
  });

  it("rejects investor-only callers for support minimum (cannot run fills)", async () => {
    mockUserRoles(["investor"]);
    await expect(requireMinRole("user-1", "support")).rejects.toThrow(/staff access/i);
  });

  it("allows explicit support role alongside investor", async () => {
    mockUserRoles(["investor", "support"]);
    const roles = await requireMinRole("user-2", "support");
    expect(roles).toContain("support");
  });

  it("allows admin for support minimum", async () => {
    mockUserRoles(["admin"]);
    await expect(requireMinRole("user-3", "support")).resolves.toContain("admin");
  });

  it("rejects support for admin minimum", async () => {
    mockUserRoles(["support"]);
    await expect(requireMinRole("user-4", "admin")).rejects.toThrow(/admin access/i);
  });
});
