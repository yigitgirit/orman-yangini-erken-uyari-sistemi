import { execSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerInstance {
  httpServer: http.Server | https.Server;
  isTls: boolean;
}

/**
 * TLS / HTTPS veya HTTP sunucusunu yapılandırır ve başlatır.
 * Ortam değişkeni: USE_TLS (varsayılan: true).
 */
export function createBackendServer(): ServerInstance {
  const useTls = process.env.USE_TLS !== "false";

  if (!useTls) {
    const httpServer = http.createServer();
    return { httpServer, isTls: false };
  }

  const certDir = path.resolve(__dirname, "../certs");
  const certPath = process.env.SSL_CERT_PATH ?? path.join(certDir, "cert.pem");
  const keyPath = process.env.SSL_KEY_PATH ?? path.join(certDir, "key.pem");

  // Sertifika mevcut değilse geliştirme ortamı için otomatik üret
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.log("[backend] TLS sertifikaları bulunamadı, yerel sertifika üretiliyor...");
    fs.mkdirSync(certDir, { recursive: true });
    execSync(
      `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=localhost"`,
      { stdio: "pipe" },
    );
  }

  const cert = fs.readFileSync(certPath);
  const key = fs.readFileSync(keyPath);

  const httpsServer = https.createServer({ cert, key });
  return { httpServer: httpsServer, isTls: true };
}
