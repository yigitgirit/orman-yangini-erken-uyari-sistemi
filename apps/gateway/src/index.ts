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

socket.on("message", (msg, rinfo) => {
  try {
    const frame = unpackFrame(msg);
    const telemetry: TelemetryMessage = { ...frame, receivedAt: new Date().toISOString() };
    client.publish(MQTT_TOPICS.telemetry(frame.nodeId), JSON.stringify(telemetry));
  } catch (err) {
    // TODO: Hatali paket sayaci / metrikler
    console.warn(
      `[gateway] gecersiz paket (${rinfo.address}:${rinfo.port}):`,
      (err as Error).message,
    );
  }
});

socket.bind(UDP_PORT, () => console.log(`[gateway] UDP dinleniyor: :${UDP_PORT}`));
