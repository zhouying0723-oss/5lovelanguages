import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "static",
  base: "/5lovelanguages/",
  plugins: [react()],
  build: {
    outDir: "../static-dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "static/index.html",
        admin: "static/admin/index.html",
      },
    },
  },
});
