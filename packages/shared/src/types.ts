// Uygulamalar arası JSON veri şemaları.
import type { SensorNode } from "./nodes.ts";
import type { PyrosFrame } from "./protocol.ts";

/** Gateway -> MQTT (sensors/{id}/telemetry) yükü: ham, anlık ölçüm */
export interface TelemetryMessage extends PyrosFrame {
  receivedAt: string; // ISO 8601, gateway alım zamanı
}

/** Risk seviyeleri (enum yerine `as const`) */
export const RiskLevel = {
  Green: "green", // Normal / yalnızca hava kaynaklı risk
  Yellow: "yellow", // Erken uyarı: piroliz veya için için yanma
  Red: "red", // Aktif (alevli) yangın
} as const;
export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

/** Yangın evresi: rengin "neden"i */
export const FireStage = {
  None: "none", // Sinyal yok
  Risk: "risk", // Gaz normal, hava sıcak/kuru (VPD yüksek)
  Pyrolysis: "pyrolysis", // VOC/H2 yükseliyor, CO henüz yok - alevden önceki ilk evre
  Smoldering: "smoldering", // CO + duman yükseliyor, MCE düşük
  Flaming: "flaming", // CO2 + sıcaklık hızla artıyor, MCE yüksek
} as const;
export type FireStage = (typeof FireStage)[keyof typeof FireStage];

/** Birbirinden bağımsız sinyal aileleri (sensör füzyonu) */
export interface SignalFamilies {
  earlyGas: boolean; // VOC indeksi tabandan saptı (piroliz)
  carbonMonoxide: boolean; // CO tabandan saptı (için için yanma)
  smoke: boolean; // PM2.5 tabandan saptı
  combustion: boolean; // CO2 veya sıcaklık hızla artıyor (alevli yanma)
}

/** Backend'in her düğüm için hesapladığı analiz sonucu */
export interface NodeRisk {
  nodeId: number;
  score: number; // 0-100
  level: RiskLevel;
  stage: FireStage;
  signals: SignalFamilies;
  signalCount: number; // 0-4
  confirmed: boolean; // >= 2 sinyal ailesi + en az bir komşu düğüm tetiklendi
  confirmedBy: number[]; // tetiklenmiş komşu düğüm id'leri
  mce: number | null; // ΔCO2 / (ΔCO2 + ΔCO); ~0.8 için için, ~0.99 alevli
  vpd: number; // kPa, buhar basıncı açığı (kuruluk)
  delta: { temperature: number; co: number; co2: number; vocIndex: number; pm25: number | null };
  rate: { temperature: number; co: number; co2: number; vocIndex: number; pm25: number | null }; // /dk, regresyon eğimi
  accel: { temperature: number; co2: number }; // /dk², eğimin değişimi (evre geçişi)
  updatedAt: string;
}

/** Erken tespitin etkisi (CO2 modeli) */
export interface ImpactSummary {
  detectedFires: number;
  savedHectares: number;
  preventedCo2Tons: number;
}

/**
 * Rüzgâr vektörü. Yön kuralları (karışmaması için ikisi de verilir):
 * - directionFrom: meteorolojik yön, rüzgârın GELDİĞİ yön (225 = güneybatıdan)
 * - directionTo:   akış yönü, okun GÖSTERDİĞİ yön (= directionFrom + 180)
 * - u / v:         akış bileşenleri, m/s (u: doğuya +, v: kuzeye +) - 3B ok için doğrudan kullanılabilir
 */
export interface WindVector {
  speed: number; // m/s
  directionFrom: number; // derece, kuzey = 0, saat yönünde
  directionTo: number; // derece
  u: number;
  v: number;
}

/** Bir düğümdeki rüzgâr: istasyonsa ölçüm, değilse istasyonlardan tahmin (IDW) */
export interface NodeWind extends WindVector {
  nodeId: number;
  measured: boolean;
}

/** Backend'in ~2 sn'de bir yayınladığı rüzgâr alanı */
export interface WindField {
  updatedAt: string;
  stationCount: number; // Son 60 sn'de ölçüm gönderen istasyon sayısı
  regional: WindVector; // Tüm istasyonların vektör ortalaması
  nodes: NodeWind[]; // Her düğüm için (50 düğüm)
}

/** Backend -> Web WebSocket mesajları (discriminated union) */
export type WsMessage =
  | { type: "nodes"; data: readonly SensorNode[] }
  | { type: "telemetry"; data: TelemetryMessage }
  | { type: "risk"; data: NodeRisk }
  | { type: "impact"; data: ImpactSummary }
  | { type: "wind"; data: WindField };
