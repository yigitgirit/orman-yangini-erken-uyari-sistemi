import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Kök .env (USE_TLS, WS_PORT) backend ile aynı ayarları okur
  const env = { ...loadEnv(mode, resolve(__dirname, "../.."), ""), ...process.env };

  // Tarayıcı backend'e Vite üzerinden (/ws) bağlanır: tarayıcılar kendinden imzalı sertifikalı
  // wss:// bağlantısını sessizce reddeder. Backend'e TLS bağlantısını Vite (Node) kurar.
  const backendWs = `${env.USE_TLS === "false" ? "ws" : "wss"}://localhost:${env.WS_PORT ?? "8080"}`;
  const backendHttp = `${env.USE_TLS === "false" ? "http" : "https"}://localhost:${env.WS_PORT ?? "8080"}`;
  const proxy = {
    "/ws": { target: backendWs, ws: true, secure: false, changeOrigin: true },
    "/api": { target: backendHttp, secure: false, changeOrigin: true },
  };

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy,
    },
    preview: { proxy },
  };
});
