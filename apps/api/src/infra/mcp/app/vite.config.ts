import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const appDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(appDir, "ui"),
  plugins: [viteSingleFile()],
  resolve: {
    alias: {
      "@contract": path.join(appDir, "list-view-contract.ts"),
    },
  },
  build: {
    outDir: path.join(appDir, "ui-dist"),
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      input: path.join(appDir, "ui/index.html"),
    },
  },
});
