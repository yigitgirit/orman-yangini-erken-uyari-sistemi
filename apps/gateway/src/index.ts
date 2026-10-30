// Katman 2: Saha Ag Gecidi (Edge Gateway / LoRaWAN simulasyonu)
// UDP :5005 -> PyrosFrame coz -> JSON -> MQTT sensors/{id}/telemetry
//
// Calistirma: pnpm dev:gateway  (once: pnpm broker:up)

import dgram from "node:dgram";
import { MQTT_TOPICS, MQTT_URL, type TelemetryMessage, UDP_PORT, unpackFrame } from "@pyros/shared";
import mqtt from "mqtt";

const client = mqtt.connect(MQTT_URL);
client.on("connect", () => console.log(`[gateway] MQTT baglandi: ${MQTT_URL}`));
client.on("error", (err) => console.error("[gateway] MQTT hatasi:", err.message));

const socket = dgram.createSocket("udp4");

// 5 sn'lik paket sayaci: gecerli paketler sessizce iletildigi icin UDP akisini gorunur kilar
const STATS_INTERVAL_MS = 5000;
const stats = { valid: 0, invalid: 0, nodes: new Set<number>(), last: "" };

setInterval(() => {
  if (stats.valid || stats.invalid) {
    console.log(
      `[gateway] son 5 sn: ${stats.valid} gecerli, ${stats.invalid} gecersiz paket | ` +
        `${stats.nodes.size} dugum | son: ${stats.last}`,
    );
  }
  stats.valid = 0;
  stats.invalid = 0;
  stats.nodes.clear();
}, STATS_INTERVAL_MS);

socket.on("message", (msg, rinfo) => {
  try {
    const frame = unpackFrame(msg);
    const telemetry: TelemetryMessage = { ...frame, receivedAt: new Date().toISOString() };
    client.publish(MQTT_TOPICS.telemetry(frame.nodeId), JSON.stringify(telemetry));
    stats.valid++;
    stats.nodes.add(frame.nodeId);
    stats.last = `dugum ${frame.nodeId} <- ${rinfo.address}:${rinfo.port} (${msg.toString("hex")})`;
  } catch (err) {
    stats.invalid++;
    console.warn(
      `[gateway] gecersiz paket (${rinfo.address}:${rinfo.port}):`,
      (err as Error).message,
    );
  }
});

socket.bind(UDP_PORT, () => console.log(`[gateway] UDP dinleniyor: :${UDP_PORT}`));
