// Katman 2: Saha Ag Gecidi (Edge Gateway / LoRaWAN simulasyonu)
// UDP :5005 -> PyrosFrame v3 muhrunu dogrula (AES-128-CCM) -> JSON -> MQTT sensors/{id}/telemetry
// Yalnizca kendi anahtariyla muhurlenmis, sayaci ileri giden paketler iletilir; gerisi sebebiyle sayilip atilir.
//
// Calistirma: pnpm dev:gateway  (once: pnpm broker:up, pnpm keys)

import "@pyros/shared/env";
import dgram from "node:dgram";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  MQTT_CREDENTIALS,
  MQTT_TOPICS,
  MQTT_URL,
  type TelemetryMessage,
  UDP_PORT,
} from "@pyros/shared";
import { getAllGateways, getAllNodes, isNodeInCoverage } from "@pyros/shared/db";
import {
  deriveNodeKey,
  FrameRejected,
  loadMasterKey,
  openFrame,
  peekHeader,
  RejectReason,
} from "@pyros/shared/secure";
import mqtt from "mqtt";

const masterKey = loadMasterKey();

let cachedNodes = getAllNodes();
let cachedGateways = getAllGateways();
let lastCacheRefresh = Date.now();

function getCachedTopology() {
  const now = Date.now();
  if (now - lastCacheRefresh > 1500) {
    cachedNodes = getAllNodes();
    cachedGateways = getAllGateways();
    lastCacheRefresh = now;
  }
  return { nodes: cachedNodes, gateways: cachedGateways };
}

// Tekrar korumasi: her dugumun kabul edilen son sayaci. Gateway yeniden baslasa da eski
// paketler kabul edilmesin diye dosyada tutulur.
const COUNTERS_FILE = resolve(import.meta.dirname, "../.sayaclar.json");
const lastCounter = new Map<number, number>(
  existsSync(COUNTERS_FILE)
    ? Object.entries(JSON.parse(readFileSync(COUNTERS_FILE, "utf8")) as Record<string, number>).map(
        ([id, c]) => [Number(id), c],
      )
    : [],
);
let countersDirty = false;

const client = mqtt.connect(MQTT_URL, MQTT_CREDENTIALS.gateway);
client.on("connect", () => console.log(`[gateway] MQTT baglandi: ${MQTT_URL}`));
client.on("error", (err) => console.error("[gateway] MQTT hatasi:", err.message));

const socket = dgram.createSocket("udp4");

// 5 sn'lik paket sayaci: gecerli paketler sessizce iletildigi icin UDP akisini gorunur kilar
const STATS_INTERVAL_MS = 5000;
const MAX_REJECT_LOGS = 5; // Sel saldirisinda konsolu bogmamak icin 5 sn'de en fazla bu kadar satir
const stats = {
  valid: 0,
  rejected: new Map<RejectReason, number>(),
  rejectLogs: 0,
  nodes: new Set<number>(),
  last: "",
};

setInterval(() => {
  const rejected = [...stats.rejected.values()].reduce((a, b) => a + b, 0);
  if (stats.valid || rejected) {
    const reasons = [...stats.rejected].map(([r, n]) => `${n} ${r}`).join(", ");
    console.log(
      `[gateway] son 5 sn: ${stats.valid} gecerli, ${rejected} REDDEDILDI${reasons ? ` (${reasons})` : ""} | ` +
        `${stats.nodes.size} dugum | son: ${stats.last}`,
    );
  }
  stats.valid = 0;
  stats.rejected.clear();
  stats.rejectLogs = 0;
  stats.nodes.clear();
  if (countersDirty) {
    writeFileSync(COUNTERS_FILE, JSON.stringify(Object.fromEntries(lastCounter)));
    countersDirty = false;
  }
}, STATS_INTERVAL_MS);

function verify(msg: Buffer) {
  const { nodeId } = peekHeader(msg);
  const { nodes, gateways } = getCachedTopology();
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) {
    throw new FrameRejected(
      RejectReason.UnknownNode,
      `düğüm ${nodeId} kayıtlı değil veya silinmiş`,
    );
  }

  const { covered } = isNodeInCoverage(node.lat, node.lng, gateways);
  if (!covered) {
    throw new FrameRejected(
      RejectReason.UnknownNode,
      `düğüm ${nodeId} kapsama dışı (hiçbir gateway menzilinde değil)`,
    );
  }

  const key = deriveNodeKey(masterKey, nodeId);
  const { frame, counter } = openFrame(msg, key);
  // Sayaç yalnızca mühür doğrulandıktan sonra kontrol edilir
  const last = lastCounter.get(nodeId) ?? -1;
  if (counter <= last) {
    throw new FrameRejected(RejectReason.Replay, `düğüm ${nodeId} sayaç ${counter} <= son ${last}`);
  }
  lastCounter.set(nodeId, counter);
  countersDirty = true;
  return frame;
}

socket.on("message", (msg, rinfo) => {
  try {
    const frame = verify(msg);
    const telemetry: TelemetryMessage = { ...frame, receivedAt: new Date().toISOString() };
    client.publish(MQTT_TOPICS.telemetry(frame.nodeId), JSON.stringify(telemetry));
    stats.valid++;
    stats.nodes.add(frame.nodeId);
    stats.last = `dugum ${frame.nodeId} <- ${rinfo.address}:${rinfo.port}`;
  } catch (err) {
    const reason = err instanceof FrameRejected ? err.reason : RejectReason.Seal;
    stats.rejected.set(reason, (stats.rejected.get(reason) ?? 0) + 1);
    if (stats.rejectLogs++ < MAX_REJECT_LOGS) {
      console.warn(
        `[gateway] REDDEDILDI [${reason}] ${rinfo.address}:${rinfo.port}: ${(err as Error).message}`,
      );
    }
  }
});

socket.bind(UDP_PORT, () =>
  console.log(
    `[gateway] UDP dinleniyor: :${UDP_PORT} (yalnizca AES-128-CCM muhurlu PyrosFrame v3)`,
  ),
);
