/**
 * Server routes often run with only VITE_* vars in .env (browser bridge in vite.config).
 * Mirror that here so admin client and Bearer auth work without duplicating plain SUPABASE_*.
 */
export function resolveSupabaseUrlForServer(): string {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    ""
  );
}

export function resolveSupabasePublishableKeyForServer(): string {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    ""
  );
}
