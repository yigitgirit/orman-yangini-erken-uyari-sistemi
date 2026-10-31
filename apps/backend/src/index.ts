// Katman 3: Çekirdek İş Mantığı (Backend Analiz Motoru)
// MQTT sensors/+/telemetry -> analiz (taban + türev + MCE + füzyon) -> WebSocket TLS :8080
//
// Çalıştırma: pnpm dev:backend  (önce: pnpm broker:up)

import "@pyros/shared/env";
import {
  type FireSpreadPrediction,
  type ImpactSummary,
  MQTT_CREDENTIALS,
  MQTT_TOPICS,
  MQTT_URL,
  type NodeRisk,
  preventedCo2Tons,
  RiskLevel,
  type TelemetryMessage,
  WS_PORT,
  WsCommandSchema,
  type WsMessage,
  WsMessageSchema,
} from "@pyros/shared";
import {
  createGateway,
  createNode,
  deleteGateway,
  deleteNode,
  getAllGateways,
  getAllNodes,
  queryTelemetries,
  recordTelemetry,
  resetTopologyDefaults,
} from "@pyros/shared/db";
import mqtt from "mqtt";
import { WebSocket, WebSocketServer } from "ws";
import { analyze } from "./analysis.ts";
import { authenticateAdmin, isSessionValid } from "./auth.ts";
import { calculateFireSpread } from "./rothermel.ts";
import { createBackendServer } from "./server.ts";
import { recordWind, windField } from "./wind.ts";

/** Rüzgâr alanı yayın aralığı (frontend'de 3B rüzgâr okları için) */
const WIND_BROADCAST_MS = 2000;

// --- HTTPS / TLS Sunucusu ve WSS Kurulumu ------------------------------------
const { httpServer, isTls } = createBackendServer();
const protocolName = isTls ? "wss" : "ws";

const wss = new WebSocketServer({ server: httpServer });

