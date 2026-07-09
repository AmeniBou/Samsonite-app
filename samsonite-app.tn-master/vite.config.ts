import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const useProxy = env.VITE_PS_PROXY_ENABLED === "true";
  const target = env.VITE_PS_API_URL
    ? env.VITE_PS_API_URL.trim().replace(/\/+$/, "").replace(/\/api$/i, "")
    : undefined;

  const expressServerUrl = `http://localhost:${env.VITE_ADMIN_SERVER_PORT || "3001"}`;

  const proxy: Record<string, string | { target: string; changeOrigin: boolean; secure: boolean; rewrite?: (path: string) => string }> = {
    // Proxy /api/* to the Express admin server
    "/api": {
      target: expressServerUrl,
      changeOrigin: true,
      secure: false,
    },
    // Proxy local images to the backend server so local DB image URLs can be served from server/public/images
    "/images": {
      target: expressServerUrl,
      changeOrigin: true,
      secure: false,
    },
  };

  // Keep the PrestaShop proxy for direct PS access (existing functionality)
  if (useProxy && target) {
    proxy["/prestashop-api"] = {
      target,
      changeOrigin: true,
      secure: true,
      rewrite: (requestPath: string) =>
        `/api${requestPath.replace(/^\/prestashop-api/, "")}`,
    };
  }

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
