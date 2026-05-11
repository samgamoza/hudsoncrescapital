import { ZodError } from "zod";

const ipWindowHits = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = ipWindowHits.get(key);
  if (!current || current.resetAt <= now) {
    ipWindowHits.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (current.count >= opts.limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  ipWindowHits.set(key, current);
  return { ok: true, retryAfterSeconds: 0 };
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Response("Invalid JSON payload", { status: 400 });
  }
}

export function apiErrorResponse(error: unknown): Response {
  if (error instanceof Response) return error;
  if (error instanceof ZodError) {
    return Response.json(
      { error: "Invalid request payload", details: error.flatten() },
      { status: 400 },
    );
  }

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  // TanStack server-fn manifest mismatch — do not treat as generic "not found" (400).
  if (lower.includes("server function info not found")) {
    console.error("[api]", message);
    return Response.json(
      {
        error: "Internal server error",
        hint: "Server function wiring mismatch. Use plain *ForApi handlers for /api routes instead of createServerFn().",
      },
      { status: 500 },
    );
  }

  if (lower.includes("forbidden")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (lower.includes("unauthorized") || lower.includes("invalid token")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (
    lower.includes("not found") ||
    lower.includes("already reviewed") ||
    lower.includes("insufficient")
  ) {
    return Response.json({ error: message }, { status: 400 });
  }

  if (lower.includes("missing supabase environment variable")) {
    console.error("[api]", message);
    return Response.json(
      {
        error: "Server configuration",
        hint: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for server API routes (Dashboard → API → service_role secret). Anon/publishable keys are not sufficient for admin queries.",
      },
      { status: 503 },
    );
  }

  if (
    lower.includes("does not exist") &&
    (lower.includes("relation") || lower.includes("table") || lower.includes("asset_listings"))
  ) {
    console.error("[api]", message);
    return Response.json(
      {
        error: "Database schema",
        hint: "The asset_listings table (or a referenced object) is missing or not exposed. Apply migrations from supabase/migrations to your Supabase project, then refresh the schema cache if needed.",
      },
      { status: 503 },
    );
  }

  if (lower.includes("schema cache") && lower.includes("reload")) {
    console.error("[api]", message);
    return Response.json(
      {
        error: "Database schema",
        hint: "PostgREST schema cache may be stale. In Supabase Dashboard try Database → API → Reload schema, or wait a minute and retry.",
      },
      { status: 503 },
    );
  }

  console.error("[api]", message);
  const isDev =
    process.env.NODE_ENV === "development" ||
    (typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV));
  const body: { error: string; details?: string } = { error: "Internal server error" };
  if (isDev) body.details = message;
  return Response.json(body, { status: 500 });
}
