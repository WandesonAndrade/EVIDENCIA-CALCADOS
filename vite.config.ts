import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      proxy: {
        "/mp-api": {
          target: "https://api.mercadopago.com/v1",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/mp-api/, ""),
        },
        "/api": {
          target: "https://api.evidenciacalcados.com.br/api/v1/",
          changeOrigin: true,
        },
        "/v1": {
          target: "https://api.evidenciacalcados.com.br/api/v1/",
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === "true" ? null : {
        ignored: ["**/.pix_cache.json", "**/*.json"]
      },
    },
  };
});
