// Katman 1: Sensor Simulatoru (Dijital Ikiz)
// Antalya Manavgat - Oymapinar Yangin Sahasi (28 Temmuz 2021 Gercek Senaryo Modeli)
// 49 izgara dugumu icin okuma uretir -> PyrosFrame v3 (AES-128-CCM muhurlu, 29 bayt) -> UDP :5005
// Her dugum kendi anahtarini ana anahtardan (.env PYROS_MASTER_KEY) turetir; sayaci saatle ilerler.
// (50 numarali dugum Oymapinar Seyir ESP32 donanim dugumudur.)
//
// Calistirma: pnpm dev:sensor
// Yangin senaryosu: FIRE_NODE=11 pnpm dev:sensor
//   FIRE_DELAY_S  yangin baslamadan once taban olusturma suresi (varsayilan 45)
//   FIRE_SPEED    zaman hizlandirma katsayisi (varsayilan 1; 2 = iki kat hizli)
//
// Manavgat Yangini meteorolojisi ve evreleri:
//   Kuru & Kavurucu Poyraz: Kuzeydogu (30°) yonunden 7.2 m/s (~26 km/h, hamleler 12 m/s)
//   Taban: 39°C sicaklik, %12 bagil nem (asiri kuruluk)
//   0-2 dk  piroliz       : Kizilcam recine ve terpen gazlari (VOC) firlar, CO henuz dusuk
//   2-6 dk  icin icin     : Ibre tutusmasi, CO ve PM2.5 duman yogunlugu artar, MCE ~0.8
//   6+ dk   alevli        : Tepe yangini (crowning), CO2 ve sicaklik zirve yapar (>65°C artis), nem <%5
// Poyraz ruzgari yangin dumanini ve isi dalgasini 210° (Guneybati) eksenindeki komsu dugumlere tasir.

import "@pyros/shared/env";
import dgram from "node:dgram";
import {
  bearingDeg,
  distanceM,
  getNode,
  NodeMode,
  NodeSource,
  type PyrosFrame,
  SENSOR_INTERVAL_MS,
  type SensorNode,
  StatusFlag,
  THRESHOLDS,
  UDP_HOST,
  UDP_PORT,
} from "@pyros/shared";
import { getAllNodes } from "@pyros/shared/db";
import { counterBase, deriveNodeKey, loadMasterKey, sealFrame } from "@pyros/shared/secure";

const socket = dgram.createSocket("udp4");

