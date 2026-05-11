/**
 * Bearer auth for Nitro/API route handlers. Avoid calling `createServerFn()` wrappers
 * from `/api/**` handlers (TanStack resolves them by hashed ID; production builds can lose
 * the mapping and throw "Server function info not found for …").
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  resolveSupabasePublishableKeyForServer,
  resolveSupabaseUrlForServer,
} from "@/server/supabase-server-env";

export async function requireUserIdFromRequest(request: Request): Promise<string> {
  const SUPABASE_URL = resolveSupabaseUrlForServer();
  const SUPABASE_PUBLISHABLE_KEY = resolveSupabasePublishableKeyForServer();

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Authentication service unavailable");
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) throw new Error("Unauthorized");

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Error("Unauthorized");
  return data.claims.sub;
}
