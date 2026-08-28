import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 6767,
    allowedHosts: ["panel.voidhost.indevs.in", "localhost", "127.0.0.1"],
  },
});