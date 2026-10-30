// Katman 3: Çekirdek İş Mantığı (Backend Analiz Motoru)
// MQTT sensors/+/telemetry -> analiz (taban + türev + MCE + füzyon) -> WebSocket :8080
//
// Çalıştırma: pnpm dev:backend  (önce: pnpm broker:up)

import {
  CO2_MODEL,
  type ImpactSummary,
  MQTT_TOPICS,
  MQTT_URL,
  NODES,
  preventedCo2Tons,
  RiskLevel,
  type TelemetryMessage,
  WS_PORT,
  type WsMessage,
} from "@pyros/shared";
import mqtt from "mqtt";
import { WebSocket, WebSocketServer } from "ws";
import { analyze } from "./analysis.ts";
import { recordWind, windField } from "./wind.ts";

/** Rüzgâr alanı yayın aralığı (frontend'de 3B rüzgâr okları için) */
const WIND_BROADCAST_MS = 2000;

// --- WebSocket sunucusu -------------------------------------------------------
const wss = new WebSocketServer({ port: WS_PORT });
wss.on("listening", () => console.log(`[backend] WebSocket dinleniyor: ws://localhost:${WS_PORT}`));

const impact: ImpactSummary = { detectedFires: 0, savedHectares: 0, preventedCo2Tons: 0 };

// Yeni bağlanan istemci önce düğüm listesini, güncel etkiyi ve rüzgâr alanını alır
wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "nodes", data: NODES } satisfies WsMessage));
  ws.send(JSON.stringify({ type: "impact", data: impact } satisfies WsMessage));
  const wind = windField();
  if (wind) ws.send(JSON.stringify({ type: "wind", data: wind } satisfies WsMessage));
});

function broadcast(message: WsMessage): void {
  const payload = JSON.stringify(message);
  for (const ws of wss.clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}

// --- Erken tespit etkisi ------------------------------------------------------
// Son 10 dakikada hiçbir düğüm uyarı vermemişken gelen ilk uyarı yeni bir yangın olayı sayılır.
// (Eşik sınırındaki tek bir yeşile dönüş aynı yangını iki kez saydırmasın.)
const FIRE_EVENT_COOLDOWN_MS = 10 * 60 * 1000;
let lastAlertAt = Number.NEGATIVE_INFINITY;

function trackImpact(nodeId: number, level: RiskLevel, at: string): void {
  if (level === RiskLevel.Green) return;
  const now = Date.parse(at);
  const isNewFire = now - lastAlertAt > FIRE_EVENT_COOLDOWN_MS;
  lastAlertAt = now;
  if (!isNewFire) return;

  impact.detectedFires++;
  impact.savedHectares = impact.detectedFires * CO2_MODEL.lateResponseHectareLoss;
  impact.preventedCo2Tons = preventedCo2Tons(impact.savedHectares);
  console.log(`[backend] YENI YANGIN OLAYI: dugum ${nodeId} ilk uyari`);
  broadcast({ type: "impact", data: impact });
}

// --- Rüzgâr alanı yayını --------------------------------------------------------
setInterval(() => {
  const wind = windField();
  if (wind) broadcast({ type: "wind", data: wind });
}, WIND_BROADCAST_MS);

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
    recordWind(telemetry);
    const risk = analyze(telemetry);
    broadcast({ type: "telemetry", data: telemetry });
    broadcast({ type: "risk", data: risk });
    trackImpact(risk.nodeId, risk.level, risk.updatedAt);
    if (risk.level !== RiskLevel.Green) {
      console.log(
        `[backend] dugum ${risk.nodeId}: ${risk.level}/${risk.stage} skor=${risk.score} ` +
          `sinyal=${risk.signalCount} mce=${risk.mce ?? "-"} dCO=${risk.delta.co} ` +
          `dVOC=${risk.delta.vocIndex}${risk.confirmed ? ` dogrulandi<-${risk.confirmedBy.join(",")}` : ""}`,
      );
    }
  } catch (err) {
    console.warn("[backend] gecersiz MQTT mesaji:", (err as Error).message);
  }
});
