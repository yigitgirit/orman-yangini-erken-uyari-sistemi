import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

let envLoaded = false;

/**
 * Proje kökünden veya mevcut çalışma dizininden .env dosyasını otomatik yükler (Node.js yerleşik loadEnvFile).
 */
export function loadEnv(): void {
  if (envLoaded) return;
  envLoaded = true;

  const candidatePaths = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
    resolve(process.cwd(), "../.env"),
  ];

  for (const envPath of candidatePaths) {
    if (existsSync(envPath)) {
      try {
        process.loadEnvFile?.(envPath);
      } catch {
        // ignore
      }
      break;
    }
  }
}

// Modül yüklendiğinde otomatik çağır
loadEnv();
