import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    proxy: {
      // Local dev: same paths as Cloudflare Pages Functions in production.
      "/api/nvidia": {
        target: "https://integrate.api.nvidia.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nvidia/, ""),
      },
      // Local dev only — run `npm run search-proxy` with SERPER_API_KEY set,
      // or use `npm run pages:dev` to exercise Cloudflare Functions locally.
      "/api/search": {
        target: "http://127.0.0.1:8789",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/search/, "/search"),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/*.png", "theme-bootstrap.js"],
      manifest: {
        name: "Sightread",
        short_name: "Sightread",
        description: "AI agent and vision companion",
        theme_color: "#0064e0",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
});
