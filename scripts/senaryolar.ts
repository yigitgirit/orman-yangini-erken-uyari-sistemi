// Canlı Yangın Senaryoları Yöneticisi
// Çalışmakta olan apps/sensor-sim sürecine UDP (:5006) üzerinden anlık senaryo enjekte eder.
//
// Çalıştırma:
//   pnpm senaryo              (Etkileşimli menüyü açar)
//   pnpm senaryo 1            (1. Manavgat Poyraz Fırtınası)
//   pnpm senaryo manavgat
//   pnpm senaryo piknik       (2. İhmal Kaynaklı Tütme)
//   pnpm senaryo trafo        (3. Ani Parlama / Flashover)
//   pnpm senaryo sahte        (4. Yanıltıcı Duman / Sahte Alarm)
//   pnpm senaryo wokwi        (5. Wokwi Hibrit Yangın)
//   pnpm senaryo reset        (0. Yangını Söndür / Normale Dön)

import dgram from "node:dgram";
import { stdin, stdout } from "node:process";
import readline from "node:readline/promises";

const SIM_CONTROL_PORT = 5006;
const SIM_CONTROL_HOST = "127.0.0.1";

export interface FireScenario {
  id: string;
  name: string;
  shortKey: string;
  category: string;
  nodeId: number;
  nodeName: string;
  scenarioType: "standard" | "smoldering" | "flashover" | "false_alarm";
  speed: number;
  delayS: number;
  wind: { speed: number; fromDeg: number };
  description: string;
  expectedOutcome: string;
}

