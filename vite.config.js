import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { authPlugin } from "./server/http.js";

export default defineConfig({
  plugins: [react(), authPlugin()],
  server: {
    proxy: {
      "/standx-api": {
        target: "https://perps.standx.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/standx-api/, ""),
      },
    },
  },
});
