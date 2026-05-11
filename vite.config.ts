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

// On Vercel the preset is usually auto-detected; set explicitly so server-fn manifest
// matches the platform. Locally omit preset so `npm run start` still uses Node output.
const nitroOptions = process.env.VERCEL ? { preset: "vercel" as const } : {};

export default defineConfig({
  cloudflare: false,
  build: {
    // Default 500kb is tight for chart/Radix-heavy client chunks; warning-only.
    chunkSizeWarningLimit: 2000,
  },
  plugins: [nitro(nitroOptions)],
});
