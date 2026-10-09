import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "https://prm393.up.railway.app",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "https://prm393.up.railway.app",
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
