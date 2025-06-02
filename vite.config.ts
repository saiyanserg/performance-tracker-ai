import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // proxy any /api/* request to localhost:4000
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
})
