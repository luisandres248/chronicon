import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => {
  const isCapacitorBuild = process.env.VITE_CAPACITOR === "true";
  const plugins = [react()];

  if (!isCapacitorBuild) {
    plugins.push(
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg"],
        manifest: {
          name: "Chronicon",
          short_name: "Chronicon",
          description: "Offline-first personal event tracking.",
          theme_color: "#29628b",
          background_color: "#e1e1df",
          display: "standalone",
          icons: [
            {
              src: "favicon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
          ],
        },
      })
    );
  }

  return {
    plugins,
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("react-router")) {
                return "router";
              }
              if (id.includes("i18next")) {
                return "i18n";
              }
              if (id.includes("date-fns") || id.includes("rrule")) {
                return "date-utils";
              }
              if (id.includes("react") || id.includes("scheduler")) {
                return "react-vendor";
              }
              return "vendor";
            }
          },
        },
      },
    },
  };
});
