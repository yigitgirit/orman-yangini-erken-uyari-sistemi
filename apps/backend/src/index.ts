// Katman 3: Çekirdek İş Mantığı (Backend Analiz Motoru)
// MQTT sensors/+/telemetry -> analiz (taban + türev + MCE + füzyon) -> WebSocket TLS :8080
//
// Çalıştırma: pnpm dev:backend  (önce: pnpm broker:up)

import "@pyros/shared/env";
import {
  CO2_MODEL,
  GATEWAYS,
  type ImpactSummary,
  MQTT_CREDENTIALS,
  MQTT_TOPICS,
  MQTT_URL,
  NODES,
  preventedCo2Tons,
  RiskLevel,
  type TelemetryMessage,
  WS_PORT,
  WsCommandSchema,
  type WsMessage,
  WsMessageSchema,
} from "@pyros/shared";
import mqtt from "mqtt";
import { WebSocket, WebSocketServer } from "ws";
import { analyze } from "./analysis.ts";
import { createBackendServer } from "./server.ts";
import { recordWind, windField } from "./wind.ts";

/** Rüzgâr alanı yayın aralığı (frontend'de 3B rüzgâr okları için) */
const WIND_BROADCAST_MS = 2000;

// --- HTTPS / TLS Sunucusu ve WSS Kurulumu ------------------------------------
const { httpServer, isTls } = createBackendServer();
const protocolName = isTls ? "wss" : "ws";

const wss = new WebSocketServer({ server: httpServer });

httpServer.listen(WS_PORT, () => {
  console.log(
    `[backend] WebSocket TLS (${protocolName.toUpperCase()}) dinleniyor: ${protocolName}://localhost:${WS_PORT}`,
  );
});

const impact: ImpactSummary = { detectedFires: 0, savedHectares: 0, preventedCo2Tons: 0 };

interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
}

// Yeni bağlanan istemci önce düğüm listesini, güncel etkiyi ve rüzgâr alanını alır
wss.on("connection", (rawWs) => {
  const ws = rawWs as ExtendedWebSocket;
  ws.isAlive = true;

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  // İstemciden gelen komutları Zod ile doğrula
  ws.on("message", (raw) => {
    try {
      const json = JSON.parse(raw.toString());
      const parsed = WsCommandSchema.safeParse(json);
      if (!parsed.success) {
        console.warn("[backend] Geçersiz istemci komutu:", parsed.error.issues);
        return;
      }
      const cmd = parsed.data;
      if (cmd.type === "trigger_fire") {
        console.log(`[backend] Yangın senaryosu tetiklendi: Düğüm #${cmd.nodeId}`);
      } else if (cmd.type === "extinguish_fire") {
        console.log("[backend] Yangın senaryosu durduruldu");
      }
    } catch (err) {
      console.warn("[backend] JSON ayrıştırma hatası:", (err as Error).message);
    }
  });

  // İlk durum aktarımı
  ws.send(JSON.stringify({ type: "nodes", data: NODES } satisfies WsMessage));
  ws.send(JSON.stringify({ type: "gateways", data: GATEWAYS } satisfies WsMessage));
  ws.send(JSON.stringify({ type: "impact", data: impact } satisfies WsMessage));
  const wind = windField();
  if (wind) ws.send(JSON.stringify({ type: "wind", data: wind } satisfies WsMessage));
});

// Dead-peer tespiti (30 saniyede bir ping/pong)
const heartbeatInterval = setInterval(() => {
  for (const client of wss.clients) {
    const ws = client as ExtendedWebSocket;
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30_000);

wss.on("close", () => clearInterval(heartbeatInterval));

function broadcast(message: WsMessage): void {
  // Giden mesajı Zod doğrulamasıyla garanti altına al
  const validation = WsMessageSchema.safeParse(message);
  if (!validation.success) {
    console.error("[backend] Şemaya uymayan giden WebSocket mesajı:", validation.error.issues);
    return;
  }
  const payload = JSON.stringify(validation.data);
  for (const ws of wss.clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}

// --- Erken tespit etkisi ------------------------------------------------------
// Son 10 dakikada hiçbir düğüm uyarı vermemişken gelen ilk uyarı yeni bir yangın olayı sayılır.
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
  console.log(`[backend] YENİ YANGIN OLAYI: düğüm ${nodeId} ilk uyarı`);
  broadcast({ type: "impact", data: impact });
}

// --- Rüzgâr alanı yayını --------------------------------------------------------
setInterval(() => {
  const wind = windField();
  if (wind) broadcast({ type: "wind", data: wind });
}, WIND_BROADCAST_MS);

// --- MQTT abonesi -------------------------------------------------------------
const client = mqtt.connect(MQTT_URL, MQTT_CREDENTIALS.backend);
client.on("connect", () => {
  console.log(`[backend] MQTT bağlandı: ${MQTT_URL}`);
  client.subscribe(MQTT_TOPICS.telemetryWildcard);
});
client.on("error", (err) => console.error("[backend] MQTT hatası:", err.message));

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
        `[backend] düğüm ${risk.nodeId}: ${risk.level}/${risk.stage} skor=${risk.score} ` +
          `sinyal=${risk.signalCount} mce=${risk.mce ?? "-"} dCO=${risk.delta.co} ` +
          `dVOC=${risk.delta.vocIndex}${risk.confirmed ? ` doğrulandı<-${risk.confirmedBy.join(",")}` : ""}`,
      );
    }
  } catch (err) {
    console.warn("[backend] geçersiz MQTT mesajı:", (err as Error).message);
  }
});
