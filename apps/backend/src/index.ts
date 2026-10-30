// Katman 3: Çekirdek İş Mantığı (Backend Analiz Motoru)
// MQTT sensors/+/telemetry -> 5 dk kayan pencere -> risk skoru (0-100) -> WebSocket :8080
//
// Çalıştırma: pnpm dev:backend  (önce: pnpm broker:up)

import {
  MQTT_TOPICS,
  MQTT_URL,
  type NodeRisk,
  RiskLevel,
  SLIDING_WINDOW_MS,
  type TelemetryMessage,
  THRESHOLDS,
  WS_PORT,
  type WsMessage,
} from "@pyros/shared";
import mqtt from "mqtt";
import { WebSocket, WebSocketServer } from "ws";

// --- WebSocket sunucusu -------------------------------------------------------
const wss = new WebSocketServer({ port: WS_PORT });
wss.on("listening", () => console.log(`[backend] WebSocket dinleniyor: ws://localhost:${WS_PORT}`));

function broadcast(message: WsMessage): void {
  const payload = JSON.stringify(message);
  for (const ws of wss.clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}

// --- Kayan pencere ------------------------------------------------------------
const windows = new Map<number, TelemetryMessage[]>();

function pushToWindow(t: TelemetryMessage): TelemetryMessage[] {
  const now = Date.parse(t.receivedAt);
  const list = (windows.get(t.nodeId) ?? []).filter(
    (x) => now - Date.parse(x.receivedAt) <= SLIDING_WINDOW_MS,
  );
  list.push(t);
  windows.set(t.nodeId, list);
  return list;
}

/** Gostermelik risk hesabi. TODO: Gercek turev tabanli anomali skorlamasi */
function computeRisk(window: TelemetryMessage[]): NodeRisk {
  const first = window[0];
  const last = window[window.length - 1];
  const minutes = Math.max(
    (Date.parse(last.receivedAt) - Date.parse(first.receivedAt)) / 60000,
    1 / 60,
  );
  const tempRate = (last.temperature - first.temperature) / minutes;
  const coRate = (last.co - first.co) / minutes;

  let level: RiskLevel = RiskLevel.Green;
  if (last.temperature > THRESHOLDS.activeFireTempC) level = RiskLevel.Red;
  else if (last.co > THRESHOLDS.smolderingCoPpm && tempRate > 0) level = RiskLevel.Yellow;

  const score = Math.min(100, Math.max(0, Math.round(coRate * 0.5 + tempRate * 2)));
  return { nodeId: last.nodeId, score, level, tempRate, coRate, updatedAt: last.receivedAt };
}

// --- MQTT abonesi -------------------------------------------------------------
const client = mqtt.connect(MQTT_URL);
client.on("connect", () => {
  console.log(`[backend] MQTT baglandi: ${MQTT_URL}`);
  client.subscribe(MQTT_TOPICS.telemetryWildcard);
});
client.on("error", (err) => console.error("[backend] MQTT hatasi:", err.message));

client.on("message", (_topic, payload) => {
  try {
    const telemetry = JSON.parse(payload.toString()) as TelemetryMessage;
    const risk = computeRisk(pushToWindow(telemetry));
    broadcast({ type: "telemetry", data: telemetry });
    broadcast({ type: "risk", data: risk });
    // TODO: Alarm durumunda { type: "impact" } ile onlenen CO2 (preventedCo2Tons) yayinla
  } catch (err) {
    console.warn("[backend] gecersiz MQTT mesaji:", (err as Error).message);
  }
});