// Birden fazla simülatör sürecinin aynı anda çalışıp Gateway'e çakışan veri basmasını önle
// ve çalışma anında dinamik yangın senaryoları enjekte edilmesini sağla.
const SIM_LOCK_PORT = 5006;
socket.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n❌ [sensor-sim] ÇAKIŞMA HATASI: Başka bir sensör simülatörü zaten arka planda çalışıyor! (Port ${SIM_LOCK_PORT} kullanımda).\n` +
        `Lütfen önce diğer terminaldeki simülatörü durdurun veya "pkill -f sensor-sim" çalıştırın.\n`,
    );
    process.exit(1);
  }
});
socket.bind(SIM_LOCK_PORT);

// Dinamik Senaryo Durum Değişkenleri
let fireNode = getNode(Number(process.env.FIRE_NODE ?? 0));
let fireDelayS = Number(process.env.FIRE_DELAY_S ?? 45);
let fireSpeed = Number(process.env.FIRE_SPEED ?? 1);
let activeScenarioType: "standard" | "smoldering" | "flashover" | "false_alarm" = "standard";
let activeScenarioName = process.env.FIRE_NODE
  ? `Özel Başlatma (Düğüm #${process.env.FIRE_NODE})`
  : "Taban İzleme (Yangın Yok)";
let startedAt = Date.now();

// Dışarıdan (ör. "pnpm senaryo") gelen dinamik UDP kontrol mesajlarını dinle
socket.on("message", (buf, rinfo) => {
  try {
    const raw = buf.toString("utf8");
    if (!raw.startsWith("{")) return;
    const cmd = JSON.parse(raw);

    if (cmd.cmd === "SET_SCENARIO") {
      const targetId = Number(cmd.nodeId ?? 11);
      fireNode = states.find((s) => s.node.id === targetId)?.node ?? getNode(targetId);
      fireDelayS = Number(cmd.delayS ?? 2);
      fireSpeed = Number(cmd.speed ?? 4);
      activeScenarioType = cmd.scenarioType ?? "standard";
      activeScenarioName = cmd.name ?? `Düğüm #${cmd.nodeId} Yangını`;
      startedAt = Date.now();

      // Yangın başlangıç düğümünün ve yakın komşuların paket gönderimini derhal başlat
      const now = Date.now();
      for (const s of states) {
        if (s.node.id === targetId || (fireNode && distanceM(s.node, fireNode) < 300)) {
          s.nextSendAt = now;
        }
      }

      if (cmd.wind) {
        WIND_MEAN.speed = cmd.wind.speed;
        WIND_MEAN.fromDeg = cmd.wind.fromDeg;
        WIND.speed = cmd.wind.speed;
        WIND.fromDeg = cmd.wind.fromDeg;
        baseSpeed = cmd.wind.speed;
      }

      console.log(`\n================================================================`);
      console.log(`🔥 [sensor-sim] CANLI YANGIN SENARYOSU DEVREYE ALINDI!`);
      console.log(`   Senaryo          : ${activeScenarioName}`);
      console.log(`   Başlangıç Noktası: Düğüm #${fireNode?.id} (${fireNode?.name})`);
      console.log(`   Karakteristik    : ${activeScenarioType}`);
      console.log(`   Zaman Katsayısı  : ${fireSpeed}x (Gecikme: ${fireDelayS} sn)`);
      console.log(
        `   Rüzgâr           : ${WIND_MEAN.fromDeg}° azimut, ${WIND_MEAN.speed.toFixed(1)} m/s`,
      );
      console.log(`================================================================\n`);

      // Göndericiye (senaryolar.ts) onay paketi ilet
      if (rinfo?.port) {
        const ack = Buffer.from(
          JSON.stringify({ status: "ok", scenario: activeScenarioName, nodeId: fireNode?.id }),
          "utf8",
        );
        socket.send(ack, rinfo.port, rinfo.address);
      }
    } else if (cmd.cmd === "RESET") {
      fireNode = undefined;
      startedAt = Date.now();
      activeScenarioName = "Taban İzleme (Yangın Yok)";
      activeScenarioType = "standard";
      for (const s of states) {
        s.mode = NodeMode.Normal;
        s.lastAnomalyAt = 0;
      }
      console.log(
        `\n🌿 [sensor-sim] SENARYO SIFIRLANDI: Yangın söndürüldü, tüm düğümler normal moda döndü.\n`,
      );

      if (rinfo?.port) {
        const ack = Buffer.from(JSON.stringify({ status: "reset_ok" }), "utf8");
        socket.send(ack, rinfo.port, rinfo.address);
      }
    }
  } catch {
    // JSON dışı paketleri yoksay
  }
});

// --- Canlı rüzgâr modeli (Marmaris Balan Dağı Meltem Rüzgârı) ------------------
// Ege kıyılarında etkili olan Kuzeybatı Meltemi (335° NNW), 7.4 m/s ortalama hız
const WIND_MEAN = { speed: 7.4, fromDeg: 335 };
const WIND = { speed: WIND_MEAN.speed, fromDeg: WIND_MEAN.fromDeg };
let baseSpeed = WIND_MEAN.speed;
let gust = 0;

function updateWind(dtS: number): void {
  const angleDiff = ((WIND_MEAN.fromDeg - WIND.fromDeg + 540) % 360) - 180;
  WIND.fromDeg = (WIND.fromDeg + 0.02 * angleDiff * dtS + rand(4) * Math.sqrt(dtS) + 360) % 360;
  baseSpeed += 0.05 * (WIND_MEAN.speed - baseSpeed) * dtS + rand(0.8) * Math.sqrt(dtS);
  if (Math.random() < 0.05 * dtS) gust = 2.0 + Math.random() * 4.5; // ~20 sn'de bir sert hamle
  gust *= Math.exp(-dtS / 4); // hamle ~4 sn'de soner
  WIND.speed = Math.max(0.5, baseSpeed + gust);
}

// --- Enerji modeli ---------------------------------------------------------
// Alarm modunda PM2.5 fani acilir ve gonderim sikligi 5 kat artar -> pil hizla duser.
// (Gercekte gunler/haftalar; demoda gorunur olmasi icin olceklendi.)
const BATTERY_COST = {
  perPacket: 0.01, // % / paket (radyo + olcum)
  pmFanPerSecond: 0.04, // % / sn (SPS30 fani)
} as const;

interface NodeState {
  node: SensorNode;
  base: {
    temperature: number;
    humidity: number;
    co: number;
    co2: number;
    vocIndex: number;
    pm25: number;
  };
  terrain: { dirOffset: number; speedFactor: number }; // Istasyonun arazi etkisi
  battery: number;
  mode: NodeMode;
  lastAnomalyAt: number;
  nextSendAt: number;
  key: Buffer; // AES-128-CCM dugum anahtari
  counter: number; // Her pakette artar (gateway tekrar korumasi)
}

const rand = (n: number) => (Math.random() - 0.5) * n;
const masterKey = loadMasterKey();

function createNodeState(node: SensorNode): NodeState {
  return {
    node,
    base: {
      temperature: 39 + rand(2), // Manavgat Temmuz kavurucu yaz tabanı
      humidity: 12 + rand(3), // Kritik kuru hava (%10-15)
      co: 0.2 + rand(0.1),
      co2: 418 + rand(8),
      vocIndex: 90 + rand(10),
      pm25: 10 + rand(4),
    },
    terrain: { dirOffset: rand(30), speedFactor: 0.85 + Math.random() * 0.4 },
    battery: 75 + Math.random() * 25,
    mode: NodeMode.Normal,
    lastAnomalyAt: 0,
    nextSendAt: Date.now() + Math.random() * SENSOR_INTERVAL_MS.normal, // gönderimleri dağıt
    key: deriveNodeKey(masterKey, node.id),
    counter: 0,
  };
}

const states: NodeState[] = getAllNodes()
  .filter((n) => n.source === NodeSource.Sim)
  .map(createNodeState);

function syncSimulationNodes() {
  const currentNodes = getAllNodes().filter((n) => n.source === NodeSource.Sim);
  const currentIds = new Set(currentNodes.map((n) => n.id));

  // Silinen düğümleri simülasyon listesinden çıkar
  for (let i = states.length - 1; i >= 0; i--) {
    if (!currentIds.has(states[i].node.id)) {
      states.splice(i, 1);
    }
  }

  // Yeni eklenen düğümleri simülasyon listesine dahil et
  const existingIds = new Set(states.map((s) => s.node.id));
  for (const node of currentNodes) {
    if (!existingIds.has(node.id)) {
      states.push(createNodeState(node));
      console.log(`[sensor-sim] Yeni düğüm simülasyona dahil edildi: #${node.id} (${node.name})`);
    }
  }
}

/** Kaynaktaki emisyon profili (t: atesten beri gecen dakika) */
function sourceEmission(t: number) {
  if (t <= 0) return { voc: 0, co: 0, co2: 0, pm25: 0, heat: 0, dry: 0 };

  if (activeScenarioType === "smoldering") {
    // Sinsi Piknik / İhmal Ateşi: Yüksek CO ve duman, MCE ~0.78, ısı neredeyse yok
    const smold = Math.min(t / 2, 1);
    const co = 36 * smold;
    return {
      voc: 140 * smold,
      co,
      co2: 3.4 * co, // Düşük MCE (~0.77)
      pm25: 390 * smold,
      heat: 1.5 * smold, // Isı artışı neredeyse sıfır
      dry: 2 * smold,
    };
  }

  if (activeScenarioType === "flashover") {
    // Ani Trafo / Enerji Hattı Parlaması: Piroliz atlanır, doğrudan alev ve ısı patlar
    const flame = Math.min(t / 0.4, 1); // 24 saniyede zirve alev
    return {
      voc: 70 * flame,
      co: 22 * flame,
      co2: 3400 * flame, // Yüksek MCE (>0.96)
      pm25: 600 * flame,
      heat: 58 * flame, // Anında +58°C
      dry: 10 * flame,
    };
  }

  if (activeScenarioType === "false_alarm") {
    // Dışarıdan anız/ilaç dumanı: Gaz yükselir ama ısı 0, alev yok
    const pulse = Math.exp(-(((t - 1) / 1.2) ** 2)); // 1-2 dk tepe yapıp söner
    return {
      voc: 180 * pulse,
      co: 18 * pulse,
      co2: 90 * pulse,
      pm25: 75 * pulse,
      heat: 0,
      dry: 0,
    };
  }

  // Varsayılan: Manavgat Kanyonu standart 3 evreli yangın modeli
  const pyro = Math.min(t / 2, 1);
  const smold = Math.min(Math.max((t - 2) / 4, 0), 1);
  const flame = Math.min(Math.max((t - 6) / 4, 0), 1);
  const co = 45 * smold + 30 * flame;
  return {
    voc: 190 * pyro + 130 * smold, // Kizilcam recineli piroliz
    co,
    co2: 4.2 * co + 2800 * flame, // Icin icin: MCE ~0.8, Alevli: MCE > 0.95
    pm25: 25 * pyro + 480 * smold + 700 * flame,
    heat: 3 * smold + 68 * flame, // °C sicaklik artisi
    dry: 4 * smold + 8 * flame, // Nem kaybi, %
  };
}

/** Kaynaktan dugume tasinan pay: mesafe + ruzgar yonu + tasinma gecikmesi */
function plumeAt(state: NodeState, now: number) {
  if (!fireNode) return { gas: 0, heat: 0, tMin: 0 };
  const d = distanceM(fireNode, state.node);

  if (activeScenarioType === "false_alarm") {
    // Sahte alarm sadece tekil hedef dugumu etkiler; komsulara ruzgarla tasinmaz (komsu teyitsizlik testi)
    return {
      gas: d < 10 ? 1 : 0,
      heat: 0,
      tMin: (((now - startedAt) / 1000) * fireSpeed - fireDelayS) / 60,
    };
  }

  const downwindDeg = (WIND.fromDeg + 180) % 360;
  const angle = d < 1 ? 0 : ((bearingDeg(fireNode, state.node) - downwindDeg + 540) % 360) - 180;
  const windFactor = Math.max(0.15, 0.6 + 0.6 * Math.cos((angle * Math.PI) / 180));
  const delayS = d / (WIND.speed * 0.5);
  const tMin = (((now - startedAt) / 1000) * fireSpeed - fireDelayS - delayS) / 60;
  return {
    gas: Math.exp(-(d + 30) / 150) * windFactor,
    heat: Math.exp(-d / 40),
    tMin,
  };
}

function readSensor(s: NodeState, now: number): PyrosFrame {
  const plume = plumeAt(s, now);
  const e = sourceEmission(plume.tMin);
  const co = s.base.co + e.co * plume.gas + rand(0.2);
  const vocIndex = s.base.vocIndex + e.voc * plume.gas + rand(8);

  // Ucta (edge) mod karari: gaz tabandan sapinca alarm moduna gec, 60 sn sakinse geri don
  if (vocIndex - s.base.vocIndex > 30 || co - s.base.co > 1.5) s.lastAnomalyAt = now;
  s.mode = now - s.lastAnomalyAt < 60_000 ? NodeMode.Alert : NodeMode.Normal;

  return {
    nodeId: s.node.id,
    mode: s.mode,
    temperature: s.base.temperature + e.heat * plume.heat + rand(0.4),
    humidity: Math.max(5, s.base.humidity - e.dry * plume.heat + rand(2)),
    co: Math.max(0, co),
    co2: s.base.co2 + e.co2 * plume.gas + rand(6),
    vocIndex: Math.max(1, vocIndex),
    pm25:
      s.mode === NodeMode.Alert ? Math.max(0, s.base.pm25 + e.pm25 * plume.gas + rand(4)) : null,
    windSpeed: s.node.hasAnemometer
      ? Math.max(0, WIND.speed * s.terrain.speedFactor + rand(0.6))
      : null,
    windDirection: s.node.hasAnemometer
      ? (WIND.fromDeg + s.terrain.dirOffset + rand(10) + 360) % 360
      : null,
    battery: s.battery,
    flags: s.battery < THRESHOLDS.lowBattery ? StatusFlag.LowBattery : StatusFlag.None,
  };
}

let lastTick = Date.now();
let lastLog = Date.now();
let lastSync = Date.now();
let sent = 0;
setInterval(() => {
  const now = Date.now();
  const dtS = (now - lastTick) / 1000;
  lastTick = now;
  updateWind(dtS);

  if (now - lastSync >= 2000) {
    syncSimulationNodes();
    lastSync = now;
  }

  for (const s of states) {
    if (s.battery <= 0) continue; // pili biten dugum susar
    if (s.mode === NodeMode.Alert) s.battery -= BATTERY_COST.pmFanPerSecond * dtS;
    if (now < s.nextSendAt) continue;

    const frame = readSensor(s, now);
    // Sayac saatle birlikte ilerler (en az +1): yeniden baslatmada ve demoda hep ileri gider
    s.counter = Math.max(s.counter + 1, counterBase(now));
    socket.send(sealFrame(frame, s.counter, s.key), UDP_PORT, UDP_HOST);
    s.battery = Math.max(0, s.battery - BATTERY_COST.perPacket);
    s.nextSendAt =
      now + (s.mode === NodeMode.Alert ? SENSOR_INTERVAL_MS.alert : SENSOR_INTERVAL_MS.normal);
    sent++;
  }

  if (now - lastLog >= 5000) {
    const alerts = states.filter((s) => s.mode === NodeMode.Alert).length;
    const minBattery = Math.min(...states.map((s) => s.battery));
    console.log(
      `[sensor-sim] son 5 sn: ${sent} paket | alarm modunda: ${alerts} dugum | en dusuk pil: %${minBattery.toFixed(1)} | ` +
        `ruzgar ${WIND.speed.toFixed(1)} m/s, ${WIND.fromDeg.toFixed(0)}° yonunden`,
    );
    sent = 0;
    lastLog = now;
  }
}, 250);

console.log(
  `[sensor-sim] basladi: ${states.length} dugum -> ${UDP_HOST}:${UDP_PORT}` +
    (fireNode
      ? ` | yangin: dugum ${fireNode.id} (${fireNode.name}), ${fireDelayS} sn sonra, hiz x${fireSpeed}`
      : ""),
);
