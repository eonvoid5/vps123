import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  esbuild: { jsx: "automatic", target: "es2022" },
  server: {
    port: 6969,
    host: "0.0.0.0",
    allowedHosts: ["panel.voidhost.indevs.in", "localhost", "127.0.0.1"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:6968",
        changeOrigin: true
      }
    }
  }
});
