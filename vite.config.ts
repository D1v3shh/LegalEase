// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// loadEnv reads .env, .env.local, .env.development, etc. — just like Vite
// does internally. process.env alone does NOT include values from those files,
// which caused the proxy to always fall back to http://localhost:8000.
const env = loadEnv("development", process.cwd(), "VITE_");
const API_URL = env["VITE_API_URL"] ?? "http://localhost:8000";

export default defineConfig({
  vite: {
    server: {
      // Proxy /api/* to the real backend so the browser makes same-origin
      // requests (no CORS needed during local development).
      // Example: GET /api/documents → GET https://72szyehth6.../documents
      proxy: {
        "/api": {
          target: API_URL,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, ""),
        },
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