// HTTP API İstek Dinleyicisi (Tarihsel Veritabanı Arşivi ve TanStack Table Sorguları)
httpServer.on("request", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  if (url.pathname === "/api/archive" && req.method === "GET") {
    try {
      const nodeId = url.searchParams.get("nodeId")
        ? Number(url.searchParams.get("nodeId"))
        : undefined;
      const startDate = url.searchParams.get("startDate") ?? undefined;
      const endDate = url.searchParams.get("endDate") ?? undefined;
      const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 50;
      const offset = url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0;
      const sortBy = url.searchParams.get("sortBy") ?? "received_at";
      const sortOrder = (url.searchParams.get("sortOrder") as "asc" | "desc") ?? "desc";

      const result = queryTelemetries({
        nodeId,
        startDate,
        endDate,
        limit,
        offset,
        sortBy,
        sortOrder,
      });

      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          rows: result.rows,
          totalCount: result.totalCount,
          page: Math.floor(offset / limit),
          pageSize: limit,
        }),
      );
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: (err as Error).message }));
    }
    return;
  }

  if (url.pathname === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
    return;
  }
});

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
      } else if (cmd.type === "query_archive") {
        try {
          const filter = cmd.filter ?? {};
          const limit = filter.limit ?? 50;
          const offset = filter.offset ?? 0;
          const result = queryTelemetries(filter);
          ws.send(
            JSON.stringify({
              type: "archive_result",
              data: {
                queryId: cmd.queryId,
                rows: result.rows,
                totalCount: result.totalCount,
                page: Math.floor(offset / limit),
                pageSize: limit,
              },
            } satisfies WsMessage),
          );
        } catch (err) {
          console.warn("[backend] query_archive hatası:", (err as Error).message);
        }
      } else if (cmd.type === "admin_login") {
        const res = authenticateAdmin(cmd.username, cmd.password);
        ws.send(JSON.stringify({ type: "admin_auth_result", data: res } satisfies WsMessage));
      } else if (cmd.type === "admin_create_node") {
        if (!isSessionValid(cmd.token)) {
          ws.send(
            JSON.stringify({
              type: "admin_action_result",
              data: {
                success: false,
                action: "create_node",
                message: "Yetkisiz işlem veya oturum süresi doldu.",
              },
            } satisfies WsMessage),
          );
          return;
        }
        const newNode = createNode({
          name: cmd.name,
          lat: cmd.lat,
          lng: cmd.lng,
          hasAnemometer: cmd.hasAnemometer,
          source: "sim",
        });
        broadcast({ type: "nodes", data: getAllNodes() });
        broadcast({ type: "gateways", data: getAllGateways() });
        ws.send(
          JSON.stringify({
            type: "admin_action_result",
            data: {
              success: true,
              action: "create_node",
              message: `Düğüm #${newNode.id} (${newNode.name}) eklendi.`,
            },
          } satisfies WsMessage),
        );
        console.log(`[backend] Yönetici yeni düğüm ekledi: #${newNode.id} (${newNode.name})`);
      } else if (cmd.type === "admin_delete_node") {
        if (!isSessionValid(cmd.token)) {
          ws.send(
            JSON.stringify({
              type: "admin_action_result",
              data: {
                success: false,
                action: "delete_node",
                message: "Yetkisiz işlem veya oturum süresi doldu.",
              },
            } satisfies WsMessage),
          );
          return;
        }
        deleteNode(cmd.nodeId);
        broadcast({ type: "nodes", data: getAllNodes() });
        broadcast({ type: "gateways", data: getAllGateways() });
        ws.send(
          JSON.stringify({
            type: "admin_action_result",
            data: {
              success: true,
              action: "delete_node",
              message: `Düğüm #${cmd.nodeId} silindi.`,
            },
          } satisfies WsMessage),
        );
        console.log(`[backend] Yönetici düğüm sildi: #${cmd.nodeId}`);
      } else if (cmd.type === "admin_create_gateway") {
        if (!isSessionValid(cmd.token)) {
          ws.send(
            JSON.stringify({
              type: "admin_action_result",
              data: {
                success: false,
                action: "create_gateway",
                message: "Yetkisiz işlem veya oturum süresi doldu.",
              },
            } satisfies WsMessage),
          );
          return;
        }
        const newGw = createGateway({
          name: cmd.name,
          lat: cmd.lat,
          lng: cmd.lng,
          radiusMeters: cmd.radiusMeters,
        });
        broadcast({ type: "gateways", data: getAllGateways() });
        ws.send(
          JSON.stringify({
            type: "admin_action_result",
            data: {
              success: true,
              action: "create_gateway",
              message: `Gateway #${newGw.id} (${newGw.name}) ${newGw.radiusMeters}m menzille kuruldu.`,
            },
          } satisfies WsMessage),
        );
        console.log(`[backend] Yönetici yeni gateway kurdu: #${newGw.id} (${newGw.name})`);
      } else if (cmd.type === "admin_delete_gateway") {
        if (!isSessionValid(cmd.token)) {
          ws.send(
            JSON.stringify({
              type: "admin_action_result",
              data: {
                success: false,
                action: "delete_gateway",
                message: "Yetkisiz işlem veya oturum süresi doldu.",
              },
            } satisfies WsMessage),
          );
          return;
        }
        deleteGateway(cmd.gatewayId);
        broadcast({ type: "gateways", data: getAllGateways() });
        ws.send(
          JSON.stringify({
            type: "admin_action_result",
            data: {
              success: true,
              action: "delete_gateway",
              message: `Gateway #${cmd.gatewayId} silindi.`,
            },
          } satisfies WsMessage),
        );
        console.log(`[backend] Yönetici gateway sildi: #${cmd.gatewayId}`);
      } else if (cmd.type === "admin_reset_defaults") {
        if (!isSessionValid(cmd.token)) {
          ws.send(
            JSON.stringify({
              type: "admin_action_result",
              data: {
                success: false,
                action: "reset_defaults",
                message: "Yetkisiz işlem veya oturum süresi doldu.",
              },
            } satisfies WsMessage),
          );
          return;
        }
        const { nodes, gateways } = resetTopologyDefaults();
        broadcast({ type: "nodes", data: nodes });
        broadcast({ type: "gateways", data: gateways });
        ws.send(
          JSON.stringify({
            type: "admin_action_result",
            data: {
              success: true,
              action: "reset_defaults",
              message: "Topoloji varsayılan 50 düğüm ve 3 gateway'e sıfırlandı.",
            },
          } satisfies WsMessage),
        );
        console.log("[backend] Yönetici topolojiyi varsayılana sıfırladı.");
      }
    } catch (err) {
      console.warn("[backend] JSON ayrıştırma hatası:", (err as Error).message);
    }
  });

  // İlk durum aktarımı (SQLite veri tabanından anlık çekilir)
  ws.send(JSON.stringify({ type: "nodes", data: getAllNodes() } satisfies WsMessage));
  ws.send(JSON.stringify({ type: "gateways", data: getAllGateways() } satisfies WsMessage));
  ws.send(JSON.stringify({ type: "impact", data: impact } satisfies WsMessage));
  ws.send(JSON.stringify({ type: "fire_spread", data: currentFireSpread } satisfies WsMessage));
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

