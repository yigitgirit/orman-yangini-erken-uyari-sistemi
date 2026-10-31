// MQTT kullanıcılarını hazırlar: .env'de şifre yoksa rastgele üretip ekler, sonra
// mosquitto/config/passwd dosyasını yazar (mosquitto_passwd ile aynı PBKDF2-SHA512 "$7$" biçimi).
// Hem Windows'taki mosquitto.exe hem Docker imajı bu dosyayı okur. passwd ve .env git'e girmez.
//
// Çalıştırma: pnpm mqtt:users   (scripts\_kontrol.cmd passwd yoksa kendisi çağırır)
// Şifre değiştirmek: .env'deki satırı değiştirip tekrar çalıştırın, sonra broker'ı yeniden başlatın.

import { pbkdf2Sync, randomBytes } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env");
const passwdPath = resolve(root, "mosquitto/config/passwd");

const USERS = [
  { username: "gateway", envKey: "MQTT_GATEWAY_PASSWORD" },
  { username: "backend", envKey: "MQTT_BACKEND_PASSWORD" },
] as const;

const PBKDF2_ITERATIONS = 101; // mosquitto_passwd varsayılanı

const envText = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const readEnv = (key: string) => envText.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim();

const added: string[] = [];
const lines = USERS.map(({ username, envKey }) => {
  let password = readEnv(envKey);
  if (!password) {
    // Yalnızca hex: CMD scriptlerinde kaçış derdi olmasın
    password = randomBytes(18).toString("hex");
    added.push(`${envKey}=${password}`);
  }
  const salt = randomBytes(12);
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, "sha512");
  return `${username}:$7$${PBKDF2_ITERATIONS}$${salt.toString("base64")}$${hash.toString("base64")}`;
});

if (added.length > 0) {
  const prefix = envText === "" || envText.endsWith("\n") ? "" : "\n";
  try {
    appendFileSync(
      envPath,
      `${prefix}\n# MQTT broker şifreleri (pnpm mqtt:users üretti)\n${added.join("\n")}\n`,
    );
    console.log(`[mqtt] .env dosyasına ${added.length} yeni şifre eklendi`);
  } catch (_e) {
    console.warn("[mqtt] .env dosyasına yazılamadı, lütfen elle ekleyin:", added.join(", "));
  }
}

writeFileSync(passwdPath, `${lines.join("\n")}\n`);
console.log(`[mqtt] ${passwdPath} yazıldı: ${USERS.map((u) => u.username).join(", ")}`);
console.log("[mqtt] Broker çalışıyorsa yeni şifreler için yeniden başlatın.");
