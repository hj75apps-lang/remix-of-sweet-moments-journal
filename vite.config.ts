// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// `bun run build:android` sets CAPACITOR_BUILD=1: emits a static index.html shell in
// dist/client so Capacitor can package the app offline. The web build stays unchanged.
const android = process.env["CAPACITOR_BUILD"] === "1";

export default defineConfig({
  // Android build runs on Node so the shell can be prerendered locally.
  ...(android ? { nitro: { preset: "node-server" } } : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    ...(android ? { spa: { enabled: true, prerender: { outputPath: "/index.html" } } } : {}),
  },
});
