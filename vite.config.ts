/**
 * Vite Configuration File
 *
 * - Sets up the React plugin for Vite.
 * - Defines path aliases for cleaner imports.
 * - Configures a development proxy to forward API calls to the backend.
 */

import { defineConfig } from "vite";           // Core Vite config helper
import react from "@vitejs/plugin-react";     // Enables React Fast Refresh & JSX support
import path from "path";                      // Node.js path utility for resolving file paths

export default defineConfig({
  // Register Vite plugins
  plugins: [
    react(),  // React plugin: handles .jsx/.tsx transformation and HMR
  ],

  // Module resolution options
  resolve: {
    alias: {
      // Alias "@/some/path" to "<project root>/src/some/path"
      "@": path.resolve(__dirname, "src"),
    },
  },

  // Development server settings
  server: {
    proxy: {
      // Proxy any request starting with /api to the backend server
      "/api": {
        target: "http://localhost:4000", // Backend URL
        changeOrigin: true,              // Update the Origin header to the target URL
      },
    },
  },
});
