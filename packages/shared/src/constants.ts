// Sistem genelinde paylaşılan sabitler (port, MQTT konuları, analiz eşikleri, emisyon modeli).

const env = typeof process !== "undefined" && process?.env ? process.env : {};

/** Sensör -> Gateway UDP portu */
export const UDP_PORT = env.UDP_PORT ? Number(env.UDP_PORT) : 5005;
export const UDP_HOST = env.UDP_HOST ?? "127.0.0.1";

/** Mosquitto (docker-compose.yml) */
export const MQTT_URL = env.MQTT_URL ?? "mqtt://localhost:1883";

/** Servis başına MQTT hesabı (yetkiler: mosquitto/config/acl, şifreler: .env -> pnpm mqtt:users) */
export const MQTT_CREDENTIALS = {
  gateway: { username: "gateway", password: env.MQTT_GATEWAY_PASSWORD },
  backend: { username: "backend", password: env.MQTT_BACKEND_PASSWORD },
} as const;

/** Backend -> Web WebSocket portu */
export const WS_PORT = env.WS_PORT ? Number(env.WS_PORT) : 8080;

/** MQTT konu şablonları: sensors/{id}/telemetry */
export const MQTT_TOPICS = {
  telemetry: (nodeId: number) => `sensors/${nodeId}/telemetry`,
  telemetryWildcard: "sensors/+/telemetry",
} as const;

/** Hiyerarşik ölçüm: normal modda seyrek, alarm modunda sık gönderim (ms) */
export const SENSOR_INTERVAL_MS = {
  normal: 5000,
  alert: 1000,
} as const;

/** Backend kayan pencere süresi: son 5 dakika */
export const SLIDING_WINDOW_MS = 5 * 60 * 1000;

/** Türev (regresyon eğimi) penceresi: son 2 dakika */
export const SLOPE_WINDOW_MS = 2 * 60 * 1000;

/** Komşu doğrulaması için en fazla mesafe (m) - ızgarada çapraz komşuları da kapsar */
export const NEIGHBOR_RADIUS_M = 300;

/**
 * Taban seviye (EWMA) ayarları. Taban yalnızca düğüm "temiz" iken güncellenir,
 * böylece yavaş gelişen bir yangın tabanı kendine çekemez.
 */
export const BASELINE = {
  warmupSamples: 10, // İlk N ölçüm düz ortalama
  alpha: 0.02, // EWMA katsayısı
  // Gürültü tabanı: σ bu değerden küçük kabul edilmez (yanlış alarm önlemi)
  minStd: { temperature: 0.3, humidity: 1.5, co: 0.15, co2: 5, vocIndex: 6, pm25: 3 },
} as const;

/**
 * Analiz eşikleri. Makalelerdeki ilkelere göre başlangıç değerleri:
 * - Mutlak eşik yerine tabandan sapma (z-skoru) + regresyonla türev
 * - CO/CO2 oranı (MCE) evre ayrımı: ~0.8 için için yanma, ~0.99 alevli yanma
 */
export const THRESHOLDS = {
  zScore: 3, // Sinyal ailesi anomali eşiği
  coDeltaPpm: 2, // CO tabandan en az bu kadar artmalı
  pm25DeltaUgm3: 25,
  co2DeltaFlamingPpm: 150, // Alevli yanma için CO2 artışı
  co2RateFlamingPpmMin: 50, // ... ve hızlı artış (ppm/dk)
  tempRateFlamingCMin: 1, // Sıcaklık artış hızı (°C/dk)
  mceSmolderingMax: 0.9,
  mceFlamingMin: 0.95,
  activeFireTempC: 65, // Mutlak: sensörde > 65 °C => kesin alevli yangın
  activeFireCoPpm: 60, // Mutlak: CO > 60 ppm => kesin yangın
  riskTempC: 30,
  riskHumidity: 30,
  riskVpdKpa: 2.5,
  lowBattery: 20, // %
} as const;

/** Yeşil etki (CO2) modeli */
export const CO2_MODEL = {
  lateResponseMinutes: 45,
  lateResponseHectareLoss: 3.5,
  co2TonsPerHectare: 180,
} as const;

/** Kurtarılan Alan x 180 = Engellenen CO2 Tonajı */
export const preventedCo2Tons = (savedHectares: number): number =>
  savedHectares * CO2_MODEL.co2TonsPerHectare;
