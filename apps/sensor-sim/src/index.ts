// Katman 1: Sensor Simulatoru (Dijital Ikiz)
// 8 dugum icin sahte okuma uretir -> PyrosFrame (10 bayt) -> UDP :5005
//
// Calistirma: pnpm dev:sensor
// Yangin senaryosu (gostermelik): FIRE_NODE=3 pnpm dev:sensor

import dgram from "node:dgram";
import {
  NODES,
  type PyrosFrame,
  packFrame,
  SENSOR_INTERVAL_MS,
  StatusFlag,
  UDP_HOST,
  UDP_PORT,
} from "@pyros/shared";

const socket = dgram.createSocket("udp4");
const fireNodeId = Number(process.env.FIRE_NODE ?? 0);
let tick = 0;

/** Gostermelik veri uretici. TODO: Gercekci zaman serisi / senaryo motoru */
function readSensor(nodeId: number): PyrosFrame {
  const onFire = nodeId === fireNodeId;
  const jitter = (n: number) => (Math.random() - 0.5) * n;
  return {
    nodeId,
    temperature: onFire ? 22 + tick * 1.5 : 22 + jitter(2),
    humidity: onFire ? Math.max(10, 60 - tick) : 60 + jitter(5),
    co: onFire ? Math.min(255, 5 + tick * 6) : 5 + jitter(2),
    aqi: onFire ? Math.min(255, 40 + tick * 5) : 40 + jitter(5),
    windSpeed: 3 + jitter(1),
    windDirection: 225,
    battery: 90,
    flags: StatusFlag.None,
  };
}

setInterval(() => {
  tick++;
  for (const node of NODES) {
    const packet = packFrame(readSensor(node.id));
    socket.send(packet, UDP_PORT, UDP_HOST);
  }
  console.log(
    `[sensor-sim] tick=${tick} -> ${NODES.length} paket gonderildi (${UDP_HOST}:${UDP_PORT})`,
  );
}, SENSOR_INTERVAL_MS);

console.log(`[sensor-sim] basladi${fireNodeId ? ` (yangin senaryosu: dugum ${fireNodeId})` : ""}`);
