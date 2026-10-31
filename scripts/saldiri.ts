// Saldiri demosu: gateway'e sahte, tekrar edilmis ve degistirilmis paketler gonderir.
// Gateway penceresinde her biri "REDDEDILDI [sebep]" olarak gorunmeli; backend'e hicbiri ulasmaz.
//
// Calistirma: pnpm saldiri   (gateway calisirken)

import "../packages/shared/src/env.ts";
import { randomBytes } from "node:crypto";
import dgram from "node:dgram";
import {
  NodeMode,
  type PyrosFrame,
  packFrame,
  UDP_HOST,
  UDP_PORT,
} from "../packages/shared/src/index.ts";
import {
  counterBase,
  deriveNodeKey,
  loadMasterKey,
  sealFrame,
} from "../packages/shared/src/secure.ts";

const TARGET = 25; // D4, izgaranin ortasi

// Sahte yangin: tum degerler alevli evrede
const fakeFire: PyrosFrame = {
  nodeId: TARGET,
  mode: NodeMode.Alert,
  temperature: 95,
  humidity: 4,
  co: 400,
  co2: 4800,
  vocIndex: 500,
  pm25: 900,
  windSpeed: null,
  windDirection: null,
  battery: 80,
  flags: 0,
};
const normal: PyrosFrame = {
  ...fakeFire,
  mode: NodeMode.Normal,
  temperature: 39,
  humidity: 12,
  co: 0.2,
  co2: 418,
  vocIndex: 90,
  pm25: null,
};

const socket = dgram.createSocket("udp4");
const send = (buf: Buffer) =>
  new Promise<void>((done) => socket.send(buf, UDP_PORT, UDP_HOST, () => done()));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// "Yakalanan" gercek paket: sensorun kendi anahtariyla, havadan dinlenmis gibi
const realKey = deriveNodeKey(loadMasterKey(), TARGET);
const captured = sealFrame(normal, counterBase(), realKey); // simulatordeki D4 bir sonraki saniyede devam eder

const attacks: { title: string; expect: string; packet: () => Buffer }[] = [
  {
    title: "Sifresiz eski format (v2) ile sahte yangin",
    expect: "surum",
    packet: () => packFrame(fakeFire),
  },
  {
    title: "Tahmin edilen rastgele anahtarla muhurlenmis sahte yangin",
    expect: "muhur",
    packet: () => sealFrame(fakeFire, counterBase() + 2_000_000, randomBytes(16)),
  },
  {
    title: "Calinan D3 (dugum 24) sensorunun anahtariyla D4 taklidi",
    expect: "muhur",
    packet: () =>
      sealFrame(fakeFire, counterBase() + 2_000_000, deriveNodeKey(loadMasterKey(), 24)),
  },
  {
    title: "Yakalanan gercek paketin degerleri degistirilmis (sifreli govdede 1 bit)",
    expect: "muhur",
    packet: () => {
      const tampered = Buffer.from(captured);
      tampered[10] ^= 0x01;
      return tampered;
    },
  },
  {
    title: "Yakalanan gercek paketin dugum numarasi degistirilmis (D4 -> D5)",
    expect: "muhur",
    packet: () => {
      const tampered = Buffer.from(captured);
      tampered[1] = TARGET + 1;
      return tampered;
    },
  },
  {
    title: "Yakalanan gercek paket (ilk kez, sensorun kendi gonderimi gibi)",
    expect: "KABUL - gercek sensor paketi",
    packet: () => captured,
  },
  {
    title: "Ayni gercek paketin tekrar gonderilmesi (replay)",
    expect: "tekrar",
    packet: () => captured,
  },
];

console.log(`[saldiri] hedef gateway ${UDP_HOST}:${UDP_PORT} - sonuclar gateway penceresinde\n`);
for (const [i, a] of attacks.entries()) {
  const buf = a.packet();
  await send(buf);
  console.log(`${i + 1}. ${a.title}\n   ${buf.length} bayt -> beklenen: ${a.expect}`);
  await wait(400);
}
socket.close();
