// Sistem genelinde paylaşılan sabitler (port, MQTT konuları, emisyon modeli).
import "./env.ts";

/** Sensör -> Gateway UDP portu */
export const UDP_PORT = process.env.UDP_PORT ? Number(process.env.UDP_PORT) : 5005;
export const UDP_HOST = process.env.UDP_HOST ?? "127.0.0.1";

/** Mosquitto (docker-compose.yml) */
export const MQTT_URL = process.env.MQTT_URL ?? "mqtt://localhost:1883";

/** Backend -> Web WebSocket portu */
export const WS_PORT = process.env.WS_PORT ? Number(process.env.WS_PORT) : 8080;

/** MQTT konu şablonları: sensors/{id}/telemetry */
export const MQTT_TOPICS = {
  telemetry: (nodeId: number) => `sensors/${nodeId}/telemetry`,
  telemetryWildcard: "sensors/+/telemetry",
} as const;

/** Sensör gönderim aralığı (ms) */
export const SENSOR_INTERVAL_MS = 2000;

/** Backend kayan pencere süresi: son 5 dakika */
export const SLIDING_WINDOW_MS = 5 * 60 * 1000;

/** Alarm eşikleri (GENEL_PLAN §3) — göstermelik değerler */
export const THRESHOLDS = {
  smolderingCoPpm: 60, // CO > 60 ppm + hızlı sapma => Sarı (Tütme)
  activeFireTempC: 65, // Sıcaklık > 65 °C => Kırmızı (Aktif Yangın)
} as const;

/** Yeşil etki (CO2) modeli (GENEL_PLAN §3) */
export const CO2_MODEL = {
  lateResponseMinutes: 45,
  lateResponseHectareLoss: 3.5,
  co2TonsPerHectare: 180,
} as const;

/** Kurtarılan Alan x 180 = Engellenen CO2 Tonajı */
export const preventedCo2Tons = (savedHectares: number): number =>
  savedHectares * CO2_MODEL.co2TonsPerHectare;
