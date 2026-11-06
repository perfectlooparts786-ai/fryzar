import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "apps/admin",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      }
    }
  },
  preview: {
    host: "0.0.0.0",
    port: 4174,
    strictPort: true
  },
  build: {
    outDir: "../../dist/admin",
    emptyOutDir: true,
    sourcemap: false
  }
});
