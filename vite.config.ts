// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
//
// Vercel: TanStack Start deploys via Nitro (not Cloudflare Workers). Disable the Cloudflare
// plugin for `vite build` and append the Nitro Vite plugin — see:
// https://vercel.com/docs/frameworks/full-stack/tanstack-start
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";
import type { Plugin } from "vite";
import { loadEnv } from "vite";

// On Vercel the preset is usually auto-detected; set explicitly so server-fn manifest
// matches the platform. Locally omit preset so `npm run start` still uses Node output.
const nitroOptions = process.env.VERCEL ? { preset: "vercel" as const } : {};

/**
 * Browser code only receives `import.meta.env.VITE_*` by default (see Lovable/Vite env loading).
 * Many hosts set plain `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`; map those into VITE_* for the client bundle.
 */
function supabaseBrowserEnvBridge(): Plugin {
  return {
    name: "supabase-browser-env-bridge",
    enforce: "pre",
    config(_, { mode }) {
      const fromFiles = loadEnv(mode, process.cwd(), ["VITE_", "SUPABASE_"]);
      const url =
        process.env.VITE_SUPABASE_URL?.trim() ||
        fromFiles.VITE_SUPABASE_URL?.trim() ||
        process.env.SUPABASE_URL?.trim() ||
        fromFiles.SUPABASE_URL?.trim() ||
        "";
      const publishable =
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
        fromFiles.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
        process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
        fromFiles.SUPABASE_PUBLISHABLE_KEY?.trim() ||
        "";
      return {
        define: {
          "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(url),
          "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publishable),
        },
      };
    },
  };
}

export default defineConfig({
  cloudflare: false,
  plugins: [nitro(nitroOptions)],
  vite: {
    build: {
      chunkSizeWarningLimit: 2000,
    },
    plugins: [supabaseBrowserEnvBridge()],
  },
});
