import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

function copyPanelAssets() {
  return {
    name: "void-host-panel-assets",
    closeBundle() {
      const root = process.cwd();
      const out = path.resolve(root, "dist");
      const files = [
        "void-enhancements.js",
        "void-hotfix.js",
        "ptero-tools.js",
        "node-tools.js",
        "ui-role-layout.js",
        "user-tools.js",
        "my-servers-stability.js",
        "my-servers-fix.js",
        "remove-loading.js"
      ];
      for (const file of files) {
        const src = path.resolve(root, file);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(out, file));
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), copyPanelAssets()],
  esbuild: {
    jsx: "automatic",
    target: "es2022"
  },
  server: {
    port: 6969,
    host: "0.0.0.0",
    allowedHosts: ["panel.voidhost.indevs.in", "localhost", "127.0.0.1"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:6768",
        changeOrigin: true
      }
    }
  }
});
