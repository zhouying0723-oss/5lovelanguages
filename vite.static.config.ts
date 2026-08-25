import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "static",
  base: "/5lovelanguages/",
  plugins: [react()],
  build: {
    outDir: "../static-dist",
    emptyOutDir: true,
  },
});
