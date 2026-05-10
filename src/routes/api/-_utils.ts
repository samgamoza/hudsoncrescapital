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
    return Response.json({ error: "Invalid request payload", details: error.flatten() }, { status: 400 });
  }

  const message = error instanceof Error ? error.message : String(error);
  if (message.toLowerCase().includes("forbidden")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("invalid token")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (
    message.toLowerCase().includes("not found") ||
    message.toLowerCase().includes("already reviewed") ||
    message.toLowerCase().includes("insufficient")
  ) {
    return Response.json({ error: message }, { status: 400 });
  }

  console.error("[api]", message);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
