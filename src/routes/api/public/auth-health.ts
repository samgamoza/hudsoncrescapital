import { createFileRoute } from "@tanstack/react-router";
import {
  resolveSupabasePublishableKeyForServer,
  resolveSupabaseUrlForServer,
} from "@/server/supabase-server-env";

export const Route = createFileRoute("/api/public/auth-health")({
  server: {
    handlers: {
      GET: async () => {
        const diagnosticsEnabled = process.env.PUBLIC_STATUS_ENDPOINTS_ENABLED === "true";
        if (!diagnosticsEnabled) {
          return Response.json({
            ok: false,
            diagnosticsEnabled: false,
            message:
              "Public diagnostics are disabled. Set PUBLIC_STATUS_ENDPOINTS_ENABLED=true on the server to expose Supabase env checks (no secrets are returned).",
          });
        }

        const serverUrl = resolveSupabaseUrlForServer();
        let serverRef = "unknown";
        try {
          if (serverUrl) serverRef = new URL(serverUrl).hostname.split(".")[0] || "unknown";
        } catch {
          serverRef = "invalid-url";
        }
        const serverPublishable = resolveSupabasePublishableKeyForServer();

        return Response.json({
          ok: true,
          diagnosticsEnabled: true,
          env: {
            server: {
              projectRef: serverRef,
              supabaseUrlPresent: Boolean(serverUrl),
              publishableKeyPresent: Boolean(serverPublishable),
            },
            client: {
              projectRef: process.env.VITE_SUPABASE_URL
                ? (() => {
                    try {
                      return new URL(process.env.VITE_SUPABASE_URL).hostname.split(".")[0] || "—";
                    } catch {
                      return "—";
                    }
                  })()
                : "unknown",
              supabaseUrlPresent: Boolean(process.env.VITE_SUPABASE_URL?.trim()),
              publishableKeyPresent: Boolean(process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()),
            },
          },
        });
      },
    },
  },
});
