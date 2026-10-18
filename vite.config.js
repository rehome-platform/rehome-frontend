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
        target: "https://re-backend-9a98.onrender.com",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "https://re-backend-9a98.onrender.com",
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
