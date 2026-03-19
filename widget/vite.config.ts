import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.jsx"),
      name: "RentCoreWidget",
      // Force filename to exactly "embed.js" regardless of format suffix
      fileName: () => "embed.js",
      formats: ["iife"],
    },
    rollupOptions: {
      // Bundle everything. No externals. The embed.js must be self-contained.
      external: [],
      output: {
        // Inline CSS into the JS bundle via Rollup asset inlining
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "style.css") return "embed.css";
          return assetInfo.name ?? "asset";
        },
      },
    },
    target: "es2020",
    minify: "esbuild",
    // Output to public/widget/. Next.js / Vercel serves this as a static asset at /widget/embed.js
    outDir: "../public/widget",
    emptyOutDir: true,
    // Inline CSS into JS instead of emitting a separate file
    cssCodeSplit: false,
  },
});
