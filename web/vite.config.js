import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // Build straight into server/static (instead of the default web/dist) so
  // server.js can serve the built client straight out of its own directory -
  // no separate copy step needed.
  build: { outDir: "../server/static", emptyOutDir: true },
});
