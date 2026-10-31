// Yönetici Kimlik Doğrulama ve Oturum Yönetimi
// 8 saatlik oturum token'ı, 5 hatalı denemede 30 saniye kilitlenme koruması

import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ADMIN_USER = process.env.ADMIN_USERNAME ?? "admin";
let adminPass = process.env.ADMIN_PASSWORD;

// Eğer .env içinde ADMIN_PASSWORD tanımlı değilse, oluştur ve .env'ye ekle
if (!adminPass) {
  const envPath = resolve(process.cwd(), ".env");
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf8");
    const match = envContent.match(/^ADMIN_PASSWORD=(.+)$/m);
    if (match) {
      adminPass = match[1].trim();
    } else {
      adminPass = "admin123";
      try {
        appendFileSync(envPath, `\nADMIN_PASSWORD=${adminPass}\n`);
      } catch {
        // Dosya salt-okunur ise yoksay
      }
    }
  } else {
    adminPass = "admin123";
  }
}

console.log(`🔐 [auth] Yönetici Girişi Aktif -> Kullanıcı: ${ADMIN_USER} | Şifre: ${adminPass}`);

// Hatalı giriş kilitlenme mekanizması
let failedAttempts = 0;
let lockUntil = 0;

// Aktif token -> Bitiş zamanı (ms)
const activeSessions = new Map<string, number>();

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 saat
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 1000; // 30 saniye

export function authenticateAdmin(
  user: string,
  pass: string,
): { success: boolean; token?: string; error?: string } {
  const now = Date.now();

  // Kilit süresi kontrolü
  if (now < lockUntil) {
    const remainingSec = Math.ceil((lockUntil - now) / 1000);
    return {
      success: false,
      error: `Çok fazla hatalı deneme yapıldı. Giriş ${remainingSec} saniye kilitlendi.`,
    };
  }

  if (user === ADMIN_USER && pass === adminPass) {
    failedAttempts = 0;
    const token = randomUUID();
    activeSessions.set(token, now + SESSION_TTL_MS);
    return { success: true, token };
  }

  failedAttempts++;
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    lockUntil = now + LOCK_DURATION_MS;
    failedAttempts = 0;
    return {
      success: false,
      error: `5 hatalı deneme yapıldı. Sistem 30 saniye kilitlendi.`,
    };
  }

  return {
    success: false,
    error: `Hatalı kullanıcı adı veya şifre (${failedAttempts}/${MAX_FAILED_ATTEMPTS})`,
  };
}

export function isSessionValid(token: string): boolean {
  if (!token) return false;
  const expiresAt = activeSessions.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}
