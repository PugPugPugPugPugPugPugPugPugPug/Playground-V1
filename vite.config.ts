import { vlyPlugin } from "@vly-ai/integrations";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, type Plugin } from "vite";
import { copyFileSync, existsSync } from "node:fs";

/**
 * GitHub Pages serves static files with no rewrite rules, so a deep link like
 * /games returns 404. Its documented workaround is to publish a copy of
 * index.html as 404.html: the server serves it for the missing path and the
 * client-side router picks the route up from the URL.
 */
function githubPagesFallback(): Plugin {
  return {
    name: "github-pages-fallback",
    apply: "build",
    closeBundle() {
      const outDir = path.resolve(__dirname, "dist");
      const index = path.join(outDir, "index.html");
      if (!existsSync(index)) return;
      copyFileSync(index, path.join(outDir, "404.html"));
    },
  };
}

// https://vite.dev/config/
// Where the app itself is served: "/" at a site root, or "/<repo>/" on a
// GitHub Pages project site.
const APP_BASE = process.env.PAGES_BASE ?? "/";

// Where the static files are fetched from. Usually the same origin, but it may
// be an absolute CDN URL. jsDelivr is the intended case: it will happily serve
// the hashed bundles, the Scramjet runtime and the vendored games, but it
// serves .html as text/plain, so index.html and sw.js still have to come from
// the app's own origin. Everything Vite emits -- and the %BASE_URL%
// references in index.html -- follows this value.
const ASSET_BASE = process.env.ASSET_BASE ?? APP_BASE;

// Expose it to the client so the app can tell the service worker where to find
// the controller. Vite reads process.env when it builds import.meta.env, so
// setting it here is enough.
process.env.VITE_ASSET_BASE = ASSET_BASE;

export default defineConfig({
  base: ASSET_BASE,
  plugins: [react(), vlyPlugin(), tailwindcss(), githubPagesFallback()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Force a single copy of React across all packages (including vlyPlugin).
    // Without this, @vly-ai/integrations can resolve its own React copy, which
    // triggers "Invalid hook call" errors at runtime.
    dedupe: ["react", "react/jsx-runtime", "react-dom", "react-dom/client"],
  },
  build: {
    // Enable source maps for better debugging (disable in production if needed)
    sourcemap: false,
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching and lazy loading
        manualChunks: {
          // Vendor chunks for large libraries
          'react-vendor': ['react', 'react-dom', 'react-router'],
          // Large UI library chunks
          'radix-ui': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip',
          ],          // Heavy optional libraries - separate chunks for better lazy loading
          'framer-motion': ['framer-motion'],
        },
        // Optimize chunk size
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Increase chunk size warning limit for better chunking
    chunkSizeWarningLimit: 1000,
    // Target modern browsers for better optimization
    target: 'esnext',
    // Minify options - using esbuild (faster than terser)
    minify: 'esbuild',
  },
  // Optimize dependencies
  optimizeDeps: {
    // Only scan the app entry HTML; avoids crawling unrelated *.html files
    // if a legacy snapshot accidentally contains leaked package folders.
    entries: ['index.html'],
    include: [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      'react-router',
      '@convex-dev/auth/react',
      'framer-motion',
      // vlyPlugin() injects this import at serve time, so the dep scanner
      // never sees it. Without it here the first page load discovers it,
      // re-optimizes and full-reloads the preview mid-screenshot.
      '@vly-ai/integrations',
    ],
  },
  // Performance hints
  server: { allowedHosts: true,
    // Bind to all interfaces so the browser runtime's server-ready event fires.
    host: true,
    port: 5173,
    // Keep HMR on, but disable full-screen error overlay
    hmr: {
      overlay: false,
    },
  },
});
