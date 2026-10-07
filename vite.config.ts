import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The stylesheet is inlined into every page, so keep the portrait shadow images out of it.
    assetsInlineLimit: (file) => (file.includes("/portrait-shadows/") ? false : undefined),
  },
});
