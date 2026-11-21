
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "window",
  },
  build: {
    target: "es2020",
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/") ||
            id.includes("node_modules/react-router/") ||
            id.includes("node_modules/react-router-dom/") ||
            id.includes("node_modules/@remix-run/router/")
          ) {
            return "react-vendor";
          }
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "https://rehome-a4gae8cqhvf7cmd8.eastasia-01.azurewebsites.net",
        changeOrigin: true,
        secure: true,
      },
      "/ws": {
        target: "https://rehome-a4gae8cqhvf7cmd8.eastasia-01.azurewebsites.net",
        ws: true,
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