export const SCENARIOS: FireScenario[] = [
  {
    id: "1",
    shortKey: "marmaris",
    category: "GERÇEK YAŞANMIŞ EGE SENARYOSU (2021-2022)",
    name: "Marmaris Balan Dağı Meltem Fırtınası (Büyük Tepe Yangını)",
    nodeId: 11,
    nodeName: "B4 (Balan Dağı Rüzgâr Boğazı)",
    scenarioType: "standard",
    speed: 6,
    delayS: 1,
    wind: { speed: 8.5, fromDeg: 335 },
    description:
      "Marmaris Balan Dağı yangın modeli. Sert Kuzeybatı Meltemi (335°, 8.5 m/s) ile hızla vadilere ilerler. Piroliz (0-10 sn) -> Tütme/Smoldering (10-25 sn) -> Tepe Alevi (25+ sn) üçlü evresi.",
    expectedOutcome:
      "Düğüm 11'de VOC erken gaz alarmı -> Düğüm 18 & 25'e duman taşınımı -> Komşu doğrulamasıyla Kırmızı Alarm (Alevli Yangın).",
  },
  {
    id: "2",
    shortKey: "piknik",
    category: "İNSAN İHMALİ / SİNSİ ÖRTÜ ALTI YANGINI",
    name: "Vadi Tabanı Piknik / Kamp Ateşi İhmali (Sinsi Tütme)",
    nodeId: 43,
    nodeName: "G3 (Vadi Tabanı Piknik & Kamp Alanı)",
    scenarioType: "smoldering",
    speed: 4,
    delayS: 1,
    wind: { speed: 2.2, fromDeg: 220 },
    description:
      "Közlerin günlerce örtü altında tütmesi modeli. Çok yüksek CO (35+ ppm), yüksek PM2.5, düşük MCE (~0.77). Sıcaklık artışı neredeyse hiç yoktur; kameralar alev görmez.",
    expectedOutcome:
      "Sıcaklık normal kalırken Gaz/MCE füzyonu devreye girer. Sarı Alarm ('İçin İçin Yanma') ile alev çıkmadan saatler önce ultra erken teşhis konur.",
  },
  {
    id: "3",
    shortKey: "trafo",
    category: "ALTYAPI KAZASI / FLASH-OVER",
    name: "Yüksek Gerilim Hattı / Trafo Kıvılcımı (Ani Parlama)",
    nodeId: 25,
    nodeName: "D4 (Merkez Trafo & Enerji Nakil)",
    scenarioType: "flashover",
    speed: 5,
    delayS: 1,
    wind: { speed: 5.5, fromDeg: 270 },
    description:
      "Piroliz ve tütme evresi atlanır. Kuru ot ve çalılar saniyeler içinde parlar. +58°C ani sıcaklık artışı, CO2 > 3500 ppm, yüksek MCE (>0.96).",
    expectedOutcome:
      "15 saniyede doğrudan Kırmızı Alarm ('Alevli Yanma'). Anlık ısı ve CO2 türevi tavan yapar.",
  },
  {
    id: "4",
    shortKey: "sahte",
    category: "SAHTE ALARM TESTİ (FALSE-POSITIVE DAYANIKLILIK)",
    name: "Tarla Anız / İlaçlama Dumanı (Yanıltıcı Dış Etki)",
    nodeId: 1,
    nodeName: "A1 (Kuzeybatı Tarım Sınırı)",
    scenarioType: "false_alarm",
    speed: 4,
    delayS: 1,
    wind: { speed: 3.5, fromDeg: 120 },
    description:
      "Orman dışından rüzgârla tek bir sensöre gelen yabancı gaz/duman bulutu. Isı artışı yoktur. Rüzgâr yönündeki komşu sensörlere duman taşınmaz.",
    expectedOutcome:
      "Sistem tekil sensör anomalisini kaydeder ancak komşu teyidi oluşmadığı için kırmızı alarm ÜRETMEZ ('Tekil İstasyon Sinyali - Dış Çevresel Etki').",
  },
  {
    id: "5",
    shortKey: "wokwi",
    category: "DONANIM ETKİLEŞİMLİ TEST (WOKWI HİBRİT)",
    name: "Wokwi ESP32 Düğümüne Duman Taşıma (#50 Hibrit)",
    nodeId: 35,
    nodeName: "E7 (Zirve Batı Yamacı - Wokwi Komşusu)",
    scenarioType: "standard",
    speed: 5,
    delayS: 1,
    wind: { speed: 6.5, fromDeg: 270 },
    description:
      "Balan Dağı batı yamacında (Düğüm 35) yangın başlar. Batı rüzgârı (270°) dumanı doğudaki Balan Dağı Zirve Wokwi ESP32 donanımına (Düğüm 50) üfler.",
    expectedOutcome:
      "Simüle düğüm 35'te yangın başlar; Wokwi simülatöründe potansiyometreleri çevirerek donanımın yangını nasıl doğruladığını ve komşu teyidini canlı izleyebilirsiniz.",
  },
];

function sendCommand(payload: object): Promise<{ status: string; [key: string]: unknown }> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");
    const buf = Buffer.from(JSON.stringify(payload), "utf8");

    const timer = setTimeout(() => {
      try {
        socket.close();
      } catch {}
      reject(new Error("TIMED_OUT"));
    }, 1500);

    socket.on("message", (msg) => {
      clearTimeout(timer);
      try {
        const res = JSON.parse(msg.toString("utf8"));
        socket.close();
        resolve(res);
      } catch {
        socket.close();
        resolve({ status: "ok" });
      }
    });

    socket.send(buf, SIM_CONTROL_PORT, SIM_CONTROL_HOST, (err) => {
      if (err) {
        clearTimeout(timer);
        try {
          socket.close();
        } catch {}
        reject(err);
      }
    });
  });
}