// --- 3B Rothermel Yayılım ve Aktif Risk Yönetimi -----------------------------
let currentFireSpread: FireSpreadPrediction | null = null;
const activeNodeRisks = new Map<number, NodeRisk>();
let activeFireStartedAt: number | null = null;

function updateSpreadAndImpact(latestRisk: NodeRisk): void {
  activeNodeRisks.set(latestRisk.nodeId, latestRisk);

  // En yüksek risk skoruna sahip yangın düğümünü bul
  let highestScore = 0;
  let activeNodeId: number | null = null;

  for (const [id, r] of activeNodeRisks.entries()) {
    if (r.level === "red" || r.stage === "flaming" || r.stage === "smoldering") {
      if (r.score > highestScore) {
        highestScore = r.score;
        activeNodeId = id;
      }
    }
  }

  const currentRegionalWind = windField()?.regional;
  const windSpd = currentRegionalWind?.speed ?? 7.2;
  // Rüzgârın geldiği yön (azimut): directionTo + 180
  const windFromDeg = currentRegionalWind ? (currentRegionalWind.directionTo + 180) % 360 : 30;

  if (activeNodeId) {
    const fireNode = getAllNodes().find((n) => n.id === activeNodeId);
    if (fireNode) {
      currentFireSpread = calculateFireSpread(fireNode, windSpd, windFromDeg);
      broadcast({ type: "fire_spread", data: currentFireSpread });

      if (!activeFireStartedAt) {
        activeFireStartedAt = Date.now();
        impact.detectedFires++;
        console.log(
          `\n🔥 [backend] AKTİF YANGIN BAŞLADI: Düğüm #${fireNode.id} (${fireNode.name})`,
        );
        console.log(`   Rothermel 3B Yayılım Elipsleri Hesaplanıp Haritaya İletildi.\n`);
      }
    }
  } else if (currentFireSpread !== null) {
    currentFireSpread = null;
    broadcast({ type: "fire_spread", data: null });
    console.log(`\n🌿 [backend] Yangın Söndü / Tüm Düğümler Stabil. Yayılım zonları kaldırıldı.\n`);
  }
}

// Periyodik Canlı Dinamik Hektar ve Karbon Emisyonu Hesabı (A(t) ~ t^1.5)
setInterval(() => {
  if (!activeFireStartedAt) return;

  const hasFire = Array.from(activeNodeRisks.values()).some(
    (r) => r.level === RiskLevel.Red || r.stage === "flaming" || r.stage === "smoldering",
  );

  if (!hasFire) {
    if (Date.now() - activeFireStartedAt > 12_000) {
      activeFireStartedAt = null;
    }
    return;
  }

  const elapsedSec = Math.max(1, (Date.now() - activeFireStartedAt) / 1000);
  const baseHectares = 4.2 * impact.detectedFires;
  // Formülle zamana bağlı üssel yayılma önleme kazancı
  const dynamicGrowth = Math.min(65, (elapsedSec / 60) ** 1.35 * 3.2);
  impact.savedHectares = Number((baseHectares + dynamicGrowth).toFixed(1));
  impact.preventedCo2Tons = Number(preventedCo2Tons(impact.savedHectares).toFixed(1));
  broadcast({ type: "impact", data: impact });
}, 2000);

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
    recordTelemetry(telemetry);
    recordWind(telemetry);
    const risk = analyze(telemetry);
    broadcast({ type: "telemetry", data: telemetry });
    broadcast({ type: "risk", data: risk });
    updateSpreadAndImpact(risk);
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
