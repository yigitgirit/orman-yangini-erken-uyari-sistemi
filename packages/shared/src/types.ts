// Uygulamalar arası JSON veri şemaları (göstermelik).
import type { PyrosFrame } from "./protocol.ts";

/** Gateway -> MQTT (sensors/{id}/telemetry) yükü */
export interface TelemetryMessage extends PyrosFrame {
  receivedAt: string; // ISO 8601, gateway alım zamanı
}

/** Risk seviyeleri (enum yerine `as const`) */
export const RiskLevel = {
  Green: "green", // Normal
  Yellow: "yellow", // Tütme anomalisi
  Red: "red", // Aktif yangın
} as const;
export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

/** Backend'in her düğüm için hesapladığı risk durumu */
export interface NodeRisk {
  nodeId: number;
  score: number; // 0-100 anomali skoru
  level: RiskLevel;
  tempRate: number; // °C/dk (kayan pencere türevi)
  coRate: number; // ppm/dk (kayan pencere türevi)
  updatedAt: string;
}

/** Backend -> Web WebSocket mesajları (discriminated union) */
export type WsMessage =
  | { type: "telemetry"; data: TelemetryMessage }
  | { type: "risk"; data: NodeRisk }
  | { type: "impact"; data: { savedHectares: number; preventedCo2Tons: number } };