async function triggerScenario(s: FireScenario) {
  console.log(`\n🚀 [SENARYO AKTİF EDİLİYOR...]`);
  console.log(`📌 İsim       : ${s.name}`);
  console.log(`📍 Düğüm      : #${s.nodeId} (${s.nodeName})`);
  console.log(`💨 Rüzgâr     : ${s.wind.fromDeg}° Azimut, ${s.wind.speed} m/s`);
  console.log(`⚡ Hız        : ${s.speed}x zaman çarpanı`);
  console.log(`📝 Açıklama   : ${s.description}`);
  console.log(`🎯 Beklenen   : ${s.expectedOutcome}\n`);

  try {
    await sendCommand({
      cmd: "SET_SCENARIO",
      nodeId: s.nodeId,
      scenarioType: s.scenarioType,
      speed: s.speed,
      delayS: s.delayS,
      wind: s.wind,
      name: s.name,
    });
    console.log(`✅ BAŞARILI: sensor-sim (:5006) komutu onayladı ve devreye aldı!`);
    console.log(
      `👀 Şimdi Web Arayüzünü (http://localhost:5173) veya Terminal İzleyicisini (pnpm dev:monitor) izleyin.\n`,
    );
  } catch (_err) {
    console.error(`❌ HATA: sensor-sim (:5006) sürecine bağlanılamadı veya yanıt alınamadı!`);
    console.error(`   Olası Nedenler:`);
    console.error(
      `   1. Sensör simülatörü çalışmıyor olabilir -> Terminalde "pnpm dev:sensor" çalıştırın.`,
    );
    console.error(
      `   2. Tüm sistemi tek komutla başlatmak için -> "pnpm dev:all" kullanabilirsiniz.\n`,
    );
  }
}

async function resetScenario() {
  console.log(`\n🌿 [YANGIN SÖNDÜRÜLÜYOR...]`);
  try {
    await sendCommand({ cmd: "RESET" });
    console.log(`✅ BAŞARILI: Yangın söndürüldü, tüm istasyonlar normal stabil duruma döndü.\n`);
  } catch (_err) {
    console.error(`❌ HATA: sensor-sim (:5006) sürecine bağlanılamadı!\n`);
  }
}

async function main() {
  const arg = process.argv[2]?.toLowerCase()?.trim();

  if (arg) {
    if (arg === "0" || arg === "reset" || arg === "sondur" || arg === "clear") {
      await resetScenario();
      return;
    }

    const match = SCENARIOS.find(
      (s) => s.id === arg || s.shortKey === arg || s.name.toLowerCase().includes(arg),
    );
    if (match) {
      await triggerScenario(match);
      return;
    }

    console.log(`⚠️ Bilinmeyen senaryo: "${arg}"`);
    console.log(`Kullanılabilir senaryolar: 1, 2, 3, 4, 5 ya da "reset" (0)\n`);
  }

  // Etkileşimli Menü
  console.log(`\n========================================================================`);
  console.log(`🔥 PyrosEco - Canlı Orman Yangını Senaryo Yöneticisi`);
  console.log(`   (Sunucular ve sensör simülatörü çalışırken anlık yangın enjekte eder)`);
  console.log(`========================================================================`);

  for (const s of SCENARIOS) {
    console.log(`\n[${s.id}] ${s.name}`);
    console.log(`    Kategori : ${s.category}`);
    console.log(
      `    Konum    : Düğüm #${s.nodeId} (${s.nodeName}) | Rüzgâr: ${s.wind.fromDeg}° ${s.wind.speed} m/s`,
    );
    console.log(`    Özet     : ${s.description}`);
  }

  console.log(`\n[0] Yangını Söndür / Normale Dön (Tüm istasyonları sakinleştir)`);
  console.log(`------------------------------------------------------------------------`);

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = (
    await rl.question(`\nLütfen çalıştırmak istediğiniz senaryo numarasını girin (0-5): `)
  ).trim();
  rl.close();

  if (answer === "0") {
    await resetScenario();
  } else {
    const chosen = SCENARIOS.find((s) => s.id === answer);
    if (chosen) {
      await triggerScenario(chosen);
    } else {
      console.log(`❌ Geçersiz seçim! Lütfen 0 ile 5 arasında bir sayı girin.\n`);
    }
  }
}

main().catch((err) => {
  console.error("Beklenmeyen hata:", err);
  process.exit(1);
});
