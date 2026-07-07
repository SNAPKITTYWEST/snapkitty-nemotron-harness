import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? "/snapkitty-nemotron-harness/" : "/",
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
